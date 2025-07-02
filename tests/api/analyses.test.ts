/**
 * Analysis API Endpoint Tests
 * 
 * Tests the analysis API endpoints without database connections.
 * Uses mocked storage and services to ensure fast, isolated testing.
 * 
 * NOTE: This used to test against real database operations.
 * Now it tests API behavior with mocked dependencies.
 */

import { enableMocksForAPITests } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import express from 'express';
import type { Express } from 'express';
import {
  mockStorage,
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks
} from '../mocks/mockStorage';
import {
  createMockUser,
  createMockAnalysis,
  createMockAnalysisEligibility,
  createMockDropWithQuestion,
  TEST_USER_IDS
} from '../factories/testData';

// Additional mocks specific to this test

// Mock analysis service
jest.mock('../../server/services/analysisService', () => ({
  createAnalysisForUser: jest.fn(),
  getAnalysisStats: jest.fn(),
  previewAnalysis: jest.fn(),
  healthCheck: jest.fn()
}));

// Import after mocking
import { registerRoutes } from '../../server/routes';

const mockCreateAnalysisForUser = require('../../server/services/analysisService').createAnalysisForUser as jest.Mock;
const mockGetAnalysisStats = require('../../server/services/analysisService').getAnalysisStats as jest.Mock;
const mockPreviewAnalysis = require('../../server/services/analysisService').previewAnalysis as jest.Mock;
const mockHealthCheck = require('../../server/services/analysisService').healthCheck as jest.Mock;

describe('Analysis API Endpoint Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;
  let authToken: string;
  let authToken2: string;
  let app: Express;

  beforeEach(async () => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();

    // Mock authentication tokens
    authToken = `Bearer mock-token-${testUserId}`;
    authToken2 = `Bearer mock-token-${testUserId2}`;

    // Configure the authentication mock for this test
    const mockAuth = require('../../server/replitAuth').isAuthenticated as jest.Mock;
    mockAuth.mockImplementation((req: any, res: any, next: any) => {
      const token = req.headers.authorization;
      if (token === authToken) {
        req.user = { claims: { sub: testUserId } };
        next();
      } else if (token === authToken2) {
        req.user = { claims: { sub: testUserId2 } };
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

  describe('GET /api/analyses/eligibility', () => {
    test('should return not eligible for new user', async () => {
      // Arrange
      setupEmptyUserMocks(testUserId);

      // Act
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });

      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });

    test('should return not eligible with fewer than 7 drops', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 5);

      // Act
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });

      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });

    test('should return eligible with 7 or more drops', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      // Act
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toEqual({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });

      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .get('/api/analyses/eligibility')
        .expect(401);

      // Should not call storage when unauthorized
      expect(mockStorage.getAnalysisEligibility).not.toHaveBeenCalled();
    });

    test('should handle storage errors gracefully', async () => {
      // Arrange
      mockStorage.getAnalysisEligibility.mockRejectedValue(new Error('Storage error'));

      // Act
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('POST /api/analyses', () => {
    test('should create analysis when user is eligible', async () => {
      // Arrange
      const mockAnalysis = createMockAnalysis({
        id: 123,
        userId: testUserId,
        content: 'Generated analysis content...',
        summary: 'Test analysis summary',
        bulletPoints: '• Key insight 1\n• Key insight 2'
      });

      mockCreateAnalysisForUser.mockResolvedValue({
        success: true,
        analysis: mockAnalysis,
        metadata: {
          dropCount: 7,
          userId: testUserId,
          processingTime: 1500
        }
      });

      // Act
      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: 123,
        userId: testUserId,
        content: 'Generated analysis content...',
        summary: 'Test analysis summary',
        bulletPoints: '• Key insight 1\n• Key insight 2',
        isFavorited: false
      });

      expect(response.body).toHaveProperty('createdAt');
      expect(mockCreateAnalysisForUser).toHaveBeenCalledWith(testUserId);
    });

    test('should return 400 when user is not eligible', async () => {
      // Arrange
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        error: 'User is not eligible for analysis. Need 7 drops, has 5.',
        metadata: {
          dropCount: 5,
          userId: testUserId
        }
      });

      // Act
      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not eligible');
      expect(mockCreateAnalysisForUser).toHaveBeenCalledWith(testUserId);
    });

    test('should handle analysis service errors', async () => {
      // Arrange
      mockCreateAnalysisForUser.mockResolvedValue({
        success: false,
        error: 'LLM service unavailable',
        metadata: {
          dropCount: 8,
          userId: testUserId
        }
      });

      // Act
      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('LLM service unavailable');
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .post('/api/analyses')
        .expect(401);

      // Should not call analysis service when unauthorized
      expect(mockCreateAnalysisForUser).not.toHaveBeenCalled();
    });

    test('should handle concurrent analysis creation attempts', async () => {
      // Arrange
      const mockAnalysis = createMockAnalysis({ userId: testUserId });
      mockCreateAnalysisForUser.mockResolvedValue({
        success: true,
        analysis: mockAnalysis,
        metadata: { dropCount: 8, userId: testUserId }
      });

      // Act - Make concurrent requests
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/analyses')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed (in real system might have rate limiting)
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(mockCreateAnalysisForUser).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET /api/analyses', () => {
    test('should return user analyses', async () => {
      // Arrange
      const mockAnalyses = [
        createMockAnalysis({
          id: 1,
          userId: testUserId,
          summary: 'Recent analysis',
          isFavorited: true
        }),
        createMockAnalysis({
          id: 2,
          userId: testUserId,
          summary: 'Older analysis',
          isFavorited: false
        })
      ];

      mockStorage.getUserAnalyses.mockResolvedValue(mockAnalyses);

      // Act
      const response = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('analyses');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.analyses).toHaveLength(2);
      expect(response.body.analyses[0]).toMatchObject({
        id: 1,
        userId: testUserId,
        summary: 'Recent analysis',
        isFavorited: true
      });
      expect(response.body.hasMore).toBe(false);

      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId, 11, 0);
    });

    test('should return empty array for user with no analyses', async () => {
      // Arrange
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toEqual({ analyses: [], hasMore: false });
      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId, 11, 0);
    });

    test('should support pagination', async () => {
      // Arrange
      const mockAnalyses = [
        createMockAnalysis({ id: 1, userId: testUserId }),
        createMockAnalysis({ id: 2, userId: testUserId })
      ];

      mockStorage.getUserAnalyses.mockResolvedValue(mockAnalyses);

      // Act
      const response = await request(app)
        .get('/api/analyses?page=1&limit=2')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('analyses');
      expect(response.body).toHaveProperty('hasMore');
      expect(response.body.analyses).toHaveLength(2);
      expect(response.body.hasMore).toBe(false);
      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId, 3, 0);
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .get('/api/analyses')
        .expect(401);

      expect(mockStorage.getUserAnalyses).not.toHaveBeenCalled();
    });

    test('should isolate user data', async () => {
      // Arrange
      const user1Analyses = [createMockAnalysis({ id: 1, userId: testUserId })];
      const user2Analyses = [createMockAnalysis({ id: 2, userId: testUserId2 })];

      mockStorage.getUserAnalyses.mockImplementation((userId) => {
        if (userId === testUserId) return Promise.resolve(user1Analyses);
        if (userId === testUserId2) return Promise.resolve(user2Analyses);
        return Promise.resolve([]);
      });

      // Act
      const response1 = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(200);

      const response2 = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken2)
        .expect(200);

      // Assert
      expect(response1.body.analyses).toHaveLength(1);
      expect(response1.body.analyses[0].userId).toBe(testUserId);

      expect(response2.body.analyses).toHaveLength(1);
      expect(response2.body.analyses[0].userId).toBe(testUserId2);
    });
  });

  describe('GET /api/analyses/:id', () => {
    test('should return specific analysis', async () => {
      // Arrange
      const mockAnalysis = createMockAnalysis({
        id: 42,
        userId: testUserId,
        content: 'Detailed analysis content...'
      });

      mockStorage.getAnalysis.mockResolvedValue(mockAnalysis);

      // Act
      const response = await request(app)
        .get('/api/analyses/42')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: 42,
        userId: testUserId,
        content: 'Detailed analysis content...'
      });

      expect(mockStorage.getAnalysis).toHaveBeenCalledWith(42);
    });

    test('should return 404 for non-existent analysis', async () => {
      // Arrange
      mockStorage.getAnalysis.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .get('/api/analyses/999')
        .set('Authorization', authToken)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    test('should prevent access to other users analyses', async () => {
      // Arrange
      const otherUserAnalysis = createMockAnalysis({
        id: 42,
        userId: testUserId2  // Different user
      });

      mockStorage.getAnalysis.mockResolvedValue(otherUserAnalysis);

      // Act
      const response = await request(app)
        .get('/api/analyses/42')
        .set('Authorization', authToken)  // testUserId trying to access testUserId2's analysis
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Access denied');
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .get('/api/analyses/42')
        .expect(401);

      expect(mockStorage.getAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/analyses/:id/favorite', () => {
    test('should toggle analysis favorite status', async () => {
      // Arrange
      const originalAnalysis = createMockAnalysis({ id: 42, userId: testUserId, isFavorited: false });
      const favoritedAnalysis = createMockAnalysis({ id: 42, userId: testUserId, isFavorited: true });

      mockStorage.getAnalysis.mockResolvedValue(originalAnalysis);
      mockStorage.updateAnalysisFavorite.mockResolvedValue(favoritedAnalysis);

      // Act
      const response = await request(app)
        .put('/api/analyses/42/favorite')
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(200);

      // Assert
      expect(response.body.isFavorited).toBe(true);
      expect(mockStorage.updateAnalysisFavorite).toHaveBeenCalledWith(42, true);
    });

    test('should unfavorite analysis', async () => {
      // Arrange
      const favoritedAnalysis = createMockAnalysis({ id: 42, userId: testUserId, isFavorited: true });
      const unfavoritedAnalysis = createMockAnalysis({ id: 42, userId: testUserId, isFavorited: false });

      mockStorage.getAnalysis.mockResolvedValue(favoritedAnalysis);
      mockStorage.updateAnalysisFavorite.mockResolvedValue(unfavoritedAnalysis);

      // Act
      const response = await request(app)
        .put('/api/analyses/42/favorite')
        .set('Authorization', authToken)
        .send({ isFavorited: false })
        .expect(200);

      // Assert
      expect(response.body.isFavorited).toBe(false);
      expect(mockStorage.updateAnalysisFavorite).toHaveBeenCalledWith(42, false);
    });

    test('should return 404 for non-existent analysis', async () => {
      // Arrange
      mockStorage.getAnalysis.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .put('/api/analyses/999/favorite')
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(mockStorage.updateAnalysisFavorite).not.toHaveBeenCalled();
    });

    test('should prevent favoriting other users analyses', async () => {
      // Arrange
      const otherUserAnalysis = createMockAnalysis({ id: 42, userId: testUserId2 });
      mockStorage.getAnalysis.mockResolvedValue(otherUserAnalysis);

      // Act
      const response = await request(app)
        .put('/api/analyses/42/favorite')
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(mockStorage.updateAnalysisFavorite).not.toHaveBeenCalled();
    });

    test('should validate request body', async () => {
      // Act
      const response = await request(app)
        .put('/api/analyses/42/favorite')
        .set('Authorization', authToken)
        .send({}) // Missing isFavorited field
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('isFavorited');
    });

    test('should require authentication', async () => {
      // Act & Assert
      await request(app)
        .put('/api/analyses/42/favorite')
        .send({ isFavorited: true })
        .expect(401);

      expect(mockStorage.getAnalysis).not.toHaveBeenCalled();
    });
  });



  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed analysis IDs', async () => {
      // Arrange
      mockStorage.getAnalysis.mockResolvedValue(undefined);

      // Act
      const response = await request(app)
        .get('/api/analyses/invalid-id')
        .set('Authorization', authToken)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    test('should handle storage service downtime', async () => {
      // Arrange
      mockStorage.getUserAnalyses.mockRejectedValue(new Error('Storage service unavailable'));

      // Act
      const response = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Failed to fetch analyses');
    });

    test('should handle rate limiting scenarios', async () => {
      // This would be implemented in the actual API with rate limiting middleware
      // For now, we test that multiple requests are handled gracefully

      // Arrange
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act - Make multiple rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/analyses')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed (in production, some might be rate limited)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should validate request parameters', async () => {
      // Arrange - Invalid pagination parameters should still work (API handles gracefully)
      mockStorage.getUserAnalyses.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get('/api/analyses?limit=invalid&offset=negative')
        .set('Authorization', authToken)
        .expect(200);

      // Assert - API handles invalid params gracefully by using defaults
      expect(response.body).toEqual({ analyses: [], hasMore: false });
      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId, 11, 0);
    });
  });
});