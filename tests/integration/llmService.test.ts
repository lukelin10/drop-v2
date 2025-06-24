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

import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { generateAnalysis } from '../../server/services/analysisLLM';
import type { DropWithQuestion } from '../../shared/schema';

// Mock the anthropic module
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

// Mock fetch for rate limiting tests
global.fetch = vi.fn();

describe('LLM Service Integration Tests', () => {
  const mockDrops: DropWithQuestion[] = [
    {
      id: 1,
      userId: 'test-user',
      questionId: 1,
      text: 'Today I reflected on my goals and feel motivated to make progress.',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      messageCount: 3,
      questionText: 'What are your reflections for today?'
    },
    {
      id: 2,
      userId: 'test-user',
      questionId: 2,
      text: 'I struggled with anxiety but used breathing exercises to cope.',
      createdAt: new Date('2024-01-02T10:00:00Z'),
      messageCount: 5,
      questionText: 'How did you handle challenges today?'
    },
    {
      id: 3,
      userId: 'test-user',
      questionId: 3,
      text: 'Practiced gratitude and noticed positive changes in my mindset.',
      createdAt: new Date('2024-01-03T10:00:00Z'),
      messageCount: 2,
      questionText: 'What are you grateful for?'
    },
    {
      id: 4,
      userId: 'test-user',
      questionId: 4,
      text: 'Connected with friends and felt more socially fulfilled.',
      createdAt: new Date('2024-01-04T10:00:00Z'),
      messageCount: 4,
      questionText: 'How were your relationships today?'
    },
    {
      id: 5,
      userId: 'test-user',
      questionId: 5,
      text: 'Exercised regularly and noticed improved energy levels.',
      createdAt: new Date('2024-01-05T10:00:00Z'),
      messageCount: 1,
      questionText: 'How did you take care of your physical health?'
    },
    {
      id: 6,
      userId: 'test-user',
      questionId: 6,
      text: 'Learned something new about mindfulness through meditation.',
      createdAt: new Date('2024-01-06T10:00:00Z'),
      messageCount: 3,
      questionText: 'What did you learn today?'
    },
    {
      id: 7,
      userId: 'test-user',
      questionId: 7,
      text: 'Reflected on personal growth and set intentions for tomorrow.',
      createdAt: new Date('2024-01-07T10:00:00Z'),
      messageCount: 2,
      questionText: 'How are you growing as a person?'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up API key
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Analysis Generation', () => {
    test('generates analysis with valid LLM response', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Growing mindfulness and emotional resilience through daily practice

**Analysis:**

Your journal entries reveal a remarkable journey of emotional growth and self-awareness over the past week. The progression from initial goal-setting to implementing coping strategies demonstrates genuine commitment to personal development.

The consistent practice of mindfulness techniques, particularly breathing exercises and meditation, shows you're building essential emotional regulation skills. Your ability to transform anxiety into actionable coping strategies indicates developing resilience and emotional intelligence.

Your growing awareness of gratitude and social connections suggests a holistic approach to wellbeing. The integration of physical health through exercise with mental health practices creates a strong foundation for sustained personal growth.

**Key Insights:**
• Developing strong emotional regulation through mindfulness practices
• Building resilience by transforming challenges into growth opportunities  
• Cultivating gratitude as a foundation for positive mindset shifts
• Strengthening social connections for emotional fulfillment
• Integrating physical and mental health for holistic wellbeing`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const result = await generateAnalysis(mockDrops);

      expect(result).toEqual({
        summary: 'Growing mindfulness and emotional resilience through daily practice',
        content: expect.stringContaining('Your journal entries reveal a remarkable journey'),
        bulletPoints: expect.stringContaining('• Developing strong emotional regulation')
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.3,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Today I reflected on my goals')
          })
        ])
      });
    });

    test('parses complex analysis with multiple sections', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Complex emotional growth with multiple insights

**Analysis:**

First paragraph discussing initial observations and patterns.

Second paragraph diving deeper into emotional development and coping strategies.

Third paragraph exploring future growth opportunities and actionable insights.

**Key Insights:**
• First insight about emotional patterns
• Second insight about growth strategies  
• Third insight about relationship building
• Fourth insight about mindfulness practice
• Fifth insight about goal achievement`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const result = await generateAnalysis(mockDrops);

      expect(result.summary).toBe('Complex emotional growth with multiple insights');
      expect(result.content).toContain('First paragraph discussing');
      expect(result.content).toContain('Second paragraph diving');
      expect(result.content).toContain('Third paragraph exploring');
      expect(result.bulletPoints).toContain('• First insight about emotional patterns');
      expect(result.bulletPoints).toContain('• Fifth insight about goal achievement');
    });

    test('handles edge case formatting variations', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `Summary: Simple format without asterisks

Analysis:
Single paragraph analysis without formatting variations.

Key Insights:
- Using dashes instead of bullets
- Another insight with dash formatting
- Final insight to test parsing`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const result = await generateAnalysis(mockDrops);

      expect(result.summary).toBe('Simple format without asterisks');
      expect(result.content).toBe('Single paragraph analysis without formatting variations.');
      expect(result.bulletPoints).toContain('- Using dashes instead of bullets');
    });
  });

  describe('Retry Logic and Error Handling', () => {
    test('retries on temporary failures with exponential backoff', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary API error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValueOnce({
          content: [{
            text: `**Summary:** Successful after retries

**Analysis:**
Analysis generated successfully after retry attempts.

**Key Insights:**
• Retry logic working correctly`
          }]
        });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const startTime = Date.now();
      const result = await generateAnalysis(mockDrops);
      const endTime = Date.now();

      expect(result.summary).toBe('Successful after retries');
      expect(mockCreate).toHaveBeenCalledTimes(3);
      
      // Should have delays due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(3000); // At least 1s + 2s delays
    });

    test('fails after maximum retry attempts', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockRejectedValue(new Error('Persistent API error'));

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Failed to generate analysis after 2 retries');
      expect(mockCreate).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('does not retry on non-retryable errors', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockRejectedValue(new Error('Invalid API key'));

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Invalid API key');
      expect(mockCreate).toHaveBeenCalledTimes(1); // No retries for auth errors
    });

    test('handles timeout errors appropriately', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockImplementation(() => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        ));

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Request timeout');
    });
  });

  describe('Rate Limiting and API Management', () => {
    test('respects rate limits and queues requests', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Rate limited response

**Analysis:**
Response within rate limits.

**Key Insights:**
• Rate limiting respected`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      // Simulate multiple concurrent requests
      const promises = [
        generateAnalysis(mockDrops.slice(0, 7)),
        generateAnalysis(mockDrops.slice(0, 7)),
        generateAnalysis(mockDrops.slice(0, 7))
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.summary).toBe('Rate limited response');
      });

      // Should have proper spacing between calls due to rate limiting
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    test('handles rate limit exceeded errors', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockRejectedValueOnce({ 
          status: 429, 
          error: { message: 'Rate limit exceeded' }
        })
        .mockResolvedValueOnce({
          content: [{
            text: `**Summary:** Success after rate limit

**Analysis:**
Generated after rate limit reset.

**Key Insights:**
• Rate limit recovery working`
          }]
        });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const result = await generateAnalysis(mockDrops);
      
      expect(result.summary).toBe('Success after rate limit');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Parsing and Validation', () => {
    test('handles malformed responses gracefully', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: 'Invalid response without proper formatting'
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Failed to parse analysis response');
    });

    test('validates required sections are present', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Only summary provided

**Key Insights:**
• Missing analysis section`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Analysis section is required');
    });

    test('validates summary length constraints', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** This is an extremely long summary that exceeds the fifteen word limit and should be rejected by validation

**Analysis:**
Valid analysis content.

**Key Insights:**
• Valid insight`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Summary must be 15 words or less');
    });

    test('validates bullet points format and count', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Valid summary

**Analysis:**
Valid analysis content.

**Key Insights:**
Only one insight without proper bullet formatting`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Must have 3-5 bullet points');
    });

    test('handles empty or null responses', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: []
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Empty response from LLM');
    });
  });

  describe('Drop Data Processing', () => {
    test('handles insufficient drop data', async () => {
      const insufficientDrops = mockDrops.slice(0, 5); // Only 5 drops

      await expect(generateAnalysis(insufficientDrops)).rejects.toThrow('Need at least 7 drops for analysis');
    });

    test('processes drops with missing or empty text', async () => {
      const dropsWithEmptyText = [
        ...mockDrops.slice(0, 6),
        {
          ...mockDrops[6],
          text: '' // Empty text
        }
      ];

      await expect(generateAnalysis(dropsWithEmptyText)).rejects.toThrow('All drops must have valid text content');
    });

    test('handles very long drop content appropriately', async () => {
      const longText = 'A'.repeat(10000); // Very long text
      const dropsWithLongText = [
        ...mockDrops.slice(0, 6),
        {
          ...mockDrops[6],
          text: longText
        }
      ];

      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Analysis with long content

**Analysis:**
Successfully processed long content.

**Key Insights:**
• Long content handled appropriately
• Truncation applied when necessary
• Analysis remains coherent`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const result = await generateAnalysis(dropsWithLongText);
      expect(result.summary).toBe('Analysis with long content');

      // Verify that the API call was made with appropriately sized content
      const apiCall = mockCreate.mock.calls[0][0];
      expect(apiCall.messages[0].content.length).toBeLessThan(15000); // Should be truncated
    });

    test('preserves chronological order in analysis', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Chronological analysis

**Analysis:**
Analysis respecting time order.

**Key Insights:**
• Timeline preserved correctly`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await generateAnalysis(mockDrops);

      const apiCall = mockCreate.mock.calls[0][0];
      const content = apiCall.messages[0].content;
      
      // Verify drops appear in chronological order
      expect(content.indexOf('January 1')).toBeLessThan(content.indexOf('January 7'));
    });
  });

  describe('Environment and Configuration', () => {
    test('fails gracefully when API key is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Anthropic API key is required');
    });

    test('uses correct model and parameters', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Model test

**Analysis:**
Testing model configuration.

**Key Insights:**
• Model configured correctly`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await generateAnalysis(mockDrops);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1500,
        temperature: 0.3,
        messages: expect.any(Array)
      });
    });

    test('handles network connectivity issues', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn()
        .mockRejectedValue(new Error('Network error: ECONNRESET'));

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await expect(generateAnalysis(mockDrops)).rejects.toThrow('Network error');
    });
  });

  describe('Performance and Monitoring', () => {
    test('completes analysis within reasonable time limits', async () => {
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Performance test

**Analysis:**
Analysis completed quickly.

**Key Insights:**
• Performance within limits`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      const startTime = Date.now();
      await generateAnalysis(mockDrops);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('logs appropriate metrics and events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockAnthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{
          text: `**Summary:** Logging test

**Analysis:**
Analysis with logging.

**Key Insights:**
• Logging working correctly`
        }]
      });

      mockAnthropic.mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }));

      await generateAnalysis(mockDrops);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Generating analysis for 7 drops')
      );

      consoleSpy.mockRestore();
    });
  });
}); 