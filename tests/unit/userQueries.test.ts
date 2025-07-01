/**
 * User Database Query Functions Unit Tests
 * 
 * Tests user database query business logic without database connections.
 * Uses mocked database layer to ensure fast, isolated testing following
 * the mock-first testing strategy.
 */

// Database access automatically blocked by jest.setup.ts
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the database and schema imports before importing our functions
const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  insert: jest.fn(),
};

const mockEq = jest.fn();

jest.mock('../../server/db', () => ({
  db: mockDb,
}));

jest.mock('../../shared/schema', () => ({
  users: {
    id: 'users_id_field',
    username: 'users_username_field',
    email: 'users_email_field',
    name: 'users_name_field',
    updatedAt: 'users_updatedAt_field',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: mockEq,
}));

// Import after mocking
import { getUserProfile, updateUserName, upsertUserProfile } from '../../lib/database/user-queries';

describe('User Database Query Functions Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockEq.mockImplementation((field, value) => ({ field, value, operator: 'eq' }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      // Arrange
      const mockUser = {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockUser])
          })
        })
      };
      mockDb.select.mockReturnValue(mockQuery);

      // Act
      const result = await getUserProfile('test-user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('users_id_field', 'test-user-123');
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      const mockQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      };
      mockDb.select.mockReturnValue(mockQuery);

      // Act
      const result = await getUserProfile('nonexistent-user');

      // Assert
      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const mockQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      };
      mockDb.select.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(getUserProfile('test-user-123')).rejects.toThrow('Failed to fetch user profile');
    });
  });

  describe('updateUserName', () => {
    it('should update user name successfully', async () => {
      // Arrange
      const updatedUser = {
        id: 'test-user-123',
        username: 'testuser',
        name: 'Updated Name',
        updatedAt: new Date('2024-01-01'),
      };

      const mockQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedUser])
          })
        })
      };
      mockDb.update.mockReturnValue(mockQuery);

      // Act
      const result = await updateUserName('test-user-123', 'Updated Name');

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockQuery.set).toHaveBeenCalledWith({
        name: 'Updated Name',
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error when name is empty', async () => {
      // Act & Assert
      await expect(updateUserName('test-user-123', '')).rejects.toThrow('Name cannot be empty');
      await expect(updateUserName('test-user-123', '   ')).rejects.toThrow('Name cannot be empty');
      
      // Verify database wasn't called
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const mockQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([])
          })
        })
      };
      mockDb.update.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateUserName('nonexistent-user', 'New Name')).rejects.toThrow('User not found');
    });

    it('should trim whitespace from name', async () => {
      // Arrange
      const updatedUser = {
        id: 'test-user-123',
        name: 'Trimmed Name',
        updatedAt: new Date('2024-01-01'),
      };

      const mockQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedUser])
          })
        })
      };
      mockDb.update.mockReturnValue(mockQuery);

      // Act
      await updateUserName('test-user-123', '  Trimmed Name  ');

      // Assert
      expect(mockQuery.set).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        updatedAt: expect.any(Date)
      });
    });

    it('should handle database error during update', async () => {
      // Arrange
      const mockQuery = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      };
      mockDb.update.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateUserName('test-user-123', 'Valid Name')).rejects.toThrow('Database connection failed');
    });
  });

  describe('upsertUserProfile', () => {
    it('should create new user profile successfully', async () => {
      // Arrange
      const userData = {
        id: 'new-user-123',
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      const createdUser = { 
        ...userData, 
        createdAt: new Date('2024-01-01'), 
        updatedAt: new Date('2024-01-01') 
      };

      const mockQuery = {
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([createdUser])
          })
        })
      };
      mockDb.insert.mockReturnValue(mockQuery);

      // Act
      const result = await upsertUserProfile(userData);

      // Assert
      expect(result).toEqual(createdUser);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockQuery.values).toHaveBeenCalledWith({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should handle database error during upsert', async () => {
      // Arrange
      const userData = {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      const mockQuery = {
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockRejectedValue(new Error('Database constraint violation'))
          })
        })
      };
      mockDb.insert.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(upsertUserProfile(userData)).rejects.toThrow('Failed to create or update user profile');
    });
  });
}); 