/**
 * User Profile API Endpoint Tests
 * 
 * Tests the user profile API endpoints without database connections.
 * Uses mocked services to ensure fast, isolated testing following
 * the mock-first testing strategy.
 */

import { enableMocksForAPITests, getTestApp } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import express, { type Express } from 'express';
import { 
  mockStorage, 
  resetStorageMocks
} from '../mocks/mockStorage';
import { 
  createMockUser,
  TEST_USER_IDS 
} from '../factories/testData';

// Mock the user-queries module
const mockGetUserProfile = jest.fn();
const mockUpdateUserName = jest.fn();

jest.mock('../../lib/database/user-queries', () => ({
  getUserProfile: mockGetUserProfile,
  updateUserName: mockUpdateUserName,
}));

// Import after mocking
import { registerRoutes } from '../../server/routes';

describe('User Profile API Endpoint Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  let authToken: string;
  let app: Express;

  beforeEach(async () => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();
    
    // Reset the user-queries mocks
    mockGetUserProfile.mockReset();
    mockUpdateUserName.mockReset();

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

  describe('GET /api/user/profile', () => {
    it('should return user profile when profile exists', async () => {
      // Arrange
      const mockProfile = createMockUser({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      });

      // Mock the getUserProfile function to return our test data
      mockGetUserProfile.mockResolvedValue(mockProfile);

      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
      });
      expect(mockGetUserProfile).toHaveBeenCalledWith(testUserId);
    });

    it('should return 404 when profile does not exist', async () => {
      // Arrange
      mockGetUserProfile.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message', 'User profile not found');
      expect(mockGetUserProfile).toHaveBeenCalledWith(testUserId);
    });

    it('should return 401 when user is not authenticated', async () => {
      // Act
      const response = await request(app)
        .get('/api/user/profile')
        // No authorization header
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 500 when database error occurs', async () => {
      // Arrange
      mockGetUserProfile.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', authToken)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message', 'Failed to fetch user profile');
      expect(mockGetUserProfile).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('PUT /api/user/update-name', () => {
    it('should update user name successfully', async () => {
      // Arrange
      const updatedUser = createMockUser({
        id: testUserId,
        username: 'testuser',
        name: 'Updated Name',
        email: 'test@example.com',
      });

      mockUpdateUserName.mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name updated successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: testUserId,
        name: 'Updated Name',
      });
      expect(mockUpdateUserName).toHaveBeenCalledWith(testUserId, 'Updated Name');
    });

    it('should return 400 when name is missing', async () => {
      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({}) // No name provided
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name is required and must be a non-empty string');
    });

    it('should return 400 when name is empty string', async () => {
      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: '' })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name is required and must be a non-empty string');
    });

    it('should return 400 when name is only whitespace', async () => {
      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: '   ' })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name is required and must be a non-empty string');
    });

    it('should return 400 when name is not a string', async () => {
      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: 123 }) // Invalid type
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name is required and must be a non-empty string');
    });

    it('should return 401 when user is not authenticated', async () => {
      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        // No authorization header
        .send({ name: 'Test Name' })
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 400 when updateUserName throws "Name cannot be empty" error', async () => {
      // Arrange
      mockUpdateUserName.mockRejectedValue(new Error('Name cannot be empty'));

      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: 'Test Name' })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name cannot be empty');
    });

    it('should return 404 when updateUserName throws "User not found" error', async () => {
      // Arrange
      mockUpdateUserName.mockRejectedValue(new Error('User not found'));

      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: 'Test Name' })
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('message', 'User not found');
    });

    it('should return 500 when database error occurs', async () => {
      // Arrange
      mockUpdateUserName.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: 'Test Name' })
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('message', 'Failed to update user name');
    });

    it('should handle edge case with very long name', async () => {
      // Arrange
      const longName = 'A'.repeat(255); // Very long name
      const updatedUser = createMockUser({
        id: testUserId,
        name: longName,
      });

      mockUpdateUserName.mockResolvedValue(updatedUser);

      // Act
      const response = await request(app)
        .put('/api/user/update-name')
        .set('Authorization', authToken)
        .send({ name: longName })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('message', 'Name updated successfully');
      expect(mockUpdateUserName).toHaveBeenCalledWith(testUserId, longName);
    });
  });
}); 