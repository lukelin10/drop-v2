import { DatabaseStorage } from '../../server/DatabaseStorage';
import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock the database to control its behavior in tests
jest.mock('../../server/db', () => {
  const { testDb } = require('../setup');
  return {
    db: testDb
  };
});

describe('DatabaseStorage - Analysis Operations', () => {
  let storage: DatabaseStorage;
  const testUserId = 'test-user-id';
  const testUserId2 = 'test-user-id-2';
  let testQuestionId: number;
  
  beforeAll(async () => {
    // Create test question
    const result = await testDb.insert(schema.questionTable).values({
      text: 'Test question for analysis tests?',
      isActive: true,
      category: 'test',
      createdAt: new Date()
    }).returning();
    
    testQuestionId = result[0].id;
  });
  
  beforeEach(async () => {
    // Clean up database before each test
    await testDb.delete(schema.analysisDrops);
    await testDb.delete(schema.analyses);
    await testDb.delete(schema.messages);
    await testDb.delete(schema.drops);
    await testDb.delete(schema.users);
    
    // Create test users
    await testDb.insert(schema.users).values([
      {
        id: testUserId,
        username: 'testuser1',
        email: 'test1@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: testUserId2,
        username: 'testuser2',
        email: 'test2@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
    
    // Create a fresh instance of DatabaseStorage for each test
    storage = new DatabaseStorage();
  });

  describe('Analysis eligibility', () => {
    test('getAnalysisEligibility returns not eligible for new user', async () => {
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility returns not eligible with fewer than 7 drops', async () => {
      // Create 5 drops
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }
      
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility returns eligible with 7 or more drops', async () => {
      // Create 8 drops
      for (let i = 0; i < 8; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }
      
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      
      expect(eligibility).toEqual({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility only counts drops after last analysis', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2024-01-10');
      
      // Set user's last analysis date
      await testDb.update(schema.users)
        .set({ lastAnalysisDate: pastDate })
        .where(eq(schema.users.id, testUserId));
      
      // Create 3 drops before last analysis
      for (let i = 0; i < 3; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Old drop ${i + 1}`,
          createdAt: new Date('2023-12-15') // Before last analysis
        });
      }
      
      // Create 5 drops after last analysis
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `New drop ${i + 1}`,
          createdAt: futureDate // After last analysis
        });
      }
      
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 5, // Only counts drops after last analysis
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility returns false for non-existent user', async () => {
      const eligibility = await storage.getAnalysisEligibility('non-existent-user');
      
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });
  });

  describe('Unanalyzed drops retrieval', () => {
    test('getUnanalyzedDrops returns all drops for new user', async () => {
      // Create 5 drops
      const dropIds = [];
      for (let i = 0; i < 5; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        }).returning();
        dropIds.push(drop.id);
      }
      
      const unanalyzedDrops = await storage.getUnanalyzedDrops(testUserId);
      
      expect(unanalyzedDrops).toHaveLength(5);
      expect(unanalyzedDrops.map(d => d.id)).toEqual(expect.arrayContaining(dropIds));
      expect(unanalyzedDrops[0]).toHaveProperty('questionText');
    });

    test('getUnanalyzedDrops only returns drops after last analysis', async () => {
      const pastDate = new Date('2024-01-01');
      const futureDate = new Date('2024-01-10');
      
      // Set user's last analysis date
      await testDb.update(schema.users)
        .set({ lastAnalysisDate: pastDate })
        .where(eq(schema.users.id, testUserId));
      
      // Create drops before last analysis
      await testDb.insert(schema.drops).values({
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Old drop',
        createdAt: new Date('2023-12-15')
      });
      
      // Create drops after last analysis
      const [newDrop] = await testDb.insert(schema.drops).values({
        userId: testUserId,
        questionId: testQuestionId,
        text: 'New drop',
        createdAt: futureDate
      }).returning();
      
      const unanalyzedDrops = await storage.getUnanalyzedDrops(testUserId);
      
      expect(unanalyzedDrops).toHaveLength(1);
      expect(unanalyzedDrops[0].id).toBe(newDrop.id);
      expect(unanalyzedDrops[0].text).toBe('New drop');
    });

    test('getUnanalyzedDrops returns empty array for non-existent user', async () => {
      const unanalyzedDrops = await storage.getUnanalyzedDrops('non-existent-user');
      
      expect(unanalyzedDrops).toEqual([]);
    });
  });

  describe('Analysis creation', () => {
    test('createAnalysis creates analysis and tracks included drops', async () => {
      // Create drops
      const dropIds = [];
      for (let i = 0; i < 3; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        }).returning();
        dropIds.push(drop.id);
      }
      
      const analysisData = {
        userId: testUserId,
        content: 'Test analysis content with insights',
        summary: 'Test summary',
        bulletPoints: '• Point 1\n• Point 2\n• Point 3'
      };
      
      const analysis = await storage.createAnalysis(analysisData, dropIds);
      
      expect(analysis).toMatchObject(analysisData);
      expect(analysis).toHaveProperty('id');
      expect(analysis).toHaveProperty('createdAt');
      expect(analysis.isFavorited).toBe(false);
      
      // Verify analysis-drop relationships were created
      const analysisDrops = await testDb
        .select()
        .from(schema.analysisDrops)
        .where(eq(schema.analysisDrops.analysisId, analysis.id));
      
      expect(analysisDrops).toHaveLength(3);
      expect(analysisDrops.map(ad => ad.dropId)).toEqual(expect.arrayContaining(dropIds));
      
      // Verify user's last analysis date was updated
      const [user] = await testDb
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, testUserId));
      
      expect(user.lastAnalysisDate).toBeTruthy();
    });

    test('createAnalysis works with empty drop list', async () => {
      const analysisData = {
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Point 1'
      };
      
      const analysis = await storage.createAnalysis(analysisData, []);
      
      expect(analysis).toMatchObject(analysisData);
      
      // Verify no analysis-drop relationships were created
      const analysisDrops = await testDb
        .select()
        .from(schema.analysisDrops)
        .where(eq(schema.analysisDrops.analysisId, analysis.id));
      
      expect(analysisDrops).toHaveLength(0);
    });
  });

  describe('Analysis retrieval', () => {
    let testAnalysisId: number;
    
    beforeEach(async () => {
      // Create a test analysis
      const [analysis] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Test point 1\n• Test point 2',
        createdAt: new Date(),
        isFavorited: false
      }).returning();
      
      testAnalysisId = analysis.id;
    });

    test('getAnalysis returns analysis by id', async () => {
      const analysis = await storage.getAnalysis(testAnalysisId);
      
      expect(analysis).toBeTruthy();
      expect(analysis?.id).toBe(testAnalysisId);
      expect(analysis?.userId).toBe(testUserId);
      expect(analysis?.content).toBe('Test analysis content');
    });

    test('getAnalysis returns undefined for non-existent analysis', async () => {
      const analysis = await storage.getAnalysis(99999);
      
      expect(analysis).toBeUndefined();
    });

    test('getUserAnalyses returns user analyses in chronological order', async () => {
      // Create additional analyses with different timestamps
      const analyses = [];
      for (let i = 0; i < 3; i++) {
        const [analysis] = await testDb.insert(schema.analyses).values({
          userId: testUserId,
          content: `Analysis ${i + 1}`,
          summary: `Summary ${i + 1}`,
          bulletPoints: `• Point ${i + 1}`,
          createdAt: new Date(Date.now() + (i * 60000)), // 1 minute apart
          isFavorited: i === 1 // Second one is favorited
        }).returning();
        analyses.push(analysis);
      }
      
      const userAnalyses = await storage.getUserAnalyses(testUserId);
      
      expect(userAnalyses).toHaveLength(4); // 1 from beforeEach + 3 new ones
      
      // Should be in reverse chronological order (newest first)
      for (let i = 0; i < userAnalyses.length - 1; i++) {
        expect(userAnalyses[i].createdAt >= userAnalyses[i + 1].createdAt).toBe(true);
      }
    });

    test('getUserAnalyses respects pagination', async () => {
      // Create 5 additional analyses
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.analyses).values({
          userId: testUserId,
          content: `Analysis ${i + 1}`,
          summary: `Summary ${i + 1}`,
          bulletPoints: `• Point ${i + 1}`,
          createdAt: new Date(Date.now() + (i * 60000)),
          isFavorited: false
        });
      }
      
      // Test pagination
      const page1 = await storage.getUserAnalyses(testUserId, 2, 0);
      const page2 = await storage.getUserAnalyses(testUserId, 2, 2);
      
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    test('getUserAnalyses only returns analyses for specified user', async () => {
      // Create analysis for different user
      await testDb.insert(schema.analyses).values({
        userId: testUserId2,
        content: 'Other user analysis',
        summary: 'Other summary',
        bulletPoints: '• Other point',
        createdAt: new Date(),
        isFavorited: false
      });
      
      const userAnalyses = await storage.getUserAnalyses(testUserId);
      
      expect(userAnalyses).toHaveLength(1); // Only the one from beforeEach
      expect(userAnalyses[0].userId).toBe(testUserId);
    });
  });

  describe('Analysis favorite operations', () => {
    let testAnalysisId: number;
    
    beforeEach(async () => {
      const [analysis] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Test point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();
      
      testAnalysisId = analysis.id;
    });

    test('updateAnalysisFavorite sets favorite to true', async () => {
      const updatedAnalysis = await storage.updateAnalysisFavorite(testAnalysisId, true);
      
      expect(updatedAnalysis).toBeTruthy();
      expect(updatedAnalysis?.isFavorited).toBe(true);
      
      // Verify in database
      const analysis = await storage.getAnalysis(testAnalysisId);
      expect(analysis?.isFavorited).toBe(true);
    });

    test('updateAnalysisFavorite sets favorite to false', async () => {
      // First set to true
      await storage.updateAnalysisFavorite(testAnalysisId, true);
      
      // Then set to false
      const updatedAnalysis = await storage.updateAnalysisFavorite(testAnalysisId, false);
      
      expect(updatedAnalysis?.isFavorited).toBe(false);
    });

    test('updateAnalysisFavorite returns undefined for non-existent analysis', async () => {
      const result = await storage.updateAnalysisFavorite(99999, true);
      
      expect(result).toBeUndefined();
    });
  });

  describe('Analysis drops retrieval', () => {
    test('getAnalysisDrops returns drops included in analysis', async () => {
      // Create drops
      const dropIds = [];
      for (let i = 0; i < 3; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        }).returning();
        dropIds.push(drop.id);
      }
      
      // Create analysis
      const [analysis] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis',
        summary: 'Test summary',
        bulletPoints: '• Test point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();
      
      // Create analysis-drop relationships
      for (const dropId of dropIds) {
        await testDb.insert(schema.analysisDrops).values({
          analysisId: analysis.id,
          dropId: dropId,
          createdAt: new Date()
        });
      }
      
      const analysisDrops = await storage.getAnalysisDrops(analysis.id);
      
      expect(analysisDrops).toHaveLength(3);
      expect(analysisDrops.map(d => d.id)).toEqual(expect.arrayContaining(dropIds));
      expect(analysisDrops[0]).toHaveProperty('questionText');
    });

    test('getAnalysisDrops returns empty array for non-existent analysis', async () => {
      const analysisDrops = await storage.getAnalysisDrops(99999);
      
      expect(analysisDrops).toEqual([]);
    });

    test('getAnalysisDrops returns drops in chronological order', async () => {
      // Create drops with different timestamps
      const dropIds = [];
      for (let i = 0; i < 3; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Drop ${i + 1}`,
          createdAt: new Date(Date.now() + (i * 60000)) // 1 minute apart
        }).returning();
        dropIds.push(drop.id);
      }
      
      // Create analysis
      const [analysis] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis',
        summary: 'Test summary',
        bulletPoints: '• Test point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();
      
      // Create analysis-drop relationships (in reverse order)
      for (let i = dropIds.length - 1; i >= 0; i--) {
        await testDb.insert(schema.analysisDrops).values({
          analysisId: analysis.id,
          dropId: dropIds[i],
          createdAt: new Date()
        });
      }
      
      const analysisDrops = await storage.getAnalysisDrops(analysis.id);
      
      // Should be ordered by drop creation time (chronological)
      expect(analysisDrops[0].text).toBe('Drop 1');
      expect(analysisDrops[1].text).toBe('Drop 2');
      expect(analysisDrops[2].text).toBe('Drop 3');
    });
  });

  describe('Analysis progress tracking edge cases', () => {
    test('getAnalysisEligibility handles exactly 7 drops correctly', async () => {
      // Create exactly 7 drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }
      
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      
      expect(eligibility).toEqual({
        isEligible: true,
        unanalyzedCount: 7,
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility resets count after analysis creation', async () => {
      // Create 8 drops
      const dropIds = [];
      for (let i = 0; i < 8; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        }).returning();
        dropIds.push(drop.id);
      }
      
      // Verify user is eligible
      let eligibility = await storage.getAnalysisEligibility(testUserId);
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(8);
      
      // Create an analysis
      const analysisData = {
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Point 1'
      };
      
      await storage.createAnalysis(analysisData, dropIds);
      
      // Check eligibility again - should reset to 0
      eligibility = await storage.getAnalysisEligibility(testUserId);
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });

    test('getAnalysisEligibility handles boundary conditions correctly', async () => {
      // Test edge case: exactly at the eligibility threshold
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Boundary test drop ${i + 1}`,
          createdAt: new Date()
        });
      }
      
      let eligibility = await storage.getAnalysisEligibility(testUserId);
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(7);
      expect(eligibility.requiredCount).toBe(7);
      
      // Test that one less than required is not eligible
      await testDb.delete(schema.drops).where(eq(schema.drops.userId, testUserId));
      
      for (let i = 0; i < 6; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Six drops test ${i + 1}`,
          createdAt: new Date()
        });
      }
      
      eligibility = await storage.getAnalysisEligibility(testUserId);
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(6);
    });

    test('getUnanalyzedDrops returns drops in correct chronological order', async () => {
      // Create drops with specific timestamps
      const timestamps = [
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        new Date('2024-01-01T13:00:00Z'),
        new Date('2024-01-01T14:00:00Z')
      ];
      
      const expectedTexts = [];
      for (let i = 0; i < timestamps.length; i++) {
        const text = `Drop ${i + 1} at ${timestamps[i].toISOString()}`;
        expectedTexts.push(text);
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: text,
          createdAt: timestamps[i]
        });
      }
      
      const unanalyzedDrops = await storage.getUnanalyzedDrops(testUserId);
      
      expect(unanalyzedDrops).toHaveLength(5);
      // Should be in chronological order (oldest first)
      for (let i = 0; i < unanalyzedDrops.length; i++) {
        expect(unanalyzedDrops[i].text).toBe(expectedTexts[i]);
      }
    });

    test('getAnalysisEligibility handles database errors gracefully', async () => {
      // Test with a malformed user ID that might cause database issues
      const eligibility = await storage.getAnalysisEligibility('');
      
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });

    test('analysis creation updates lastAnalysisDate precisely', async () => {
      const beforeAnalysis = new Date();
      
      // Create 7 drops
      const dropIds = [];
      for (let i = 0; i < 7; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        }).returning();
        dropIds.push(drop.id);
      }
      
      // Create analysis
      await storage.createAnalysis({
        userId: testUserId,
        content: 'Test analysis',
        summary: 'Test summary',
        bulletPoints: '• Test point'
      }, dropIds);
      
      const afterAnalysis = new Date();
      
      // Check that lastAnalysisDate was updated
      const [user] = await testDb
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, testUserId));
      
      expect(user.lastAnalysisDate).toBeTruthy();
      expect(user.lastAnalysisDate!.getTime()).toBeGreaterThanOrEqual(beforeAnalysis.getTime());
      expect(user.lastAnalysisDate!.getTime()).toBeLessThanOrEqual(afterAnalysis.getTime());
    });
  });

  describe('Progress calculation utility functions', () => {
    // These tests simulate the logic from useAnalysisEligibility hook
    
    function calculateProgressPercentage(unanalyzedCount: number, requiredCount: number): number {
      return Math.min((unanalyzedCount / requiredCount) * 100, 100);
    }

    function getProgressText(isEligible: boolean, unanalyzedCount: number, requiredCount: number): string {
      if (isEligible) {
        return "Ready for analysis!";
      }
      return `${unanalyzedCount} out of ${requiredCount}`;
    }

    function isCloseToEligible(unanalyzedCount: number, requiredCount: number): boolean {
      const remaining = requiredCount - unanalyzedCount;
      return remaining <= 2 && remaining > 0;
    }

    function getEncouragingMessage(isEligible: boolean, unanalyzedCount: number, requiredCount: number): string {
      const remaining = Math.max(0, requiredCount - unanalyzedCount);
      
      if (isEligible) {
        return "You're ready for insights!";
      } else if (remaining === 1) {
        return "Almost there! Just 1 more entry needed.";
      } else if (remaining === 2) {
        return "You're so close! 2 more entries to go.";
      } else if (isCloseToEligible(unanalyzedCount, requiredCount)) {
        return `Keep going! ${remaining} more entries for your analysis.`;
      } else {
        return "Drop deeper with an analysis after 7 entries";
      }
    }

    test('calculateProgressPercentage returns correct percentages', () => {
      expect(calculateProgressPercentage(0, 7)).toBe(0);
      expect(calculateProgressPercentage(1, 7)).toBeCloseTo(14.29, 2);
      expect(calculateProgressPercentage(3, 7)).toBeCloseTo(42.86, 2);
      expect(calculateProgressPercentage(5, 7)).toBeCloseTo(71.43, 2);
      expect(calculateProgressPercentage(7, 7)).toBe(100);
      expect(calculateProgressPercentage(10, 7)).toBe(100); // Capped at 100%
    });

    test('getProgressText returns correct text for different states', () => {
      expect(getProgressText(false, 0, 7)).toBe('0 out of 7');
      expect(getProgressText(false, 4, 7)).toBe('4 out of 7');
      expect(getProgressText(false, 6, 7)).toBe('6 out of 7');
      expect(getProgressText(true, 7, 7)).toBe('Ready for analysis!');
      expect(getProgressText(true, 10, 7)).toBe('Ready for analysis!');
    });

    test('isCloseToEligible identifies close states correctly', () => {
      expect(isCloseToEligible(0, 7)).toBe(false); // 7 remaining
      expect(isCloseToEligible(4, 7)).toBe(false); // 3 remaining
      expect(isCloseToEligible(5, 7)).toBe(true);  // 2 remaining
      expect(isCloseToEligible(6, 7)).toBe(true);  // 1 remaining
      expect(isCloseToEligible(7, 7)).toBe(false); // 0 remaining (eligible)
      expect(isCloseToEligible(10, 7)).toBe(false); // Already eligible
    });

    test('getEncouragingMessage returns appropriate messages', () => {
      expect(getEncouragingMessage(false, 0, 7)).toBe('Drop deeper with an analysis after 7 entries');
      expect(getEncouragingMessage(false, 3, 7)).toBe('Drop deeper with an analysis after 7 entries');
      expect(getEncouragingMessage(false, 5, 7)).toBe("You're so close! 2 more entries to go.");
      expect(getEncouragingMessage(false, 6, 7)).toBe('Almost there! Just 1 more entry needed.');
      expect(getEncouragingMessage(true, 7, 7)).toBe("You're ready for insights!");
      expect(getEncouragingMessage(true, 10, 7)).toBe("You're ready for insights!");
    });
  });
}); 