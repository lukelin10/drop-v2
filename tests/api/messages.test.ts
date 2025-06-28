/**
 * Messages API Endpoint Tests
 * 
 * Tests the messages API endpoints without database connections.
 * Uses mocked storage and services to ensure fast, isolated testing.
 * 
 * NOTE: This used to test against real database operations.
 * Now it tests API behavior with mocked dependencies.
 */

import { enableMocksForAPITests, getTestApp } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import express from 'express';
import type { Express } from 'express';

import { 
  mockStorage, 
  resetStorageMocks,
  setupEligibleUserMocks 
} from '../mocks/mockStorage';
import { 
  createMockUser, 
  createMockDrop,
  createMockDropWithQuestion,
  createMockMessage,
  createMockQuestion,
  TEST_USER_IDS 
} from '../factories/testData';

// Mock dependencies before importing routes
jest.mock('../../server/replitAuth', () => ({
  isAuthenticated: jest.fn(),
  setupAuth: jest.fn(async () => {
    return;
  })
}));

// Mock the Claude API response
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockImplementation(async (userMessage, dropId) => {
    return `Test AI response to: ${userMessage}`;
  }),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

// Mock storage service
jest.mock('../../server/storage', () => ({
  storage: mockStorage
}));

// Import after mocking
import { registerRoutes } from '../../server/routes';

const mockGenerateResponse = require('../../server/services/anthropic').generateResponse as jest.Mock;

describe('Messages API Endpoint Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  let authToken: string;
  let app: Express;
  let testDropId: number;
  let testQuestionId: number;

  beforeEach(async () => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();
    
    // Reset AI service mock to default success behavior
    mockGenerateResponse.mockReset();
    mockGenerateResponse.mockResolvedValue('Default test AI response');

    // Create test data
    testQuestionId = 1;
    testDropId = 1;

    // Mock authentication token
    authToken = `Bearer mock-token-${testUserId}`;

    // Configure the authentication mock for this test
    const mockAuth = require('../../server/replitAuth').isAuthenticated as jest.Mock;
    mockAuth.mockImplementation((req: any, res: any, next: any) => {
      const token = req.headers.authorization;
      if (token === authToken) {
        req.user = { claims: { sub: testUserId } };
        next();
      } else {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    });

    // Setup basic mocks
    const mockDrop = createMockDropWithQuestion({
      id: testDropId,
      userId: testUserId,
      questionId: testQuestionId,
      text: 'Test drop for messages'
    });

    mockStorage.getDrop.mockResolvedValue(mockDrop);

    // Create fresh app instance with the configured auth
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    
    // Wait a bit to ensure any async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('POST /api/messages', () => {
    test('should create a user message', async () => {
      // Arrange
      const newMessage = {
        dropId: testDropId,
        text: 'Test user message',
        fromUser: true
      };

      const createdMessage = createMockMessage({
        id: 1,
        dropId: testDropId,
        text: 'Test user message',
        fromUser: true
      });

      mockStorage.createMessage.mockResolvedValue(createdMessage);

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(newMessage)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: 1,
        text: 'Test user message',
        dropId: testDropId,
        fromUser: true
      });

      expect(mockStorage.getDrop).toHaveBeenCalledWith(testDropId);
      expect(mockStorage.createMessage).toHaveBeenCalledWith(newMessage);
    });

    test('should return 404 for non-existent drop', async () => {
      // Arrange
      const nonExistentMessage = {
        dropId: 9999, // Non-existent ID
        text: 'Test message',
        fromUser: true
      };

      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(nonExistentMessage)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(mockStorage.getDrop).toHaveBeenCalledWith(9999);
      expect(mockStorage.createMessage).not.toHaveBeenCalled();
    });

    test('should return 400 for invalid data', async () => {
      // Arrange
      const invalidMessage = {
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(invalidMessage)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(mockStorage.createMessage).not.toHaveBeenCalled();
    });

    test('should handle user message and trigger AI response asynchronously', async () => {
      // Set ANTHROPIC_API_KEY to ensure AI path is taken
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      
      try {
        // Clear all mock calls from previous tests
        jest.clearAllMocks();
        resetStorageMocks();
        
        // Arrange
        const userMessage = {
          dropId: testDropId,
          text: 'Hello AI assistant',
          fromUser: true
        };

        const createdUserMessage = createMockMessage({
          id: 1,
          dropId: testDropId,
          text: 'Hello AI assistant',
          fromUser: true
        });

        // Setup storage mocks
        mockStorage.createMessage.mockResolvedValue(createdUserMessage);
        
        // Ensure the drop exists for the async AI call
        mockStorage.getDrop.mockResolvedValue(createMockDropWithQuestion({
          id: testDropId,
          userId: testUserId,
          questionId: testQuestionId,
          text: 'Test drop'
        }));

        // Setup AI service mock - ensure it's clean and properly configured
        mockGenerateResponse.mockReset();
        mockGenerateResponse.mockResolvedValue('Test AI response to: Hello AI assistant');

        // Act
        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', authToken)
          .send(userMessage)
          .expect(201);

        // Assert - User message created immediately
        expect(response.body).toMatchObject({
          id: 1,
          text: 'Hello AI assistant',
          dropId: testDropId,
          fromUser: true
        });

        expect(mockStorage.createMessage).toHaveBeenCalledWith(userMessage);

        // Wait for AI response to be generated asynchronously (1500ms delay + processing time)
        await new Promise(resolve => setTimeout(resolve, 3000));

                 // Verify AI service was called
         expect(mockGenerateResponse).toHaveBeenCalledWith('Hello AI assistant', testDropId);
         
         // Verify AI response message was created (should include user message + AI response)
         expect(mockStorage.createMessage).toHaveBeenCalledWith(
           expect.objectContaining({
             dropId: testDropId,
             text: 'Test AI response to: Hello AI assistant',
             fromUser: false
           })
         );
         
         // Verify at least 2 calls were made (user message + AI response)
         expect(mockStorage.createMessage).toHaveBeenCalledWith(userMessage);
         expect(mockStorage.createMessage.mock.calls.length).toBeGreaterThanOrEqual(2);
      } finally {
        // Restore original API key
        if (originalApiKey) {
          process.env.ANTHROPIC_API_KEY = originalApiKey;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });

    test('should handle AI service errors gracefully', async () => {
      // Set ANTHROPIC_API_KEY to ensure AI path is taken
      const originalApiKey = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      
      try {
        // Arrange
        const userMessage = {
          dropId: testDropId,
          text: 'Hello AI assistant',
          fromUser: true
        };

        const createdUserMessage = createMockMessage({
          id: 1,
          dropId: testDropId,
          text: 'Hello AI assistant',
          fromUser: true
        });

        // Setup storage mocks
        mockStorage.createMessage.mockResolvedValue(createdUserMessage);
        
        // Ensure the drop exists for the async AI call
        mockStorage.getDrop.mockResolvedValue(createMockDropWithQuestion({
          id: testDropId,
          userId: testUserId,
          questionId: testQuestionId,
          text: 'Test drop'
        }));
        
        // Setup AI service to throw an error
        mockGenerateResponse.mockRejectedValue(new Error('AI service unavailable'));

        // Act
        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', authToken)
          .send(userMessage)
          .expect(201);

        // Assert - User message still created successfully
        expect(response.body).toMatchObject({
          text: 'Hello AI assistant',
          fromUser: true
        });

        // Wait for AI response handling (1500ms delay + processing time)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Verify AI service was called but failed
        expect(mockGenerateResponse).toHaveBeenCalledWith('Hello AI assistant', testDropId);

        // Verify fallback response was created
        expect(mockStorage.createMessage).toHaveBeenCalledTimes(2);
        
        const fallbackCall = mockStorage.createMessage.mock.calls[1][0];
        expect(fallbackCall.text).toContain('trouble processing');
        expect(fallbackCall.fromUser).toBe(false);
      } finally {
        // Restore original API key
        if (originalApiKey) {
          process.env.ANTHROPIC_API_KEY = originalApiKey;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });

    test('should validate message content', async () => {
      // Arrange
      const emptyMessage = {
        dropId: testDropId,
        text: '', // Empty text
        fromUser: true
      };

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(emptyMessage)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(mockStorage.createMessage).not.toHaveBeenCalled();
    });

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

      // Act - Send concurrent requests
      const promises = messages.map(msg => 
        request(app)
          .post('/api/messages')
          .set('Authorization', authToken)
          .send(msg)
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.fromUser).toBe(true);
      });

      expect(mockStorage.createMessage).toHaveBeenCalledTimes(3);
    });

    test('should handle drop ownership validation', async () => {
      // Arrange - Drop belongs to different user
      const otherUserDrop = createMockDropWithQuestion({
        id: testDropId,
        userId: TEST_USER_IDS.USER_2, // Different user
        questionId: testQuestionId
      });

      mockStorage.getDrop.mockResolvedValue(otherUserDrop);

      const message = {
        dropId: testDropId,
        text: 'Test message',
        fromUser: true
      };

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(message)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access denied');
      expect(mockStorage.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle storage service downtime', async () => {
      // Arrange
      mockStorage.getDrop.mockRejectedValue(new Error('Storage service unavailable'));

      const message = {
        dropId: testDropId,
        text: 'Test message',
        fromUser: true
      };

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(message)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to create message');
    });

    test('should handle malformed dropId', async () => {
      // Arrange
      const invalidMessage = {
        dropId: 'invalid-id',
        text: 'Test message',
        fromUser: true
      };

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(invalidMessage)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
    });

    test('should handle very long message text', async () => {
      // Arrange
      const longMessage = {
        dropId: testDropId,
        text: 'A'.repeat(10000), // Very long text
        fromUser: true
      };

      const createdMessage = createMockMessage({
        id: 1,
        ...longMessage
      });

      mockStorage.createMessage.mockResolvedValue(createdMessage);

      // Act
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', authToken)
        .send(longMessage)
        .expect(201);

      // Assert
      expect(response.body.text).toHaveLength(10000);
      expect(mockStorage.createMessage).toHaveBeenCalledWith(longMessage);
    });
  });
});