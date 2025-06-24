/**
 * Analysis Workflow Integration Tests
 * 
 * Tests the complete end-to-end analysis workflow:
 * 1. User eligibility checking
 * 2. Analysis generation with LLM
 * 3. Database storage and relationships
 * 4. Data retrieval and display
 * 
 * These tests ensure all components work together correctly
 * in a realistic environment with actual database operations.
 */

import { testDb, cleanDatabase, TEST_USER_ID } from '../setup';
import * as schema from '../../shared/schema';
import { createAnalysisForUser } from '../../server/services/analysisService';
import { storage } from '../../server/storage';

// SAFETY CHECK: Ensure we're in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integration tests should only run in test environment');
}
import { eq, desc } from 'drizzle-orm';
import request from 'supertest';
import { getTestApp } from '../testServer';
import type { Express } from 'express';

// Mock external dependencies
jest.mock('../../server/services/analysisLLM');
import { generateAnalysis } from '../../server/services/analysisLLM';

const mockGenerateAnalysis = generateAnalysis as jest.MockedFunction<typeof generateAnalysis>;

describe('Analysis Workflow Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let testQuestionId: number;
  let authToken: string;

  beforeAll(async () => {
    // Create test server
    app = await getTestApp();
    
    // Set up test environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  beforeEach(async () => {
    // Clean database
    await cleanDatabase();

    // Use the test user ID
    testUserId = TEST_USER_ID;
    await storage.upsertUser({
      id: testUserId,
      username: 'testuser',
      email: 'test@example.com'
    });

    // Create test question
    const question = await storage.createQuestion({
      text: 'Integration test question',
      isActive: true,
      category: 'general'
    });
    testQuestionId = question.id;

    // Mock authentication token
    authToken = `Bearer mock-token-${testUserId}`;

    // Reset mocks
    jest.clearAllMocks();

    // Mock successful LLM response
    mockGenerateAnalysis.mockResolvedValue({
      summary: 'Integration test analysis summary',
      content: 'This is a comprehensive analysis of your recent journal entries. The patterns show thoughtful self-reflection and growing emotional awareness.\n\nYour responses demonstrate consistency in engaging with introspective questions, indicating a commitment to personal growth. This foundation of self-awareness is valuable for continued development.\n\nMoving forward, consider focusing on specific action steps that translate these insights into behavioral changes.',
      bulletPoints: '• Strong foundation in self-reflection\n• Consistent engagement with personal growth\n• Opportunity to translate insights into action\n• Developing emotional awareness\n• Commitment to introspective practice'
    });
  });

  afterAll(async () => {
    // Express app cleanup is handled by test setup
  });

  describe('Complete Analysis Workflow', () => {
    test('end-to-end workflow: eligibility → generation → storage → retrieval', async () => {
      // Step 1: Create drops with conversations (setup for eligibility)
      const dropIds: number[] = [];
      for (let i = 0; i < 7; i++) {
        const [drop] = await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Integration test drop ${i + 1} with sufficient content for meaningful analysis`,
          createdAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000) // Spread over 7 days
        }).returning();
        
        dropIds.push(drop.id);

        // Add conversation messages for each drop
        await testDb.insert(schema.messages).values([
          {
            dropId: drop.id,
            text: `User response ${i + 1}: Reflecting on today's experiences and emotions.`,
            fromUser: true,
            createdAt: new Date()
          },
          {
            dropId: drop.id,
            text: `Coach response ${i + 1}: That's a thoughtful reflection. What patterns do you notice?`,
            fromUser: false,
            createdAt: new Date()
          }
        ]);
      }

      // Step 2: Check initial eligibility
      const initialEligibility = await storage.getAnalysisEligibility(testUserId);
      expect(initialEligibility.isEligible).toBe(true);
      expect(initialEligibility.unanalyzedCount).toBe(7);

      // Step 3: Create analysis through service layer
      const analysisResult = await createAnalysisForUser(testUserId);
      
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.metadata?.dropCount).toBe(7);
      expect(analysisResult.metadata?.processingTime).toBeGreaterThan(0);

      const analysis = analysisResult.analysis!;

      // Step 4: Verify analysis was stored correctly
      expect(analysis.id).toBeGreaterThan(0);
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.summary).toBe('Integration test analysis summary');
      expect(analysis.content).toContain('comprehensive analysis');
      expect(analysis.bulletPoints).toContain('Strong foundation');
      expect(analysis.isFavorited).toBe(false);
      expect(analysis.createdAt).toBeInstanceOf(Date);

      // Step 5: Verify analysis-drop relationships were created
      const analysisDropRelations = await testDb
        .select()
        .from(schema.analysisDrops)
        .where(eq(schema.analysisDrops.analysisId, analysis.id));
      
      expect(analysisDropRelations).toHaveLength(7);
      
      const relationDropIds = analysisDropRelations.map(rel => rel.dropId).sort();
      expect(relationDropIds).toEqual(dropIds.sort());

      // Step 6: Verify user's last analysis date was updated
      const updatedUser = await storage.getUser(testUserId);
      expect(updatedUser?.lastAnalysisDate).toBeInstanceOf(Date);
      expect(updatedUser!.lastAnalysisDate!.getTime()).toBeCloseTo(Date.now(), -2); // Within 2 seconds

      // Step 7: Check eligibility after analysis (should be reset)
      const postAnalysisEligibility = await storage.getAnalysisEligibility(testUserId);
      expect(postAnalysisEligibility.isEligible).toBe(false);
      expect(postAnalysisEligibility.unanalyzedCount).toBe(0);

      // Step 8: Retrieve analysis through storage layer
      const retrievedAnalysis = await storage.getAnalysis(analysis.id);
      expect(retrievedAnalysis).toEqual(analysis);

      // Step 9: Get user analyses list
      const userAnalyses = await storage.getUserAnalyses(testUserId);
      expect(userAnalyses).toHaveLength(1);
      expect(userAnalyses[0].id).toBe(analysis.id);

      // Step 10: Get drops included in the analysis
      const analysisDrops = await storage.getAnalysisDrops(analysis.id);
      expect(analysisDrops).toHaveLength(7);
      analysisDrops.forEach(drop => {
        expect(dropIds).toContain(drop.id);
        expect(drop.questionText).toBe('Integration test question');
      });
    });

    test('workflow handles multiple analyses correctly', async () => {
      // Create first batch of drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `First batch drop ${i + 1}`,
          createdAt: new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000) // 14-8 days ago
        });
      }

      // Create first analysis
      const firstAnalysis = await createAnalysisForUser(testUserId);
      expect(firstAnalysis.success).toBe(true);

      // Create second batch of drops (after first analysis)
      for (let i = 0; i < 8; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Second batch drop ${i + 1}`,
          createdAt: new Date(Date.now() - (7 - i) * 24 * 60 * 60 * 1000) // 7-0 days ago
        });
      }

      // Mock different response for second analysis
      mockGenerateAnalysis.mockResolvedValueOnce({
        summary: 'Second analysis summary',
        content: 'Second analysis content with different insights.',
        bulletPoints: '• Different insights\n• New patterns identified'
      });

      // Check eligibility for second analysis
      const secondEligibility = await storage.getAnalysisEligibility(testUserId);
      expect(secondEligibility.isEligible).toBe(true);
      expect(secondEligibility.unanalyzedCount).toBe(8);

      // Create second analysis
      const secondAnalysis = await createAnalysisForUser(testUserId);
      expect(secondAnalysis.success).toBe(true);
      expect(secondAnalysis.metadata?.dropCount).toBe(8);

      // Verify both analyses exist
      const allAnalyses = await storage.getUserAnalyses(testUserId);
      expect(allAnalyses).toHaveLength(2);
      
      // Should be ordered newest first
      expect(allAnalyses[0].id).toBe(secondAnalysis.analysis!.id);
      expect(allAnalyses[1].id).toBe(firstAnalysis.analysis!.id);

      // Verify drop relationships are correctly separated
      const firstAnalysisDrops = await storage.getAnalysisDrops(firstAnalysis.analysis!.id);
      const secondAnalysisDrops = await storage.getAnalysisDrops(secondAnalysis.analysis!.id);
      
      expect(firstAnalysisDrops).toHaveLength(7);
      expect(secondAnalysisDrops).toHaveLength(8);
      
      // No overlap in drops between analyses
      const firstDropIds = firstAnalysisDrops.map(d => d.id);
      const secondDropIds = secondAnalysisDrops.map(d => d.id);
      const overlap = firstDropIds.filter(id => secondDropIds.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('API Integration with Database', () => {
    beforeEach(async () => {
      // Create test drops for API tests
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `API test drop ${i + 1} with sufficient content`,
          createdAt: new Date()
        });
      }
    });

    test('POST /api/analyses creates analysis and stores in database', async () => {
      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(201);

      const analysis = response.body;
      expect(analysis.id).toBeGreaterThan(0);
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.summary).toBe('Integration test analysis summary');

      // Verify in database
      const dbAnalysis = await storage.getAnalysis(analysis.id);
      expect(dbAnalysis).toBeTruthy();
      expect(dbAnalysis!.content).toContain('comprehensive analysis');
    });

    test('GET /api/analyses retrieves analyses from database', async () => {
      // Create analysis first
      const analysisResult = await createAnalysisForUser(testUserId);
      expect(analysisResult.success).toBe(true);

      const response = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.analyses).toHaveLength(1);
      expect(response.body.analyses[0].id).toBe(analysisResult.analysis!.id);
      expect(response.body.hasMore).toBe(false);
    });

    test('GET /api/analyses/:id retrieves specific analysis from database', async () => {
      // Create analysis
      const analysisResult = await createAnalysisForUser(testUserId);
      const analysisId = analysisResult.analysis!.id;

      const response = await request(app)
        .get(`/api/analyses/${analysisId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.id).toBe(analysisId);
      expect(response.body.summary).toBe('Integration test analysis summary');
    });

    test('PUT /api/analyses/:id/favorite updates database', async () => {
      // Create analysis
      const analysisResult = await createAnalysisForUser(testUserId);
      const analysisId = analysisResult.analysis!.id;

      // Update favorite status
      const response = await request(app)
        .put(`/api/analyses/${analysisId}/favorite`)
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(200);

      expect(response.body.isFavorited).toBe(true);

      // Verify in database
      const dbAnalysis = await storage.getAnalysis(analysisId);
      expect(dbAnalysis!.isFavorited).toBe(true);
    });

    test('GET /api/analyses/eligibility checks database state', async () => {
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.isEligible).toBe(true);
      expect(response.body.unanalyzedCount).toBe(7);
      expect(response.body.requiredCount).toBe(7);
    });
  });

  describe('Error Recovery and Data Integrity', () => {
    test('failed analysis does not leave partial data in database', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Error recovery test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      // Mock LLM failure
      mockGenerateAnalysis.mockRejectedValueOnce(new Error('LLM service failure'));

      // Attempt analysis creation
      const result = await createAnalysisForUser(testUserId);
      expect(result.success).toBe(false);

      // Verify no partial data was created
      const analyses = await storage.getUserAnalyses(testUserId);
      expect(analyses).toHaveLength(0);

      const analysisDrops = await testDb.select().from(schema.analysisDrops);
      expect(analysisDrops).toHaveLength(0);

      // Verify user's last analysis date wasn't updated
      const user = await storage.getUser(testUserId);
      expect(user!.lastAnalysisDate).toBeNull();

      // Verify eligibility is still available
      const eligibility = await storage.getAnalysisEligibility(testUserId);
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(7);
    });

    test('database transaction rollback on storage failure', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Transaction test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      // Mock storage failure (simulate after LLM succeeds but DB fails)
      const originalCreateAnalysis = storage.createAnalysis;
      storage.createAnalysis = jest.fn().mockRejectedValue(new Error('Database storage failed'));

      try {
        const result = await createAnalysisForUser(testUserId);
        expect(result.success).toBe(false);
        expect(result.errorType).toBe('database');

        // Verify no orphaned data
        const analyses = await testDb.select().from(schema.analyses);
        expect(analyses.filter(a => a.userId === testUserId)).toHaveLength(0);

        const analysisDrops = await testDb.select().from(schema.analysisDrops);
        expect(analysisDrops).toHaveLength(0);
      } finally {
        // Restore original method
        storage.createAnalysis = originalCreateAnalysis;
      }
    });
  });

  describe('Performance and Concurrency', () => {
    test('handles concurrent analysis requests correctly', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Concurrency test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      // Mock LLM with delay to simulate race condition
      mockGenerateAnalysis.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            summary: 'Concurrent test summary',
            content: 'Concurrent test content',
            bulletPoints: '• Concurrent test point'
          }), 100)
        )
      );

      // Start multiple concurrent requests
      const promises = [
        createAnalysisForUser(testUserId),
        createAnalysisForUser(testUserId),
        createAnalysisForUser(testUserId)
      ];

      const results = await Promise.all(promises);

      // Only one should succeed, others should be rejected as duplicates
      const successful = results.filter(r => r.success);
      const duplicates = results.filter(r => !r.success && r.errorType === 'duplicate');

      expect(successful).toHaveLength(1);
      expect(duplicates).toHaveLength(2);

      // Verify only one analysis was created
      const analyses = await storage.getUserAnalyses(testUserId);
      expect(analyses).toHaveLength(1);
    });
  });
}); 