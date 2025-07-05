/**
 * Tests for Mock Storage Implementation
 * 
 * Verifies that our mock storage behaves correctly and provides
 * the expected functionality for unit tests.
 */

// Database access automatically blocked by jest.setup.ts
import {
  mockStorage,
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks,
  setupStorageErrorMocks
} from './mockStorage';
import { createMockUser, createMockDrop } from '../factories/testData';

describe('Mock Storage', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Basic Mock Functionality', () => {
    it('should provide mocked user methods', async () => {
      const user = await mockStorage.getUser('test-user-1');

      expect(user).toBeDefined();
      expect(user?.id).toBe('test-user-1');
      expect(user?.username).toBe('testuser');
      expect(mockStorage.getUser).toHaveBeenCalledWith('test-user-1');
    });

    it('should provide mocked drop methods', async () => {
      const drops = await mockStorage.getUserDrops('test-user-1');

      expect(drops).toBeDefined();
      expect(Array.isArray(drops)).toBe(true);
      expect(drops.length).toBeGreaterThan(0);
      expect(drops[0]).toHaveProperty('questionText');
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith('test-user-1');
    });

    it('should provide mocked analysis methods', async () => {
      const eligibility = await mockStorage.getAnalysisEligibility('test-user-1');

      expect(eligibility).toBeDefined();
      expect(eligibility).toHaveProperty('isEligible');
      expect(eligibility).toHaveProperty('unanalyzedCount');
      expect(eligibility).toHaveProperty('requiredCount');
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith('test-user-1');
    });
  });

  describe('Mock Customization', () => {
    it('should allow customizing mock return values', async () => {
      const customUser = createMockUser({
        id: 'custom-user',
        username: 'customuser'
      });

      mockStorage.getUser.mockResolvedValue(customUser);

      const result = await mockStorage.getUser('custom-user');

      expect(result?.id).toBe('custom-user');
      expect(result?.username).toBe('customuser');
    });

    it('should allow mocking create operations', async () => {
      const newDrop = createMockDrop({
        id: 42,
        text: 'Custom drop text'
      });

      mockStorage.createDrop.mockResolvedValue(newDrop);

      const result = await mockStorage.createDrop({
        userId: 'test-user-1',
        questionId: 1,
        text: 'Custom drop text'
      });

      expect(result.id).toBe(42);
      expect(result.text).toBe('Custom drop text');
    });
  });

  describe('Scenario-Based Mock Helpers', () => {
    it('should setup eligible user mocks correctly', async () => {
      setupEligibleUserMocks('eligible-user');

      const eligibility = await mockStorage.getAnalysisEligibility('eligible-user');
      const drops = await mockStorage.getUnanalyzedDrops('eligible-user');

      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(5);
      expect(drops).toHaveLength(5);
      expect(drops[0].userId).toBe('eligible-user');
    });

    it('should setup ineligible user mocks correctly', async () => {
      setupIneligibleUserMocks('ineligible-user', 3);

      const eligibility = await mockStorage.getAnalysisEligibility('ineligible-user');
      const drops = await mockStorage.getUnanalyzedDrops('ineligible-user');

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(3);
      expect(drops).toHaveLength(3);
    });

    it('should setup empty user mocks correctly', async () => {
      setupEmptyUserMocks('empty-user');

      const eligibility = await mockStorage.getAnalysisEligibility('empty-user');
      const drops = await mockStorage.getUnanalyzedDrops('empty-user');
      const userDrops = await mockStorage.getUserDrops('empty-user');

      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(0);
      expect(drops).toHaveLength(0);
      expect(userDrops).toHaveLength(0);
    });

    it('should setup error mocks correctly', async () => {
      const testError = new Error('Database connection failed');
      setupStorageErrorMocks('getUser', testError);

      await expect(mockStorage.getUser('test-user')).rejects.toThrow('Database connection failed');
    });
  });

  describe('Mock Reset Functionality', () => {
    it('should reset mocks to default state', async () => {
      // Customize a mock
      mockStorage.getUser.mockResolvedValue(createMockUser({ username: 'modified' }));

      let result = await mockStorage.getUser('test');
      expect(result?.username).toBe('modified');

      // Reset mocks
      resetStorageMocks();

      // Should return to default
      result = await mockStorage.getUser('test');
      expect(result?.username).toBe('testuser'); // Default value
    });

    it('should clear call history when reset', () => {
      mockStorage.getUser('test-1');
      mockStorage.getUser('test-2');

      expect(mockStorage.getUser).toHaveBeenCalledTimes(2);

      resetStorageMocks();

      expect(mockStorage.getUser).toHaveBeenCalledTimes(0);
    });
  });

  describe('Mock Call Verification', () => {
    it('should track method calls correctly', async () => {
      await mockStorage.createDrop({
        userId: 'test-user',
        questionId: 1,
        text: 'Test drop'
      });

      expect(mockStorage.createDrop).toHaveBeenCalledTimes(1);
      expect(mockStorage.createDrop).toHaveBeenCalledWith({
        userId: 'test-user',
        questionId: 1,
        text: 'Test drop'
      });
    });

    it('should verify multiple calls with different parameters', async () => {
      await mockStorage.getUser('user-1');
      await mockStorage.getUser('user-2');

      expect(mockStorage.getUser).toHaveBeenCalledTimes(2);
      expect(mockStorage.getUser).toHaveBeenNthCalledWith(1, 'user-1');
      expect(mockStorage.getUser).toHaveBeenNthCalledWith(2, 'user-2');
    });
  });
}); 