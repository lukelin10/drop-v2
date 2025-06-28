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

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks 
} from '../mocks/mockStorage';
import { 
  createMockUser, 
  createMockDropWithQuestion, 
  createMockAnalysis,
  createMockAnalysisResult,
  createMockAnalysisEligibility,
  createMockMessage,
  TEST_USER_IDS 
} from '../factories/testData';

// Mock the LLM service and storage dependencies
jest.mock('../../server/services/analysisLLM', () => ({
  generateAnalysis: jest.fn(),
  getUnanalyzedDropsWithConversations: jest.fn()
}));

jest.mock('../../server/storage', () => ({
  storage: require('../mocks/mockStorage').mockStorage
}));

// Import the actual service to test
import {
  createAnalysisForUser,
  getAnalysisStats,
  previewAnalysis,
  healthCheck
} from '../../server/services/analysisService';

const mockGenerateAnalysis = require('../../server/services/analysisLLM').generateAnalysis as jest.Mock;
const mockGetUnanalyzedDropsWithConversations = require('../../server/services/analysisLLM').getUnanalyzedDropsWithConversations as jest.Mock;

describe('Analysis Service Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;

  beforeEach(() => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();
    
    // Mock environment variable for health checks
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('createAnalysisForUser', () => {
    test('should create analysis successfully for eligible user', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => 
        createMockDropWithQuestion({ 
          id: i + 1, 
          userId: testUserId, 
          text: `This is a meaningful journal entry number ${i + 1} with enough content for analysis.`,
          createdAt: new Date(Date.now() - i * 60 * 60 * 1000) // Spread over 8 hours (very recent)
        })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      const mockAnalysisResponse = {
        summary: 'User shows strong self-reflection patterns',
        content: 'Analysis content with insights about personal growth...',
        bulletPoints: '• Strong self-awareness\n• Growth mindset\n• Clear goals'
      };
      mockGenerateAnalysis.mockResolvedValue(mockAnalysisResponse);

      const mockStoredAnalysis = createMockAnalysis({
        id: 1,
        userId: testUserId,
        ...mockAnalysisResponse
      });
      mockStorage.createAnalysis.mockResolvedValue(mockStoredAnalysis);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.analysis).toEqual(mockStoredAnalysis);
      expect(result.metadata).toMatchObject({
        dropCount: 8,
        userId: testUserId,
        processingTime: expect.any(Number)
      });

      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
      expect(mockGetUnanalyzedDropsWithConversations).toHaveBeenCalledWith(testUserId);
      expect(mockGenerateAnalysis).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.createAnalysis).toHaveBeenCalled();
    });

    test('should fail when user is not eligible', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 5);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('You need at least 7 journal entries');
      expect(result.metadata).toMatchObject({
        dropCount: 5,
        userId: testUserId
      });

      expect(mockGetUnanalyzedDropsWithConversations).not.toHaveBeenCalled();
      expect(mockGenerateAnalysis).not.toHaveBeenCalled();
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });

    test('should fail when insufficient drops available', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      // Mock insufficient drops returned by LLM service
      const mockDrops = Array.from({ length: 6 }, (_, i) => 
        createMockDropWithQuestion({ id: i + 1, userId: testUserId, text: `Drop ${i + 1}` })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('You need at least 7 journal entries');
      expect(result.metadata).toMatchObject({
        dropCount: 6,
        userId: testUserId
      });

      expect(mockGenerateAnalysis).not.toHaveBeenCalled();
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });

    test('should handle LLM service errors gracefully', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => 
        createMockDropWithQuestion({ id: i + 1, userId: testUserId })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Mock LLM failure
      const llmError = new Error('LLM service unavailable');
      mockGenerateAnalysis.mockRejectedValue(llmError);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Our analysis service is temporarily unavailable');
      expect(result.metadata).toMatchObject({
        dropCount: 8,
        userId: testUserId
      });

      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });

    test('should handle storage errors gracefully', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => 
        createMockDropWithQuestion({ 
          id: i + 1, 
          userId: testUserId,
          createdAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000) // Recent drops
        })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      const mockAnalysisResponse = {
        summary: 'Test summary',
        content: 'Test content',
        bulletPoints: '• Test point'
      };
      mockGenerateAnalysis.mockResolvedValue(mockAnalysisResponse);

      // Mock storage failure with a database-specific error message
      const storageError = new Error('Database write error');
      mockStorage.createAnalysis.mockRejectedValue(storageError);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to save your analysis');
      expect(result.metadata).toMatchObject({
        dropCount: 8,
        userId: testUserId
      });
    });

    test('should handle timeout scenarios', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => 
        createMockDropWithQuestion({ id: i + 1, userId: testUserId })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Mock timeout error
      const timeoutError = new Error('Request timeout');
      mockGenerateAnalysis.mockRejectedValue(timeoutError);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Analysis took too long to complete');
    });

    test('should validate minimum drop requirements at boundary', async () => {
      // Arrange - User is eligible with exactly 7 drops
      mockStorage.getAnalysisEligibility.mockResolvedValue(
        createMockAnalysisEligibility({ isEligible: true, unanalyzedCount: 7 })
      );

      const mockDrops = Array.from({ length: 7 }, (_, i) => 
        createMockDropWithQuestion({ id: i + 1, userId: testUserId })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      const mockAnalysisResponse = {
        summary: 'Minimal analysis',
        content: 'Basic insights',
        bulletPoints: '• Key insight'
      };
      mockGenerateAnalysis.mockResolvedValue(mockAnalysisResponse);

      const mockStoredAnalysis = createMockAnalysis({ userId: testUserId, ...mockAnalysisResponse });
      mockStorage.createAnalysis.mockResolvedValue(mockStoredAnalysis);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.metadata?.dropCount).toBe(7);
    });

    test('should validate user ID format', async () => {
      // Arrange - Mock empty eligibility for empty user ID
      mockStorage.getAnalysisEligibility.mockResolvedValue(
        createMockAnalysisEligibility({ isEligible: false, unanalyzedCount: 0 })
      );

      // Act
      const result = await createAnalysisForUser('');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('You need at least 7 journal entries');
    });

    test('should handle network errors', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => 
        createMockDropWithQuestion({ id: i + 1, userId: testUserId })
      );
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Mock network error
      const networkError = new Error('fetch failed');
      mockGenerateAnalysis.mockRejectedValue(networkError);

      // Act
      const result = await createAnalysisForUser(testUserId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to connect to our analysis service');
    });
  });

  describe('getAnalysisStats', () => {
    test('should return analysis statistics for user', async () => {
      // Arrange
      const mockAnalyses = [
        createMockAnalysis({ id: 1, userId: testUserId, isFavorited: true }),
        createMockAnalysis({ id: 2, userId: testUserId, isFavorited: false }),
        createMockAnalysis({ id: 3, userId: testUserId, isFavorited: true })
      ];
      mockStorage.getUserAnalyses.mockResolvedValue(mockAnalyses);

      const mockEligibility = createMockAnalysisEligibility({ 
        isEligible: false, 
        unanalyzedCount: 4 
      });
      mockStorage.getAnalysisEligibility.mockResolvedValue(mockEligibility);

      // Act
      const stats = await getAnalysisStats(testUserId);

      // Assert
      expect(stats).toEqual({
        totalAnalyses: 3,
        unanalyzedDropCount: 4,
        isEligible: false,
        hasOngoingAnalysis: false,
        lastAnalysisDate: expect.any(Date)
      });

      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId, 100, 0);
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });

    test('should handle user with no analyses', async () => {
      // Arrange
      setupEmptyUserMocks(testUserId);

      // Act
      const stats = await getAnalysisStats(testUserId);

      // Assert
      expect(stats).toEqual({
        totalAnalyses: 0,
        unanalyzedDropCount: 0,
        isEligible: false,
        hasOngoingAnalysis: false,
        lastAnalysisDate: undefined
      });
    });

    test('should handle errors in stats calculation', async () => {
      // Arrange
      mockStorage.getUserAnalyses.mockRejectedValue(new Error('Database error'));

      // Act
      const stats = await getAnalysisStats(testUserId);

      // Assert - Should return default values on error
      expect(stats).toEqual({
        totalAnalyses: 0,
        unanalyzedDropCount: 0,
        isEligible: false,
        hasOngoingAnalysis: false
      });
    });
  });

  describe('previewAnalysis', () => {
    test('should generate analysis preview without saving', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      const mockDrops = Array.from({ length: 8 }, (_, i) => ({
        ...createMockDropWithQuestion({ 
          id: i + 1, 
          userId: testUserId,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Spread over 8 days
        }),
        conversation: [
          createMockMessage({ id: i * 4 + 1, dropId: i + 1, text: `Message ${i * 2 + 1}`, fromUser: true }),
          createMockMessage({ id: i * 4 + 2, dropId: i + 1, text: `Response ${i * 2 + 1}`, fromUser: false }),
          createMockMessage({ id: i * 4 + 3, dropId: i + 1, text: `Message ${i * 2 + 2}`, fromUser: true }),
          createMockMessage({ id: i * 4 + 4, dropId: i + 1, text: `Response ${i * 2 + 2}`, fromUser: false })
        ]
      }));
      mockGetUnanalyzedDropsWithConversations.mockResolvedValue(mockDrops);

      // Act
      const preview = await previewAnalysis(testUserId);

      // Assert
      expect(preview.eligible).toBe(true);
      expect(preview.dropCount).toBe(8);
      expect(preview.totalMessages).toBeGreaterThan(0);
      expect(preview.oldestDrop).toBeDefined();
      expect(preview.newestDrop).toBeDefined();

      // Should NOT call storage create method
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });

    test('should fail preview for ineligible user', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 3);

      // Act
      const preview = await previewAnalysis(testUserId);

      // Assert
      expect(preview.eligible).toBe(false);
      expect(preview.dropCount).toBe(3);
      expect(preview.error).toBeDefined();
      expect(mockGetUnanalyzedDropsWithConversations).not.toHaveBeenCalled();
    });

    test('should handle errors in preview generation', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);
      mockGetUnanalyzedDropsWithConversations.mockRejectedValue(new Error('Service error'));

      // Act
      const preview = await previewAnalysis(testUserId);

      // Assert
      expect(preview.eligible).toBe(false);
      expect(preview.error).toContain('Preview failed');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when all services work', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockResolvedValue(
        createMockAnalysisEligibility({ isEligible: false, unanalyzedCount: 0 })
      );
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act
      const health = await healthCheck();

      // Assert
      expect(health.healthy).toBe(true);
      expect(health.checks).toMatchObject({
        anthropicApiKey: true,
        databaseConnection: true,
        storageService: true
      });
    });

    test('should return unhealthy status when storage fails', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockRejectedValue(new Error('Storage down'));

      // Act
      const health = await healthCheck();

      // Assert
      expect(health.healthy).toBe(false);
      expect(health.checks.databaseConnection).toBe(false);
    });

    test('should return unhealthy status when storage service fails', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockResolvedValue(
        createMockAnalysisEligibility({ isEligible: false, unanalyzedCount: 0 })
      );
      mockStorage.getUserAnalyses.mockRejectedValue(new Error('Storage service error'));

      // Act
      const health = await healthCheck();

      // Assert
      expect(health.healthy).toBe(false);
      expect(health.checks.storageService).toBe(false);
    });

    test('should handle missing API key', async () => {
      // Arrange
      delete process.env.ANTHROPIC_API_KEY;
      mockStorage.getAnalysisEligibility.mockResolvedValue(
        createMockAnalysisEligibility({ isEligible: false, unanalyzedCount: 0 })
      );
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act
      const health = await healthCheck();

      // Assert
      expect(health.healthy).toBe(false);
      expect(health.checks.anthropicApiKey).toBe(false);
    });

    test('should handle health check errors gracefully', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockRejectedValue(new Error('Critical error'));

      // Act
      const health = await healthCheck();

      // Assert
      expect(health.healthy).toBe(false);
      expect(health.checks.databaseConnection).toBe(false);
    });
  });
}); 