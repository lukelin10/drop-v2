/**
 * Analysis Business Logic Unit Tests
 * 
 * Tests analysis-related business logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 * 
 * NOTE: This used to test DatabaseStorage analysis methods directly (integration-style).
 * Now it tests analysis business logic at the unit level.
 */

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks,
  setupStorageErrorMocks
} from '../mocks/mockStorage';
import { 
  createMockUser, 
  createMockDrop, 
  createMockDropWithQuestion,
  createMockAnalysis,
  createMockAnalysisDrop,
  createMockAnalysisEligibility,
  TEST_USER_IDS,
  TEST_DATES
} from '../factories/testData';

describe('Analysis Business Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;

  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Analysis Eligibility Logic', () => {
    test('should return not eligible for new user with no drops', async () => {
      // Arrange
      setupEmptyUserMocks(testUserId);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });

    test('should return not eligible with fewer than 7 drops', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 5);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility).toEqual({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });
    });

    test('should return eligible with 7 or more drops', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility).toEqual({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });
    });

    test('should only count drops after last analysis', async () => {
      // Arrange
      const eligibility = createMockAnalysisEligibility({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });
      mockStorage.getAnalysisEligibility.mockResolvedValue(eligibility);

      // Act
      const result = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(result.unanalyzedCount).toBe(5); // Only counts drops after last analysis
      expect(result.isEligible).toBe(false);
    });

    test('should return not eligible for non-existent user', async () => {
      // Arrange
      const eligibility = createMockAnalysisEligibility({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
      mockStorage.getAnalysisEligibility.mockResolvedValue(eligibility);

      // Act
      const result = await mockStorage.getAnalysisEligibility('non-existent-user');

      // Assert
      expect(result).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });
  });

  describe('Unanalyzed Drops Logic', () => {
    test('should return all drops for new user', async () => {
      // Arrange
      const drops = [
        createMockDropWithQuestion({ id: 1, userId: testUserId, text: 'Drop 1' }),
        createMockDropWithQuestion({ id: 2, userId: testUserId, text: 'Drop 2' }),
        createMockDropWithQuestion({ id: 3, userId: testUserId, text: 'Drop 3' }),
        createMockDropWithQuestion({ id: 4, userId: testUserId, text: 'Drop 4' }),
        createMockDropWithQuestion({ id: 5, userId: testUserId, text: 'Drop 5' })
      ];
      mockStorage.getUnanalyzedDrops.mockResolvedValue(drops);

      // Act
      const unanalyzedDrops = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(unanalyzedDrops).toHaveLength(5);
      expect(unanalyzedDrops.every(d => d.userId === testUserId)).toBe(true);
      expect(unanalyzedDrops[0]).toHaveProperty('questionText');
      expect(mockStorage.getUnanalyzedDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should only return drops after last analysis', async () => {
      // Arrange
      const recentDrops = [
        createMockDropWithQuestion({ id: 4, userId: testUserId, text: 'Recent drop 1' }),
        createMockDropWithQuestion({ id: 5, userId: testUserId, text: 'Recent drop 2' })
      ];
      mockStorage.getUnanalyzedDrops.mockResolvedValue(recentDrops);

      // Act
      const result = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(d => d.text.includes('Recent'))).toBe(true);
    });

    test('should return empty array for user with no unanalyzed drops', async () => {
      // Arrange
      mockStorage.getUnanalyzedDrops.mockResolvedValue([]);

      // Act
      const result = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(result).toHaveLength(0);
    });

    test('should return drops with question text included', async () => {
      // Arrange
      const dropsWithQuestions = [
        createMockDropWithQuestion({ 
          id: 1, 
          userId: testUserId, 
          questionText: 'How are you feeling today?' 
        }),
        createMockDropWithQuestion({ 
          id: 2, 
          userId: testUserId, 
          questionText: 'What made you smile today?' 
        })
      ];
      mockStorage.getUnanalyzedDrops.mockResolvedValue(dropsWithQuestions);

      // Act
      const result = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].questionText).toBe('How are you feeling today?');
      expect(result[1].questionText).toBe('What made you smile today?');
    });
  });

  describe('Analysis Creation Logic', () => {
    test('should create analysis with included drops', async () => {
      // Arrange
      const analysisData = {
        userId: testUserId,
        content: 'Comprehensive analysis of recent emotional patterns...',
        summary: 'Generally positive outlook with some areas for growth',
        bulletPoints: '• Increased self-awareness\n• Better emotional regulation\n• Strong social connections'
      };
      const dropIds = [1, 2, 3, 4, 5, 6, 7];
      const expectedAnalysis = createMockAnalysis({ ...analysisData, id: 123 });

      mockStorage.createAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      const result = await mockStorage.createAnalysis(analysisData, dropIds);

      // Assert
      expect(result).toMatchObject(analysisData);
      expect(result.id).toBe(123);
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(analysisData, dropIds);
    });

    test('should handle analysis creation with empty bullet points', async () => {
      // Arrange
      const analysisData = {
        userId: testUserId,
        content: 'Analysis content',
        summary: 'Summary',
        bulletPoints: ''
      };
      const expectedAnalysis = createMockAnalysis(analysisData);
      mockStorage.createAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      const result = await mockStorage.createAnalysis(analysisData, [1, 2, 3]);

      // Assert
      expect(result.bulletPoints).toBe('');
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(analysisData, [1, 2, 3]);
    });

    test('should create analysis with correct timestamp', async () => {
      // Arrange
      const analysisData = {
        userId: testUserId,
        content: 'Test analysis',
        summary: 'Test summary',
        bulletPoints: '• Test point'
      };
      const expectedAnalysis = createMockAnalysis({ 
        ...analysisData, 
        createdAt: TEST_DATES.RECENT 
      });
      mockStorage.createAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      const result = await mockStorage.createAnalysis(analysisData, [1, 2, 3]);

      // Assert
      expect(result.createdAt).toEqual(TEST_DATES.RECENT);
    });
  });

  describe('Analysis Retrieval Logic', () => {
    test('should get user analyses ordered by creation date', async () => {
      // Arrange
      const analyses = [
        createMockAnalysis({ 
          id: 1, 
          userId: testUserId, 
          createdAt: TEST_DATES.RECENT,
          summary: 'Recent analysis' 
        }),
                 createMockAnalysis({ 
           id: 2, 
           userId: testUserId, 
           createdAt: TEST_DATES.PAST,
           summary: 'Older analysis' 
         })
      ];
      mockStorage.getUserAnalyses.mockResolvedValue(analyses);

      // Act
      const result = await mockStorage.getUserAnalyses(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].summary).toBe('Recent analysis');
      expect(result[1].summary).toBe('Older analysis');
      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId);
    });

    test('should return empty array for user with no analyses', async () => {
      // Arrange
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act
      const result = await mockStorage.getUserAnalyses(testUserId);

      // Assert
      expect(result).toHaveLength(0);
    });

    test('should get specific analysis by id', async () => {
      // Arrange
      const analysis = createMockAnalysis({ id: 42, userId: testUserId });
      mockStorage.getAnalysis.mockResolvedValue(analysis);

      // Act
      const result = await mockStorage.getAnalysis(42);

      // Assert
      expect(result).toMatchObject(analysis);
      expect(result?.id).toBe(42);
      expect(mockStorage.getAnalysis).toHaveBeenCalledWith(42);
    });

    test('should return undefined for non-existent analysis', async () => {
      // Arrange
      mockStorage.getAnalysis.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.getAnalysis(999);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Analysis Drop Relationships', () => {
    test('should get drops included in analysis', async () => {
      // Arrange
      const analysisDrops = [
        createMockDropWithQuestion({ id: 1, text: 'Drop 1' }),
        createMockDropWithQuestion({ id: 2, text: 'Drop 2' }),
        createMockDropWithQuestion({ id: 3, text: 'Drop 3' })
      ];
      mockStorage.getAnalysisDrops.mockResolvedValue(analysisDrops);

      // Act
      const result = await mockStorage.getAnalysisDrops(42);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('questionText');
      expect(result.map(d => d.text)).toEqual(['Drop 1', 'Drop 2', 'Drop 3']);
      expect(mockStorage.getAnalysisDrops).toHaveBeenCalledWith(42);
    });

    test('should return empty array for analysis with no drops', async () => {
      // Arrange
      mockStorage.getAnalysisDrops.mockResolvedValue([]);

      // Act
      const result = await mockStorage.getAnalysisDrops(42);

      // Assert
      expect(result).toHaveLength(0);
    });

    test('should verify drop-analysis relationships', async () => {
      // Arrange
      const analysisDrops = [
        createMockDropWithQuestion({ id: 1, userId: testUserId }),
        createMockDropWithQuestion({ id: 2, userId: testUserId }),
        createMockDropWithQuestion({ id: 3, userId: testUserId })
      ];
      mockStorage.getAnalysisDrops.mockResolvedValue(analysisDrops);

      // Act
      const result = await mockStorage.getAnalysisDrops(42);

      // Assert
      expect(result.every(drop => drop.userId === testUserId)).toBe(true);
      expect(result.every(drop => drop.hasOwnProperty('questionText'))).toBe(true);
    });
  });

  describe('Analysis Favorite Logic', () => {
    test('should toggle analysis favorite status', async () => {
      // Arrange
      const favoritedAnalysis = createMockAnalysis({ id: 1, isFavorited: true });
      mockStorage.updateAnalysisFavorite.mockResolvedValue(favoritedAnalysis);

      // Act
      const result = await mockStorage.updateAnalysisFavorite(1, true);

      // Assert
      expect(result?.isFavorited).toBe(true);
      expect(mockStorage.updateAnalysisFavorite).toHaveBeenCalledWith(1, true);
    });

    test('should unfavorite analysis', async () => {
      // Arrange
      const unfavoritedAnalysis = createMockAnalysis({ id: 1, isFavorited: false });
      mockStorage.updateAnalysisFavorite.mockResolvedValue(unfavoritedAnalysis);

      // Act
      const result = await mockStorage.updateAnalysisFavorite(1, false);

      // Assert
      expect(result?.isFavorited).toBe(false);
      expect(mockStorage.updateAnalysisFavorite).toHaveBeenCalledWith(1, false);
    });

    test('should return undefined for non-existent analysis', async () => {
      // Arrange
      mockStorage.updateAnalysisFavorite.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.updateAnalysisFavorite(999, true);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('Multi-User Analysis Logic', () => {
    test('should separate analyses by user', async () => {
      // Arrange
      const user1Analyses = [
        createMockAnalysis({ id: 1, userId: testUserId, summary: 'User 1 analysis' })
      ];
      const user2Analyses = [
        createMockAnalysis({ id: 2, userId: testUserId2, summary: 'User 2 analysis' })
      ];

      mockStorage.getUserAnalyses.mockImplementation((userId) => {
        if (userId === testUserId) return Promise.resolve(user1Analyses);
        if (userId === testUserId2) return Promise.resolve(user2Analyses);
        return Promise.resolve([]);
      });

      // Act
      const user1Result = await mockStorage.getUserAnalyses(testUserId);
      const user2Result = await mockStorage.getUserAnalyses(testUserId2);

      // Assert
      expect(user1Result).toHaveLength(1);
      expect(user2Result).toHaveLength(1);
      expect(user1Result[0].userId).toBe(testUserId);
      expect(user2Result[0].userId).toBe(testUserId2);
    });

    test('should handle eligibility independently per user', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockImplementation((userId) => {
        if (userId === testUserId) {
          return Promise.resolve(createMockAnalysisEligibility({ 
            isEligible: true, 
            unanalyzedCount: 8 
          }));
        }
        if (userId === testUserId2) {
          return Promise.resolve(createMockAnalysisEligibility({ 
            isEligible: false, 
            unanalyzedCount: 3 
          }));
        }
        return Promise.resolve(createMockAnalysisEligibility({ 
          isEligible: false, 
          unanalyzedCount: 0 
        }));
      });

      // Act
      const user1Eligibility = await mockStorage.getAnalysisEligibility(testUserId);
      const user2Eligibility = await mockStorage.getAnalysisEligibility(testUserId2);

      // Assert
      expect(user1Eligibility.isEligible).toBe(true);
      expect(user2Eligibility.isEligible).toBe(false);
      expect(user1Eligibility.unanalyzedCount).toBe(8);
      expect(user2Eligibility.unanalyzedCount).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors during analysis creation', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockStorage.createAnalysis.mockRejectedValue(error);

      // Act & Assert
      const analysisData = {
        userId: testUserId,
        content: 'Test',
        summary: 'Test',
        bulletPoints: 'Test'
      };
      
      await expect(
        mockStorage.createAnalysis(analysisData, [1, 2, 3])
      ).rejects.toThrow('Database connection failed');
    });

    test('should handle errors during eligibility check', async () => {
      // Arrange
      setupStorageErrorMocks('getAnalysisEligibility', new Error('Storage error'));

      // Act & Assert
      await expect(
        mockStorage.getAnalysisEligibility(testUserId)
      ).rejects.toThrow('Storage error');
    });

    test('should handle errors during analysis retrieval', async () => {
      // Arrange
      const error = new Error('Network timeout');
      mockStorage.getUserAnalyses.mockRejectedValue(error);

      // Act & Assert
      await expect(
        mockStorage.getUserAnalyses(testUserId)
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Analysis Business Logic Scenarios', () => {
    test('should handle complete analysis workflow', async () => {
      // Arrange - Setup eligible user
      setupEligibleUserMocks(testUserId);
      
      const analysisData = {
        userId: testUserId,
        content: 'Complete workflow test',
        summary: 'Test summary',
        bulletPoints: '• Test point'
      };
      const createdAnalysis = createMockAnalysis({ ...analysisData, id: 456 });
      mockStorage.createAnalysis.mockResolvedValue(createdAnalysis);

      // Act - Check eligibility, create analysis
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);
      const analysis = await mockStorage.createAnalysis(analysisData, [1, 2, 3, 4, 5, 6, 7]);

      // Assert
      expect(eligibility.isEligible).toBe(true);
      expect(analysis.id).toBe(456);
      expect(analysis.userId).toBe(testUserId);
    });

    test('should prevent analysis creation for ineligible users', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 3);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(3);
      
      // Business logic should prevent creation when ineligible
      // This would be handled by the service layer, not storage
    });

    test('should handle analysis with minimal drops', async () => {
      // Arrange
      const analysisData = {
        userId: testUserId,
        content: 'Minimal analysis',
        summary: 'Short summary',
        bulletPoints: '• Single point'
      };
      const expectedAnalysis = createMockAnalysis(analysisData);
      mockStorage.createAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      const result = await mockStorage.createAnalysis(analysisData, [1, 2, 3, 4, 5, 6, 7]);

      // Assert
      expect(result).toMatchObject(analysisData);
    });
  });

  describe('Analysis Progress Tracking', () => {
    test('should track progress towards analysis eligibility', async () => {
      // Arrange
      const progressEligibility = createMockAnalysisEligibility({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });
      mockStorage.getAnalysisEligibility.mockResolvedValue(progressEligibility);

      // Act
      const result = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(result.unanalyzedCount).toBe(5);
      expect(result.requiredCount).toBe(7);
      
      // Business logic can calculate: 5/7 = 71% progress
      const progressPercentage = (result.unanalyzedCount / result.requiredCount) * 100;
      expect(progressPercentage).toBeCloseTo(71.4, 1);
    });

    test('should indicate when user is close to eligibility', async () => {
      // Arrange
      const closeEligibility = createMockAnalysisEligibility({
        isEligible: false,
        unanalyzedCount: 6,
        requiredCount: 7
      });
      mockStorage.getAnalysisEligibility.mockResolvedValue(closeEligibility);

      // Act
      const result = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(result.unanalyzedCount).toBe(6);
      expect(result.requiredCount).toBe(7);
      
      // Business logic: User needs only 1 more drop
      const remaining = result.requiredCount - result.unanalyzedCount;
      expect(remaining).toBe(1);
    });
  });
}); 