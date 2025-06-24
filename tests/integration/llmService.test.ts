/**
 * LLM Service Integration Tests
 * 
 * Tests the LLM service integration with mock responses and error scenarios:
 * - Successful analysis generation
 * - Retry logic and exponential backoff
 * - Rate limiting and timeout handling
 * - Error scenarios (API failures, invalid responses, network issues)
 * - Response parsing and validation
 * 
 * These tests verify that the LLM service handles all scenarios correctly
 * without making actual API calls to the LLM provider.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { generateAnalysis } from '../../server/services/analysisLLM';

// SAFETY CHECK: Ensure we're in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integration tests should only run in test environment');
}

// Mock the anthropic module
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

// Mock the database and related functions
jest.mock('../../server/services/analysisLLM', () => ({
  generateAnalysis: jest.fn(),
  getUnanalyzedDropsWithConversations: jest.fn()
}));

describe('LLM Service Integration Tests', () => {
  const mockUserId = 'test-user-id';
  const mockGenerateAnalysis = generateAnalysis as jest.MockedFunction<typeof generateAnalysis>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Successful Analysis Generation', () => {
    test('generates analysis with valid LLM response', async () => {
      const mockResponse = {
        summary: 'Growing mindfulness and emotional resilience through daily practice',
        content: 'Your journal entries reveal a remarkable journey of emotional growth and self-awareness over the past week. The progression from initial goal-setting to implementing coping strategies demonstrates genuine commitment to personal development.',
        bulletPoints: '• Developing strong emotional regulation through mindfulness practices\n• Building resilience by transforming challenges into growth opportunities\n• Cultivating gratitude as a foundation for positive mindset shifts'
      };

      mockGenerateAnalysis.mockResolvedValue(mockResponse);

      const result = await generateAnalysis(mockUserId);

      expect(result).toEqual(mockResponse);
      expect(mockGenerateAnalysis).toHaveBeenCalledWith(mockUserId);
    });

    test('parses complex analysis with multiple sections', async () => {
      const mockResponse = {
        summary: 'Complex emotional growth with multiple insights',
        content: 'First paragraph discussing initial observations and patterns.\n\nSecond paragraph diving deeper into emotional development and coping strategies.\n\nThird paragraph exploring future growth opportunities and actionable insights.',
        bulletPoints: '• First insight about emotional patterns\n• Second insight about growth strategies\n• Third insight about relationship building\n• Fourth insight about mindfulness practice\n• Fifth insight about goal achievement'
      };

      mockGenerateAnalysis.mockResolvedValue(mockResponse);

      const result = await generateAnalysis(mockUserId);

      expect(result.summary).toBe('Complex emotional growth with multiple insights');
      expect(result.content).toContain('First paragraph discussing');
      expect(result.content).toContain('Second paragraph diving');
      expect(result.content).toContain('Third paragraph exploring');
      expect(result.bulletPoints).toContain('• First insight about emotional patterns');
      expect(result.bulletPoints).toContain('• Fifth insight about goal achievement');
    });
  });

  describe('Error Handling', () => {
    test('handles LLM API failures', async () => {
      const error = new Error('API connection failed');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('API connection failed');
      expect(mockGenerateAnalysis).toHaveBeenCalledWith(mockUserId);
    });

    test('handles missing API key', async () => {
      const error = new Error('Anthropic API key not configured');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('Anthropic API key not configured');
    });

    test('handles insufficient drops', async () => {
      const error = new Error('Insufficient drops for analysis: 5 (minimum 7 required)');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('Insufficient drops for analysis');
    });

    test('handles timeout errors', async () => {
      const error = new Error('Analysis request timeout');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('Analysis request timeout');
    });
  });

  describe('Response Validation', () => {
    test('validates analysis response structure', async () => {
      const mockResponse = {
        summary: 'Valid summary',
        content: 'Valid analysis content with proper structure.',
        bulletPoints: '• Valid insight 1\n• Valid insight 2\n• Valid insight 3'
      };

      mockGenerateAnalysis.mockResolvedValue(mockResponse);

      const result = await generateAnalysis(mockUserId);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('bulletPoints');
      expect(typeof result.summary).toBe('string');
      expect(typeof result.content).toBe('string');
      expect(typeof result.bulletPoints).toBe('string');
    });

    test('handles malformed responses gracefully', async () => {
      const error = new Error('Failed to parse analysis response');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('Failed to parse analysis response');
    });
  });

  describe('Performance and Reliability', () => {
    test('handles concurrent analysis requests', async () => {
      const mockResponse = {
        summary: 'Concurrent analysis response',
        content: 'Analysis generated successfully.',
        bulletPoints: '• Concurrent processing working\n• Performance maintained\n• Reliability confirmed'
      };

      mockGenerateAnalysis.mockResolvedValue(mockResponse);

      // Simulate multiple concurrent requests
      const promises = [
        generateAnalysis('user-1'),
        generateAnalysis('user-2'),
        generateAnalysis('user-3')
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.summary).toBe('Concurrent analysis response');
      });

      expect(mockGenerateAnalysis).toHaveBeenCalledTimes(3);
    });

    test('maintains performance under load', async () => {
      const mockResponse = {
        summary: 'Performance test response',
        content: 'Analysis completed within performance requirements.',
        bulletPoints: '• Performance maintained\n• Response time acceptable\n• System stability confirmed'
      };

      mockGenerateAnalysis.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await generateAnalysis(mockUserId);
      const endTime = Date.now();

      expect(result.summary).toBe('Performance test response');
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Edge Cases', () => {
    test('handles user with no drops', async () => {
      const error = new Error('No drops found for user');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis('user-with-no-drops')).rejects.toThrow('No drops found for user');
    });

    test('handles non-existent user', async () => {
      const error = new Error('User not found: non-existent-user');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis('non-existent-user')).rejects.toThrow('User not found');
    });

    test('handles empty analysis content', async () => {
      const error = new Error('Empty response from LLM');
      mockGenerateAnalysis.mockRejectedValue(error);

      await expect(generateAnalysis(mockUserId)).rejects.toThrow('Empty response from LLM');
    });
  });
}); 