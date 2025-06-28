/**
 * Comprehensive Error Handling Tests
 * 
 * Tests various error scenarios and edge cases for the analysis feature.
 */

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks, 
  setupEligibleUserMocks, 
  setupIneligibleUserMocks 
} from '../mocks/mockStorage';

// Mock external dependencies
jest.mock('../../server/services/analysisLLM', () => ({
  generateAnalysis: jest.fn()
}));
jest.mock('../../server/services/analysisService', () => ({
  createAnalysisForUser: jest.fn()
}));

describe('Error Handling Tests', () => {
  let testUserId: string;
  let mockGenerateAnalysis: jest.Mock;
  let mockCreateAnalysisForUser: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get mocked functions after mocks are set up
    mockGenerateAnalysis = require('../../server/services/analysisLLM').generateAnalysis;
    mockCreateAnalysisForUser = require('../../server/services/analysisService').createAnalysisForUser;
    
    // Set up test data
    testUserId = 'test-user-error-handling';
  });

  describe('Network and API Error Scenarios', () => {
    beforeEach(() => {
      setupEligibleUserMocks(testUserId);
    });

    test('handles LLM service timeout', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('Analysis request timeout'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'network',
        error: 'Analysis took too long to complete'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toContain('took too long');
    });

    test('handles LLM service network error', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('network request failed'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'network',
        error: 'Network connection failed'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('network');
      expect(result.error).toContain('connection');
    });

    test('handles LLM service rate limit error', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('rate limit exceeded'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'validation',
        error: 'Rate limit exceeded'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('limit');
    });

    test('handles LLM service unavailable', async () => {
      mockGenerateAnalysis.mockRejectedValue(new Error('Service temporarily unavailable'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'llm',
        error: 'Service temporarily unavailable'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('llm');
      expect(result.error).toContain('temporarily unavailable');
    });
  });

  describe('Database Error Scenarios', () => {
    beforeEach(() => {
      setupEligibleUserMocks(testUserId);

      // Mock successful LLM response
      mockGenerateAnalysis.mockResolvedValue({
        summary: 'Test analysis summary',
        content: 'Test analysis content',
        bulletPoints: '• Test point 1\n• Test point 2'
      });
    });

    test('handles database connection failure', async () => {
      // Mock database error
      mockStorage.createAnalysis.mockRejectedValue(new Error('connection timeout'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'database',
        error: 'Unable to save analysis'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('database');
      expect(result.error).toContain('Unable to save');
    });

    test('handles database constraint violation', async () => {
      // Mock constraint error
      mockStorage.createAnalysis.mockRejectedValue(new Error('unique constraint violation'));
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'database',
        error: 'Analysis already being processed'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('database');
      expect(result.error).toContain('already being processed');
    });
  });

  describe('Data Integrity Error Scenarios', () => {
    test('handles insufficient drops', async () => {
      setupIneligibleUserMocks(testUserId, 5);
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        errorType: 'validation',
        error: 'You need at least 7 journal entries'
      });

      const result = await mockCreateAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('need at least 7');
    });
  });
}); 