/**
 * Unit Tests for Analysis Service
 * 
 * Tests the orchestration service that combines LLM analysis with database operations
 * including:
 * - End-to-end analysis creation workflow
 * - Validation and error handling
 * - Integration between LLM service and database
 * - Health checks and monitoring
 */

import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock the LLM service
jest.mock('../../server/services/analysisLLM', () => ({
  generateAnalysis: jest.fn(),
  getUnanalyzedDropsWithConversations: jest.fn()
}));

// Mock the database to control its behavior in tests
jest.mock('../../server/db', () => {
  const { testDb } = require('../setup');
  return {
    db: testDb
  };
});

// Mock the storage service
jest.mock('../../server/storage', () => ({
  storage: {
    getAnalysisEligibility: jest.fn(),
    createAnalysis: jest.fn(),
    getUserAnalyses: jest.fn()
  }
}));

// Import after mocking
import { 
  createAnalysisForUser, 
  getAnalysisStats, 
  previewAnalysis, 
  healthCheck,
  type AnalysisCreationResult
} from '../../server/services/analysisService';

const mockGenerateAnalysis = require('../../server/services/analysisLLM').generateAnalysis as jest.Mock;
const mockGetUnanalyzedDropsWithConversations = require('../../server/services/analysisLLM').getUnanalyzedDropsWithConversations as jest.Mock;
const mockStorage = require('../../server/storage').storage;

describe('Analysis Service', () => {
  const testUserId = 'test-user-service';
  let testQuestionId: number;

  beforeAll(async () => {
    // Create test question
    const result = await testDb.insert(schema.questionTable).values({
      text: 'Test question for service tests?',
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

    // Create test user
    await testDb.insert(schema.users).values({
      id: testUserId,
      username: 'testuser-service',
      email: 'test-service@example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createAnalysisForUser', () => {
    test('creates analysis successfully for eligible user', async () => {
      // Mock eligibility check - user is eligible
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });

      // Mock unanalyzed drops
      const mockDrops = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        userId: testUserId,
        questionId: testQuestionId,
        text: `Drop ${i + 1}`,
        createdAt: new Date(),
        messageCount: 2,
        questionText: 'Test question',
        conversation: [
          { text: `User message ${i + 1}`, fromUser: true },
          { text: `Coach response ${i + 1}`, fromUser: false }
        ]
      }));

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Mock LLM analysis generation
      const mockAnalysisResponse = {
        summary: 'User shows strong self-reflection patterns',
        content: 'Analysis content with insights about personal growth...',
        bulletPoints: '• Strong self-awareness\n• Growth mindset\n• Clear goals'
      };

      mockGenerateAnalysis.mockResolvedValue(mockAnalysisResponse);

      // Mock database storage
      const mockStoredAnalysis = {
        id: 1,
        userId: testUserId,
        ...mockAnalysisResponse,
        createdAt: new Date(),
        isFavorited: false
      };

      mockStorage.createAnalysis.mockResolvedValue(mockStoredAnalysis);

      // Execute the analysis creation
      const result = await createAnalysisForUser(testUserId);

      // Verify success
      expect(result.success).toBe(true);
      expect(result.analysis).toEqual(mockStoredAnalysis);
      expect(result.metadata).toMatchObject({
        dropCount: 8,
        userId: testUserId,
        processingTime: expect.any(Number)
      });

      // Verify method calls
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
      expect(mockGetUnanalyzedDropsWithConversations).toHaveBeenCalledWith(testUserId);
      expect(mockGenerateAnalysis).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(
        {
          userId: testUserId,
          content: mockAnalysisResponse.content,
          summary: mockAnalysisResponse.summary,
          bulletPoints: mockAnalysisResponse.bulletPoints
        },
        [1, 2, 3, 4, 5, 6, 7, 8]
      );
    });

    test('fails when user is not eligible', async () => {
      // Mock eligibility check - user is not eligible
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not eligible for analysis');
      expect(result.metadata).toMatchObject({
        dropCount: 5,
        userId: testUserId
      });

      // Should not call LLM or storage methods
      expect(mockGetUnanalyzedDropsWithConversations).not.toHaveBeenCalled();
      expect(mockGenerateAnalysis).not.toHaveBeenCalled();
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });

    test('fails when insufficient drops available', async () => {
      // Mock eligibility check - user is eligible
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 7,
        requiredCount: 7
      });

      // Mock insufficient drops
      const mockDrops = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        userId: testUserId,
        text: `Drop ${i + 1}`
      }));

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient drops for analysis: 6');
      expect(result.metadata?.dropCount).toBe(6);
    });

    test('handles LLM generation failure', async () => {
      // Mock successful eligibility and drops
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 7,
        requiredCount: 7
      });

      const mockDrops = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        userId: testUserId,
        text: `Drop ${i + 1}`
      }));

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Mock LLM failure
      mockGenerateAnalysis.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis generation failed');
      expect(result.error).toContain('LLM service unavailable');
    });

    test('handles database storage failure', async () => {
      // Mock successful eligibility, drops, and LLM
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 7,
        requiredCount: 7
      });

      const mockDrops = Array.from({ length: 7 }, (_, i) => ({
        id: i + 1,
        userId: testUserId,
        text: `Drop ${i + 1}`
      }));

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      });

      // Mock database failure
      mockStorage.createAnalysis.mockRejectedValue(new Error('Database connection failed'));

      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to store analysis');
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('getAnalysisStats', () => {
    test('returns correct stats for user with analyses', async () => {
      const mockAnalyses = [
        {
          id: 1,
          createdAt: new Date('2024-01-15'),
          summary: 'Recent analysis'
        },
        {
          id: 2,
          createdAt: new Date('2024-01-10'),
          summary: 'Older analysis'
        }
      ];

      mockStorage.getUserAnalyses.mockResolvedValue(mockAnalyses);
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: false,
        unanalyzedCount: 3,
        requiredCount: 7
      });

      const stats = await getAnalysisStats(testUserId);

      expect(stats).toEqual({
        totalAnalyses: 2,
        lastAnalysisDate: new Date('2024-01-15'),
        unanalyzedDropCount: 3,
        isEligible: false
      });
    });

    test('returns empty stats for user with no analyses', async () => {
      mockStorage.getUserAnalyses.mockResolvedValue([]);
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });

      const stats = await getAnalysisStats(testUserId);

      expect(stats).toEqual({
        totalAnalyses: 0,
        lastAnalysisDate: undefined,
        unanalyzedDropCount: 5,
        isEligible: false
      });
    });

    test('handles errors gracefully', async () => {
      mockStorage.getUserAnalyses.mockRejectedValue(new Error('Database error'));

      const stats = await getAnalysisStats(testUserId);

      expect(stats).toEqual({
        totalAnalyses: 0,
        unanalyzedDropCount: 0,
        isEligible: false
      });
    });
  });

  describe('previewAnalysis', () => {
    test('returns preview for eligible user', async () => {
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });

      const mockDrops = [
        {
          id: 1,
          createdAt: new Date('2024-01-10'),
          conversation: [{ text: 'msg1' }, { text: 'msg2' }]
        },
        {
          id: 2,
          createdAt: new Date('2024-01-15'),
          conversation: [{ text: 'msg3' }]
        }
      ];

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      const preview = await previewAnalysis(testUserId);

      expect(preview).toEqual({
        eligible: true,
        dropCount: 2,
        oldestDrop: new Date('2024-01-10'),
        newestDrop: new Date('2024-01-15'),
        totalMessages: 3
      });
    });

    test('returns ineligible status for user with insufficient drops', async () => {
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: false,
        unanalyzedCount: 4,
        requiredCount: 7
      });

      const preview = await previewAnalysis(testUserId);

      expect(preview).toEqual({
        eligible: false,
        dropCount: 4,
        totalMessages: 0,
        error: 'Not eligible: 4 out of 7 drops'
      });
    });

    test('handles no drops case', async () => {
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 7,
        requiredCount: 7
      });

      mockGetUnanalyzedDropsWithConversations.mockResolvedValue([]);

      const preview = await previewAnalysis(testUserId);

      expect(preview).toEqual({
        eligible: false,
        dropCount: 0,
        totalMessages: 0,
        error: 'No unanalyzed drops found'
      });
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      // Reset environment
      delete process.env.ANTHROPIC_API_KEY;
    });

    test('returns healthy status when all checks pass', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });

      mockStorage.getUserAnalyses.mockResolvedValue([]);

      const health = await healthCheck();

      expect(health).toEqual({
        healthy: true,
        checks: {
          anthropicApiKey: true,
          databaseConnection: true,
          storageService: true
        }
      });
    });

    test('returns unhealthy status when API key is missing', async () => {
      // API key not set
      mockStorage.getAnalysisEligibility.mockResolvedValue({});
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      const health = await healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.checks.anthropicApiKey).toBe(false);
    });

    test('returns unhealthy status when database check fails', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      mockStorage.getAnalysisEligibility.mockRejectedValue(new Error('DB error'));
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      const health = await healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.checks.databaseConnection).toBe(false);
    });

    test('returns unhealthy status when storage check fails', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      
      mockStorage.getAnalysisEligibility.mockResolvedValue({});
      mockStorage.getUserAnalyses.mockRejectedValue(new Error('Storage error'));

      const health = await healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.checks.storageService).toBe(false);
    });

    test('handles health check errors gracefully', async () => {
      // Simulate a total failure
      mockStorage.getAnalysisEligibility.mockImplementation(() => {
        throw new Error('Critical system error');
      });

      const health = await healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toContain('Critical system error');
    });
  });
}); 