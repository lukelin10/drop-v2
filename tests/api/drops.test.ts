/**
 * Drops API Endpoint Tests
 * 
 * Tests the drops API endpoints without database connections.
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

// Mock anthropic service before importing routes
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

describe('Drops API Endpoint Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  let authToken: string;
  let app: Express;
  let testQuestionId: number;

  beforeEach(async () => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();

    // Create test data
    testQuestionId = 1;

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

    // Create fresh app instance with the configured auth
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/drops', () => {
    test('should return empty array when no drops exist', async () => {
      // Arrange
      mockStorage.getUserDrops.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/drops')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should return user drops', async () => {
      // Arrange
      const mockDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          questionId: testQuestionId,
          text: 'First drop'
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          questionId: testQuestionId,
          text: 'Second drop'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(mockDrops);

      // Act
      const response = await request(app)
        .get('/api/drops')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].text).toBe('First drop');
      expect(response.body[1].text).toBe('Second drop');
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .get('/api/drops')
        .expect(401);

      expect(mockStorage.getUserDrops).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/drops', () => {
    test('should create a new drop', async () => {
      // Arrange
      const newDrop = {
        questionId: testQuestionId,
        text: 'Test drop content'
      };

      const createdDrop = createMockDropWithQuestion({
        id: 1,
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Test drop content'
      });

      mockStorage.createDrop.mockResolvedValue(createdDrop);
      mockStorage.getQuestions.mockResolvedValue([
        createMockQuestion({ id: testQuestionId, text: 'Test question' })
      ]);

      // Act
      const response = await request(app)
        .post('/api/drops')
        .set('Authorization', authToken)
        .send(newDrop)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: 1,
        text: 'Test drop content',
        questionId: testQuestionId,
        userId: testUserId
      });

      expect(mockStorage.createDrop).toHaveBeenCalledWith({
        ...newDrop,
        userId: testUserId
      });

      expect(mockStorage.getQuestions).toHaveBeenCalled();
    });

    test('should return 400 for invalid data', async () => {
      // Arrange
      const invalidDrop = {
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/drops')
        .set('Authorization', authToken)
        .send(invalidDrop)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(mockStorage.createDrop).not.toHaveBeenCalled();
    });

    test('should return 404 for non-existent question', async () => {
      // Arrange
      const dropWithInvalidQuestion = {
        questionId: 9999, // Non-existent question
        text: 'Test drop content'
      };

      mockStorage.getQuestions.mockResolvedValue([
        createMockQuestion({ id: testQuestionId, text: 'Test question' })
      ]);

      // Act
      const response = await request(app)
        .post('/api/drops')
        .set('Authorization', authToken)
        .send(dropWithInvalidQuestion)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Question not found');
      expect(mockStorage.getQuestions).toHaveBeenCalled();
      expect(mockStorage.createDrop).not.toHaveBeenCalled();
    });

    test('should require authentication', async () => {
      // Arrange
      const newDrop = {
        questionId: testQuestionId,
        text: 'Test drop content'
      };

      // Act & Assert
      await request(app)
        .post('/api/drops')
        .send(newDrop)
        .expect(401);

      expect(mockStorage.createDrop).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/drops/:id/messages', () => {
    test('should return messages for a drop', async () => {
      // Arrange
      const dropId = 1;
      const mockDrop = createMockDropWithQuestion({
        id: dropId,
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Test drop for messages'
      });

      const mockMessages = [
        createMockMessage({
          id: 1,
          dropId: dropId,
          text: 'Welcome! What would you like to share about this?',
          fromUser: false
        }),
        createMockMessage({
          id: 2,
          dropId: dropId,
          text: 'User response',
          fromUser: true
        })
      ];

      mockStorage.getDrop.mockResolvedValue(mockDrop);
      mockStorage.getMessages.mockResolvedValue(mockMessages);

      // Act
      const response = await request(app)
        .get(`/api/drops/${dropId}/messages`)
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].fromUser).toBe(false);
      expect(response.body[0].text).toBeTruthy();
      expect(response.body[1].fromUser).toBe(true);

      expect(mockStorage.getDrop).toHaveBeenCalledWith(dropId);
      expect(mockStorage.getMessages).toHaveBeenCalledWith(dropId);
    });

    test('should return 404 for non-existent drop', async () => {
      // Arrange
      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .get('/api/drops/9999/messages')
        .set('Authorization', authToken)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(mockStorage.getMessages).not.toHaveBeenCalled();
    });

    test('should prevent access to other users drops', async () => {
      // Arrange
      const dropId = 1;
      const otherUserDrop = createMockDropWithQuestion({
        id: dropId,
        userId: TEST_USER_IDS.USER_2, // Different user
        questionId: testQuestionId
      });

      mockStorage.getDrop.mockResolvedValue(otherUserDrop);

      // Act
      const response = await request(app)
        .get(`/api/drops/${dropId}/messages`)
        .set('Authorization', authToken)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access denied');
      expect(mockStorage.getMessages).not.toHaveBeenCalled();
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .get('/api/drops/1/messages')
        .expect(401);

      expect(mockStorage.getDrop).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle storage service downtime', async () => {
      // Arrange
      mockStorage.getUserDrops.mockRejectedValue(new Error('Storage service unavailable'));

      // Act
      const response = await request(app)
        .get('/api/drops')
        .set('Authorization', authToken)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message');
    });

    test('should handle malformed drop IDs', async () => {
      // Arrange
      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .get('/api/drops/invalid-id/messages')
        .set('Authorization', authToken)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
    });
  });
});