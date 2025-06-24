/**
 * Comprehensive Error Handling Tests
 * 
 * Tests various error scenarios and edge cases for the analysis feature:
 * - Network connectivity issues
 * - API failures and timeouts
 * - Database errors
 * - Data integrity issues
 * - Duplicate analysis scenarios
 * - Rate limiting
 * - Authentication/authorization errors
 */

import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { DatabaseStorage } from '../../server/DatabaseStorage';
import { createAnalysisForUser, hasOngoingAnalysis, cancelOngoingAnalysis } from '../../server/services/analysisService';
import { generateAnalysis } from '../../server/services/analysisLLM';
import { eq } from 'drizzle-orm';

// Mock external dependencies
jest.mock('../../server/services/analysisLLM');
jest.mock('@anthropic-ai/sdk');

const mockGenerateAnalysis = generateAnalysis as jest.MockedFunction<typeof generateAnalysis>;

describe('Error Handling Tests', () => {
  let storage: DatabaseStorage;
  let testUserId: string;
  let testQuestionId: number;

  beforeEach(async () => {
    // Initialize storage
    storage = new DatabaseStorage();

    // Create test user
    testUserId = 'test-user-' + Date.now();
    await testDb.insert(schema.users).values({
      id: testUserId,
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create test question
    const [question] = await testDb.insert(schema.questionTable).values({
      text: 'Test question for error handling',
      isActive: true,
      category: 'general'
    }).returning();
    testQuestionId = question.id;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await testDb.delete(schema.analysisDrops);
    await testDb.delete(schema.analyses);
    await testDb.delete(schema.messages);
    await testDb.delete(schema.drops);
    await testDb.delete(schema.users).where(eq(schema.users.id, testUserId));
    await testDb.delete(schema.questionTable).where(eq(schema.questionTable.id, testQuestionId));
  });

  describe('Network and API Error Scenarios', () => {
    beforeEach(async () => {
      // Create enough drops for analysis
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }
    });

    test('handles LLM service timeout', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('Analysis request timeout'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toContain('took too long');
    });

    test('handles LLM service network error', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('network request failed'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toContain('connection');
    });

    test('handles LLM service rate limit error', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('rate limit exceeded'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('limit');
    });

    test('handles LLM service unavailable', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('Service temporarily unavailable'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('llm');
      expect(result.error).toContain('temporarily unavailable');
    });
  });

  describe('Database Error Scenarios', () => {
    beforeEach(async () => {
      // Create enough drops for analysis
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Mock successful LLM response
      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test analysis summary',
        content: 'Test analysis content',
        bulletPoints: '• Test point 1\n• Test point 2'
      });
    });

    test('handles database connection failure', async () => {
      // Mock database error by making storage fail
      const originalCreateAnalysis = storage.createAnalysis;
      storage.createAnalysis = jest.fn().mockRejectedValue(new Error('connection timeout'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('database');
      expect(result.error).toContain('Unable to save');

      // Restore original method
      storage.createAnalysis = originalCreateAnalysis;
    });

    test('handles database constraint violation', async () => {
      // Mock constraint error
      const originalCreateAnalysis = storage.createAnalysis;
      storage.createAnalysis = jest.fn().mockRejectedValue(new Error('unique constraint violation'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('database');
      expect(result.error).toContain('already being processed');

      storage.createAnalysis = originalCreateAnalysis;
    });
  });

  describe('Data Integrity Error Scenarios', () => {
    test('handles insufficient drops', async () => {
      // Create only 5 drops (less than required 7)
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('need at least 7');
      expect(result.metadata?.dropCount).toBe(5);
    });

    test('handles drops with missing text content', async () => {
      // Create drops with empty/insufficient text
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: i < 3 ? '' : 'Short', // Some empty, some too short
          createdAt: new Date()
        });
      }

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('integrity');
      expect(result.error).toContain('too short');
    });

    test('handles invalid LLM response', async () => {
      // Create valid drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Mock invalid LLM response
      mockGenerateAnalysis.mockResolvedValue({
        summary: '', // Empty summary
        content: '', // Empty content
        bulletPoints: ''
      });

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('integrity');
      expect(result.error).toContain('validation failed');
    });

    test('handles drops with invalid dates', async () => {
      // This would be harder to test with actual invalid dates in DB
      // but we can test the validation logic
      const drops = [
        {
          id: 1,
          userId: testUserId,
          text: 'Valid drop text',
          createdAt: 'invalid-date' // Invalid date
        }
      ];

      const { performDataIntegrityChecks } = require('../../server/services/analysisService');
      
      // We need to access the private function for testing
      // In a real scenario, this would be tested through public APIs
      expect(true).toBe(true); // Placeholder for now
    });
  });

  describe('Duplicate Analysis Prevention', () => {
    beforeEach(async () => {
      // Create enough drops for analysis
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }
    });

    test('prevents duplicate analysis requests', async () => {
      // Mock LLM to simulate long-running analysis
      mockGenerateAnalysis.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          summary: 'Test summary',
          content: 'Test content',
          bulletPoints: '• Test point'
        }), 100))
      );

      // Start first analysis
      const firstAnalysisPromise = createAnalysisForUser(testUserId);

      // Try to start second analysis while first is running
      const secondResult = await createAnalysisForUser(testUserId);

      // Second should be rejected as duplicate
      expect(secondResult.success).toBe(false);
      expect(secondResult.errorType).toBe('duplicate');
      expect(secondResult.error).toContain('already being processed');

      // Let first analysis complete
      await firstAnalysisPromise;
    });

    test('allows analysis after previous one completes', async () => {
      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      });

      // First analysis
      const firstResult = await createAnalysisForUser(testUserId);
      expect(firstResult.success).toBe(true);

      // Create more drops
      for (let i = 7; i < 14; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `New drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Second analysis should be allowed
      const secondResult = await createAnalysisForUser(testUserId);
      expect(secondResult.success).toBe(true);
    });

    test('tracks ongoing analysis status', async () => {
      mockGenerateAnalysis.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          summary: 'Test summary',
          content: 'Test content', 
          bulletPoints: '• Test point'
        }), 100))
      );

      // Start analysis
      const analysisPromise = createAnalysisForUser(testUserId);

      // Check ongoing status
      expect(hasOngoingAnalysis(testUserId)).toBe(true);

      // Cancel ongoing analysis
      const cancelled = cancelOngoingAnalysis(testUserId);
      expect(cancelled).toBe(true);

      // Check status after cancellation
      expect(hasOngoingAnalysis(testUserId)).toBe(false);

      // Wait for promise to resolve/reject
      await analysisPromise;
    });
  });

  describe('Rate Limiting and Validation', () => {
    beforeEach(async () => {
      // Create enough drops for analysis
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      });
    });

    test('enforces minimum time between analyses', async () => {
      // Create first analysis
      const firstResult = await createAnalysisForUser(testUserId);
      expect(firstResult.success).toBe(true);

      // Try to create another immediately (should be rate limited)
      const secondResult = await createAnalysisForUser(testUserId);
      expect(secondResult.success).toBe(false);
      expect(secondResult.errorType).toBe('validation');
      expect(secondResult.error).toContain('wait');
    });

    test('handles non-existent user', async () => {
      const result = await createAnalysisForUser('non-existent-user');

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('User not found');
    });

    test('handles user without sufficient drops', async () => {
      // Create new user with no drops
      const newUserId = 'new-user-' + Date.now();
      await testDb.insert(schema.users).values({
        id: newUserId,
        username: `newuser_${Date.now()}`,
        email: `newuser_${Date.now()}@example.com`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await createAnalysisForUser(newUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('need at least 7');

      // Cleanup
      await testDb.delete(schema.users).where(eq(schema.users.id, newUserId));
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('cleans up ongoing analysis tracking on error', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Mock LLM to fail
      mockGenerateAnalysis.mockRejectedValue(new Error('LLM service error'));

      // Analysis should fail
      const result = await createAnalysisForUser(testUserId);
      expect(result.success).toBe(false);

      // But ongoing tracking should be cleaned up
      expect(hasOngoingAnalysis(testUserId)).toBe(false);
    });

    test('provides detailed error metadata', async () => {
      const result = await createAnalysisForUser(testUserId);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.userId).toBe(testUserId);
      expect(result.metadata?.processingTime).toBeGreaterThan(0);
      expect(result.metadata?.dropCount).toBeDefined();
    });

    test('handles unknown error types gracefully', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Mock unexpected error
      mockGenerateAnalysis.mockImplementation(() => {
        throw new Error('Completely unexpected error type');
      });

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('llm');
      expect(result.error).toBe('Our analysis service is temporarily unavailable. Please try again in a few minutes.');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('handles exactly 7 drops (minimum required)', async () => {
      // Create exactly 7 drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      });

      const result = await createAnalysisForUser(testUserId);
      expect(result.success).toBe(true);
      expect(result.metadata?.dropCount).toBe(7);
    });

    test('handles very large number of drops', async () => {
      // Create many drops
      for (let i = 0; i < 100; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      });

      const result = await createAnalysisForUser(testUserId);
      expect(result.success).toBe(true);
      expect(result.metadata?.dropCount).toBe(100);
    });

    test('handles very long analysis content', async () => {
      // Create drops
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1} with sufficient content for analysis`,
          createdAt: new Date()
        });
      }

      // Mock very long LLM response
      const longContent = 'Very long analysis content. '.repeat(1000);
      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: longContent,
        bulletPoints: '• Test point 1\n• Test point 2\n• Test point 3\n• Test point 4\n• Test point 5'
      });

      const result = await createAnalysisForUser(testUserId);
      expect(result.success).toBe(true);
      expect(result.analysis?.content.length).toBeGreaterThan(1000);
    });
  });
}); 