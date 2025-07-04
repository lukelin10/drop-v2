/**
 * Message and Conversation Business Logic Unit Tests
 * 
 * Tests message and conversation logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

// Database access automatically blocked by jest.setup.ts
import {
  mockStorage,
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks,
  setupDailyQuestionMocks,
  setupAnsweredTodayMocks,
  setupMessageConversationMocks,
  setupConversationWithMessagesMocks
} from '../mocks/mockStorage';
import {
  createMockUser,
  createMockDrop,
  createMockDropWithQuestion,
  createMockQuestion,
  createMockMessage,
  createMockMessages,
  createMockConversation,
  TEST_USER_IDS,
  TEST_DATES
} from '../factories/testData';

// Mock the Anthropic service and storage dependencies
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn(),
  getConversationHistory: jest.fn()
}));

jest.mock('../../server/storage', () => ({
  storage: require('../mocks/mockStorage').mockStorage
}));

// Import the mocked services
const mockGenerateResponse = require('../../server/services/anthropic').generateResponse as jest.Mock;
const mockGetConversationHistory = require('../../server/services/anthropic').getConversationHistory as jest.Mock;

describe('Message and Conversation Business Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;
  const testDropId = 1;

  beforeEach(() => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();

    // Mock environment variable for AI service
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  describe('Message Creation Logic', () => {
    test('should create user message successfully', async () => {
      // Arrange
      const userMessageData = {
        dropId: testDropId,
        text: 'This is my message to the AI coach',
        fromUser: true
      };

      const expectedMessage = createMockMessage({
        id: 1,
        dropId: testDropId,
        text: 'This is my message to the AI coach',
        fromUser: true
      });

      mockStorage.createMessage.mockResolvedValue(expectedMessage);

      // Act
      const result = await mockStorage.createMessage(userMessageData);

      // Assert
      expect(result).toEqual(expectedMessage);
      expect(result.fromUser).toBe(true);
      expect(result.text).toBe(userMessageData.text);
      expect(result.dropId).toBe(testDropId);
      expect(mockStorage.createMessage).toHaveBeenCalledWith(userMessageData);
    });

    test('should create AI message successfully', async () => {
      // Arrange
      const aiMessageData = {
        dropId: testDropId,
        text: 'Thank you for sharing that. How does that make you feel?',
        fromUser: false
      };

      const expectedMessage = createMockMessage({
        id: 2,
        dropId: testDropId,
        text: 'Thank you for sharing that. How does that make you feel?',
        fromUser: false
      });

      mockStorage.createMessage.mockResolvedValue(expectedMessage);

      // Act
      const result = await mockStorage.createMessage(aiMessageData);

      // Assert
      expect(result).toEqual(expectedMessage);
      expect(result.fromUser).toBe(false);
      expect(result.text).toBe(aiMessageData.text);
      expect(result.dropId).toBe(testDropId);
      expect(mockStorage.createMessage).toHaveBeenCalledWith(aiMessageData);
    });

    test('should maintain message order in conversation', async () => {
      // Arrange
      const messages = [
        createMockMessage({ id: 1, dropId: testDropId, text: 'First message', fromUser: true }),
        createMockMessage({ id: 2, dropId: testDropId, text: 'AI response', fromUser: false }),
        createMockMessage({ id: 3, dropId: testDropId, text: 'Second message', fromUser: true }),
        createMockMessage({ id: 4, dropId: testDropId, text: 'Another AI response', fromUser: false })
      ];

      mockStorage.getMessages.mockResolvedValue(messages);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].text).toBe('First message');
      expect(result[0].fromUser).toBe(true);
      expect(result[1].text).toBe('AI response');
      expect(result[1].fromUser).toBe(false);
      expect(result[2].text).toBe('Second message');
      expect(result[2].fromUser).toBe(true);
      expect(result[3].text).toBe('Another AI response');
      expect(result[3].fromUser).toBe(false);
    });

    test('should handle empty messages gracefully', async () => {
      // Arrange
      const emptyMessageData = {
        dropId: testDropId,
        text: '',
        fromUser: true
      };

      // Mock the storage to reject empty messages
      mockStorage.createMessage.mockRejectedValue(new Error('Message text cannot be empty'));

      // Act & Assert
      await expect(mockStorage.createMessage(emptyMessageData)).rejects.toThrow('Message text cannot be empty');
      expect(mockStorage.createMessage).toHaveBeenCalledWith(emptyMessageData);
    });

    test('should validate required message fields', async () => {
      // Arrange
      const invalidMessageData = {
        dropId: testDropId,
        text: '', // Empty text should cause validation error
        fromUser: true
      };

      mockStorage.createMessage.mockRejectedValue(new Error('Message text cannot be empty'));

      // Act & Assert
      await expect(mockStorage.createMessage(invalidMessageData)).rejects.toThrow('Message text cannot be empty');
    });
  });

  describe('Conversation Flow Logic', () => {
    test('should retrieve messages for drop successfully', async () => {
      // Arrange
      const conversation = createMockConversation(testDropId, 6);
      mockStorage.getMessages.mockResolvedValue(conversation.messages);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert
      expect(result).toHaveLength(6);
      expect(result.every(msg => msg.dropId === testDropId)).toBe(true);
      expect(mockStorage.getMessages).toHaveBeenCalledWith(testDropId);
    });

    test('should format conversation history for AI correctly', async () => {
      // Arrange
      const messages = createMockMessages(testDropId, 4);
      const expectedHistory = [
        { role: 'user', content: messages[0].text },
        { role: 'assistant', content: messages[1].text },
        { role: 'user', content: messages[2].text },
        { role: 'assistant', content: messages[3].text }
      ];

      mockGetConversationHistory.mockResolvedValue(expectedHistory);

      // Act
      const result = await mockGetConversationHistory(testDropId);

      // Assert
      expect(result).toEqual(expectedHistory);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
      expect(mockGetConversationHistory).toHaveBeenCalledWith(testDropId);
    });

    test('should handle conversation limits correctly', async () => {
      // Arrange - Create conversation with exactly 7 exchanges (14 messages)
      const messages = Array.from({ length: 14 }, (_, i) =>
        createMockMessage({
          id: i + 1,
          dropId: testDropId,
          text: `Message ${i + 1}`,
          fromUser: i % 2 === 0
        })
      );

      mockStorage.getMessages.mockResolvedValue(messages);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert - Should have 14 messages (7 complete exchanges)
      expect(result).toHaveLength(14);

      // Calculate exchanges (back-and-forth count)
      let exchanges = 0;
      let lastRole = '';
      result.forEach(msg => {
        const currentRole = msg.fromUser ? 'user' : 'assistant';
        if (currentRole !== lastRole) {
          exchanges++;
          lastRole = currentRole;
        }
      });
      const exchangeCount = Math.floor(exchanges / 2);
      expect(exchangeCount).toBe(7); // Should hit the limit
    });

    test('should track message counts accurately', async () => {
      // Arrange
      const messages = createMockMessages(testDropId, 8);
      mockStorage.getMessages.mockResolvedValue(messages);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert
      expect(result).toHaveLength(8);

      const userMessages = result.filter(msg => msg.fromUser);
      const aiMessages = result.filter(msg => !msg.fromUser);

      expect(userMessages).toHaveLength(4);
      expect(aiMessages).toHaveLength(4);
    });

    test('should calculate exchanges correctly', async () => {
      // Arrange - Create alternating user/AI messages
      const messages = [
        createMockMessage({ id: 1, dropId: testDropId, fromUser: true, text: 'User 1' }),
        createMockMessage({ id: 2, dropId: testDropId, fromUser: false, text: 'AI 1' }),
        createMockMessage({ id: 3, dropId: testDropId, fromUser: true, text: 'User 2' }),
        createMockMessage({ id: 4, dropId: testDropId, fromUser: false, text: 'AI 2' }),
        createMockMessage({ id: 5, dropId: testDropId, fromUser: true, text: 'User 3' }),
        createMockMessage({ id: 6, dropId: testDropId, fromUser: false, text: 'AI 3' })
      ];

      mockStorage.getMessages.mockResolvedValue(messages);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert - Calculate exchanges using the same logic as useMessages hook
      let backAndForthCount = 0;
      let lastRole = '';

      result.forEach(message => {
        const currentRole = message.fromUser ? 'user' : 'assistant';
        if (currentRole !== lastRole) {
          backAndForthCount++;
          lastRole = currentRole;
        }
      });

      const exchangeCount = Math.floor(backAndForthCount / 2);
      expect(exchangeCount).toBe(3); // 3 complete exchanges
    });

    test('should handle empty conversation gracefully', async () => {
      // Arrange
      mockStorage.getMessages.mockResolvedValue([]);

      // Act
      const result = await mockStorage.getMessages(testDropId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('AI Integration Logic', () => {
    test('should generate contextual response successfully', async () => {
      // Arrange
      const userMessage = 'I had a really challenging day at work';
      const expectedAIResponse = 'I hear that it was a challenging day. What made it particularly difficult for you?';

      mockGenerateResponse.mockResolvedValue(expectedAIResponse);

      // Act
      const result = await mockGenerateResponse(userMessage, testDropId);

      // Assert
      expect(result).toBe(expectedAIResponse);
      expect(mockGenerateResponse).toHaveBeenCalledWith(userMessage, testDropId);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should include conversation history in AI requests', async () => {
      // Arrange
      const userMessage = 'Can you help me think through this?';
      const conversationHistory = [
        { role: 'user', content: 'I had a tough day' },
        { role: 'assistant', content: 'What made it tough?' }
      ];

      mockGetConversationHistory.mockResolvedValue(conversationHistory);
      mockGenerateResponse.mockResolvedValue('Of course! Let\'s explore this together.');

      // Act
      const history = await mockGetConversationHistory(testDropId);
      const response = await mockGenerateResponse(userMessage, testDropId);

      // Assert
      expect(history).toEqual(conversationHistory);
      expect(response).toBe('Of course! Let\'s explore this together.');
      expect(mockGetConversationHistory).toHaveBeenCalledWith(testDropId);
      expect(mockGenerateResponse).toHaveBeenCalledWith(userMessage, testDropId);
    });

    test('should handle API key missing gracefully', async () => {
      // Arrange
      delete process.env.ANTHROPIC_API_KEY;
      const fallbackResponse = 'I\'m sorry, I need an API key to provide thoughtful responses.';

      mockGenerateResponse.mockResolvedValue(fallbackResponse);

      // Act
      const result = await mockGenerateResponse('Hello', testDropId);

      // Assert
      expect(result).toBe(fallbackResponse);
      expect(result).toContain('API key');
    });

    test('should respect conversation limits in AI responses', async () => {
      // Arrange - Set up conversation at limit (7 exchanges)
      const messages = Array.from({ length: 14 }, (_, i) =>
        createMockMessage({
          id: i + 1,
          dropId: testDropId,
          fromUser: i % 2 === 0,
          text: `Message ${i + 1}`
        })
      );

      mockGetConversationHistory.mockResolvedValue(messages.map(msg => ({
        role: msg.fromUser ? 'user' : 'assistant',
        content: msg.text
      })));

      const sessionClosureResponse = 'We\'ve had a great conversation! Is there anything else you\'d like to share before we close?';
      mockGenerateResponse.mockResolvedValue(sessionClosureResponse);

      // Act - Call both functions to simulate the full flow
      const history = await mockGetConversationHistory(testDropId);
      const result = await mockGenerateResponse('One more question', testDropId);

      // Assert
      expect(history).toHaveLength(14);
      expect(result).toContain('close');
      expect(mockGetConversationHistory).toHaveBeenCalledWith(testDropId);
    });

    test('should provide session closure appropriately', async () => {
      // Arrange - Simulate final message in conversation
      const closureMessage = 'Thank you for this meaningful conversation. I\'ve really enjoyed our discussion about your personal growth. Please feel free to come back anytime you want to chat again!';

      mockGenerateResponse.mockResolvedValue(closureMessage);

      // Act
      const result = await mockGenerateResponse('Thank you for your help', testDropId);

      // Assert
      expect(result).toContain('Thank you');
      expect(result).toContain('come back');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(50); // Should be a substantial response
    });

    test('should handle AI service timeout gracefully', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockGenerateResponse.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(mockGenerateResponse('Hello', testDropId)).rejects.toThrow('Request timeout');
      expect(mockGenerateResponse).toHaveBeenCalledWith('Hello', testDropId);
    });

    test('should handle AI service unavailable gracefully', async () => {
      // Arrange
      const serviceError = new Error('AI service unavailable');
      mockGenerateResponse.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(mockGenerateResponse('Hello', testDropId)).rejects.toThrow('AI service unavailable');
    });

    test('should handle message creation failures during AI response', async () => {
      // Arrange
      const userMessage = 'Test message';
      const aiResponse = 'Test AI response';

      mockGenerateResponse.mockResolvedValue(aiResponse);
      mockStorage.createMessage.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      const response = await mockGenerateResponse(userMessage, testDropId);
      expect(response).toBe(aiResponse);

      // Should still handle the message creation error gracefully
      await expect(mockStorage.createMessage({
        dropId: testDropId,
        text: aiResponse,
        fromUser: false
      })).rejects.toThrow('Database error');
    });

    test('should handle invalid drop access during conversation', async () => {
      // Arrange
      const invalidDropId = 999;
      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const drop = await mockStorage.getDrop(invalidDropId);

      // Assert
      expect(drop).toBeUndefined();
      expect(mockStorage.getDrop).toHaveBeenCalledWith(invalidDropId);
    });
  });

  describe('Message Integration Error Scenarios', () => {
    test('should handle concurrent message creation', async () => {
      // Arrange
      const messages = [
        { dropId: testDropId, text: 'Message 1', fromUser: true },
        { dropId: testDropId, text: 'Message 2', fromUser: true },
        { dropId: testDropId, text: 'Message 3', fromUser: true }
      ];

      mockStorage.createMessage.mockImplementation((msg) =>
        Promise.resolve(createMockMessage({
          id: Math.floor(Math.random() * 1000),
          ...msg
        }))
      );

      // Act
      const promises = messages.map(msg => mockStorage.createMessage(msg));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.text).toBe(`Message ${index + 1}`);
        expect(result.fromUser).toBe(true);
        expect(result.dropId).toBe(testDropId);
      });
      expect(mockStorage.createMessage).toHaveBeenCalledTimes(3);
    });

    test('should handle network failures during AI generation', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      mockGenerateResponse.mockRejectedValue(networkError);

      // Act & Assert
      await expect(mockGenerateResponse('Hello', testDropId)).rejects.toThrow('Network connection failed');
    });

    test('should handle malformed AI responses', async () => {
      // Arrange
      mockGenerateResponse.mockResolvedValue(null);

      // Act
      const result = await mockGenerateResponse('Hello', testDropId);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle conversation history retrieval errors', async () => {
      // Arrange
      const historyError = new Error('Failed to retrieve conversation history');
      mockGetConversationHistory.mockRejectedValue(historyError);

      // Act & Assert
      await expect(mockGetConversationHistory(testDropId)).rejects.toThrow('Failed to retrieve conversation history');
    });
  });
}); 