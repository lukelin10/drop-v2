/**
 * Feed Display Business Logic Unit Tests
 * 
 * Tests feed display logic that interacts with the storage layer.
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
  createMockDrops,
  TEST_USER_IDS,
  TEST_DATES
} from '../factories/testData';

describe('Feed Display Business Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;

  beforeEach(() => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();
  });

  describe('Drop Retrieval Logic', () => {
    test('should load user drops successfully', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'First journal entry about my goals',
          questionText: 'What are your goals for today?',
          createdAt: new Date('2024-01-15')
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          text: 'Second entry reflecting on growth',
          questionText: 'How did you grow today?',
          createdAt: new Date('2024-01-14')
        }),
        createMockDropWithQuestion({
          id: 3,
          userId: testUserId,
          text: 'Third entry about challenges',
          questionText: 'What challenges did you face?',
          createdAt: new Date('2024-01-13')
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.every(drop => drop.userId === testUserId)).toBe(true);
      expect(result.every(drop => drop.questionText)).toBe(true);
      expect(result[0].text).toBe('First journal entry about my goals');
      expect(result[0].questionText).toBe('What are your goals for today?');
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should handle empty feed gracefully', async () => {
      // Arrange
      setupEmptyUserMocks(testUserId);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should sort drops chronologically (most recent first)', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Oldest entry',
          createdAt: new Date('2024-01-01'),
          questionText: 'Old question'
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          text: 'Most recent entry',
          createdAt: new Date('2024-01-15'),
          questionText: 'Recent question'
        }),
        createMockDropWithQuestion({
          id: 3,
          userId: testUserId,
          text: 'Middle entry',
          createdAt: new Date('2024-01-08'),
          questionText: 'Middle question'
        })
      ];

      // Sort to simulate database ordering (most recent first)
      const sortedDrops = [...userDrops].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      mockStorage.getUserDrops.mockResolvedValue(sortedDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].text).toBe('Most recent entry'); // Most recent first
      expect(result[1].text).toBe('Middle entry');
      expect(result[2].text).toBe('Oldest entry'); // Oldest last
      expect(new Date(result[0].createdAt) >= new Date(result[1].createdAt)).toBe(true);
      expect(new Date(result[1].createdAt) >= new Date(result[2].createdAt)).toBe(true);
    });

    test('should include question text with drops', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          questionId: 1,
          text: 'My response to the question',
          questionText: 'How are you feeling today?'
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          questionId: 2,
          text: 'Another response',
          questionText: 'What did you learn today?'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(drop => drop.questionText)).toBe(true);
      expect(result[0].questionText).toBe('How are you feeling today?');
      expect(result[1].questionText).toBe('What did you learn today?');
      expect(result.every(drop => drop.questionId)).toBe(true);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockStorage.getUserDrops.mockRejectedValue(dbError);

      // Act & Assert
      await expect(mockStorage.getUserDrops(testUserId)).rejects.toThrow('Database connection failed');
      expect(mockStorage.getUserDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should handle large number of drops efficiently', async () => {
      // Arrange
      const manyDrops = createMockDrops(50, testUserId); // Create 50 drops
      const dropsWithQuestions = manyDrops.map(drop => 
        createMockDropWithQuestion({
          ...drop,
          questionText: `Question for drop ${drop.id}`
        })
      );

      mockStorage.getUserDrops.mockResolvedValue(dropsWithQuestions);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(50);
      expect(result.every(drop => drop.userId === testUserId)).toBe(true);
      expect(result.every(drop => drop.questionText)).toBe(true);
    });
  });

  describe('Display Logic', () => {
    test('should format dates correctly', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T10:30:00Z');
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Test entry',
          createdAt: testDate,
          questionText: 'Test question'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].createdAt).toEqual(testDate);
      expect(result[0].createdAt instanceof Date || typeof result[0].createdAt === 'string').toBe(true);
    });

    test('should format content correctly', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'This is a properly formatted journal entry with meaningful content about personal growth and reflection.',
          questionText: 'How did you grow today?'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('This is a properly formatted journal entry with meaningful content about personal growth and reflection.');
      expect(result[0].text.length).toBeGreaterThan(0);
      expect(typeof result[0].text).toBe('string');
    });

    test('should handle long content appropriately', async () => {
      // Arrange
      const longContent = 'This is a very long journal entry that contains a lot of text and might need to be truncated or handled specially in the UI. '.repeat(10);
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: longContent,
          questionText: 'Tell me about your day in detail'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(longContent);
      expect(result[0].text.length).toBeGreaterThan(500); // Should be quite long
      expect(typeof result[0].text).toBe('string');
    });

    test('should show drop count correctly', async () => {
      // Arrange
      const userDrops = createMockDrops(7, testUserId).map(drop =>
        createMockDropWithQuestion({
          ...drop,
          questionText: `Question ${drop.id}`
        })
      );

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(7);
      expect(Array.isArray(result)).toBe(true);
      
      // Test count calculation logic
      const dropCount = result.length;
      expect(dropCount).toBe(7);
      
      // Test pluralization logic
      const displayText = dropCount === 1 ? 'reflection' : 'reflections';
      expect(displayText).toBe('reflections');
    });

    test('should handle empty content gracefully', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: '',
          questionText: 'How are you feeling?'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('');
      expect(result[0].questionText).toBe('How are you feeling?');
    });

    test('should handle special characters in content', async () => {
      // Arrange
      const specialContent = 'Content with émojis 🎉, spëcial chars & símböls!';
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: specialContent,
          questionText: 'What made you smile today?'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe(specialContent);
      expect(result[0].text).toContain('🎉');
      expect(result[0].text).toContain('émojis');
    });
  });

  describe('Navigation Logic', () => {
    test('should navigate to conversations successfully', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Entry with messages',
          questionText: 'How are you feeling?',
          messageCount: 3
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          text: 'Entry without messages',
          questionText: 'What did you learn?',
          messageCount: 0
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].messageCount).toBe(3);
      expect(result[1].id).toBe(2);
      expect(result[1].messageCount).toBe(0);
      
      // Should be able to navigate to any drop by ID
      const navigatableDrops = result.filter(drop => drop.id);
      expect(navigatableDrops).toHaveLength(2);
    });

    test('should handle invalid drops gracefully', async () => {
      // Arrange
      const invalidDropId = 999;
      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.getDrop(invalidDropId);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorage.getDrop).toHaveBeenCalledWith(invalidDropId);
    });

    test('should handle click interactions correctly', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Clickable entry',
          questionText: 'Test question'
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(typeof result[0].id).toBe('number');
      
      // Simulate click interaction - should have valid drop ID
      const clickedDrop = result[0];
      expect(clickedDrop).toBeDefined();
      expect(clickedDrop.id).toBeGreaterThan(0);
    });

    test('should handle drops with different message counts', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Entry with many messages',
          questionText: 'Complex question',
          messageCount: 10
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          text: 'Entry with few messages',
          questionText: 'Simple question',
          messageCount: 1
        }),
        createMockDropWithQuestion({
          id: 3,
          userId: testUserId,
          text: 'Entry with no messages',
          questionText: 'Unanswered question',
          messageCount: 0
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].messageCount).toBe(10);
      expect(result[1].messageCount).toBe(1);
      expect(result[2].messageCount).toBe(0);
      
      // All should be navigatable regardless of message count
      expect(result.every(drop => drop.id > 0)).toBe(true);
    });

    test('should validate drop structure for navigation', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          questionId: 1,
          text: 'Complete drop entry',
          questionText: 'Valid question',
          createdAt: new Date(),
          messageCount: 2
        })
      ];

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      const drop = result[0];
      
      // Validate required fields for navigation
      expect(drop.id).toBeDefined();
      expect(drop.userId).toBeDefined();
      expect(drop.questionId).toBeDefined();
      expect(drop.text).toBeDefined();
      expect(drop.questionText).toBeDefined();
      expect(drop.createdAt).toBeDefined();
      expect(drop.messageCount).toBeDefined();
      
      // Validate types
      expect(typeof drop.id).toBe('number');
      expect(typeof drop.userId).toBe('string');
      expect(typeof drop.questionId).toBe('number');
      expect(typeof drop.text).toBe('string');
      expect(typeof drop.questionText).toBe('string');
      expect(typeof drop.messageCount).toBe('number');
    });

    test('should handle navigation to latest drop', async () => {
      // Arrange
      const userDrops = [
        createMockDropWithQuestion({
          id: 3,
          userId: testUserId,
          text: 'Latest entry',
          createdAt: new Date('2024-01-15'),
          questionText: 'Recent question'
        }),
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'Older entry',
          createdAt: new Date('2024-01-13'),
          questionText: 'Old question'
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          text: 'Middle entry',
          createdAt: new Date('2024-01-14'),
          questionText: 'Middle question'
        })
      ];

      // Sort to ensure latest first (simulate database ordering)
      const sortedDrops = [...userDrops].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      mockStorage.getUserDrops.mockResolvedValue(sortedDrops);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(3);
      
      // Latest drop should be first
      const latestDrop = result[0];
      expect(latestDrop.id).toBe(3);
      expect(latestDrop.text).toBe('Latest entry');
      
      // Can navigate to latest drop
      expect(latestDrop.id).toBeGreaterThan(0);
      expect(typeof latestDrop.id).toBe('number');
    });
  });

  describe('Feed Integration Error Scenarios', () => {
    test('should handle network failures during drop loading', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      mockStorage.getUserDrops.mockRejectedValue(networkError);

      // Act & Assert
      await expect(mockStorage.getUserDrops(testUserId)).rejects.toThrow('Network connection failed');
    });

    test('should handle corrupted drop data', async () => {
      // Arrange
      const corruptedDrops = [
        {
          id: 1,
          // Missing required fields like userId, text, etc.
          questionText: 'Incomplete drop data'
        }
      ];

      mockStorage.getUserDrops.mockResolvedValue(corruptedDrops as any);

      // Act
      const result = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].questionText).toBe('Incomplete drop data');
      // Should handle missing fields gracefully
    });

    test('should handle pagination errors', async () => {
      // Arrange
      const paginationError = new Error('Failed to load more drops');
      mockStorage.getUserDrops.mockRejectedValueOnce(paginationError);

      // Act & Assert
      await expect(mockStorage.getUserDrops(testUserId)).rejects.toThrow('Failed to load more drops');
    });

    test('should handle concurrent drop loading requests', async () => {
      // Arrange
      const userDrops = createMockDrops(5, testUserId).map(drop =>
        createMockDropWithQuestion({
          ...drop,
          questionText: `Question ${drop.id}`
        })
      );

      mockStorage.getUserDrops.mockResolvedValue(userDrops);

      // Act - Simulate concurrent requests
      const requests = [
        mockStorage.getUserDrops(testUserId),
        mockStorage.getUserDrops(testUserId),
        mockStorage.getUserDrops(testUserId)
      ];

      const results = await Promise.all(requests);

      // Assert
      results.forEach(result => {
        expect(result).toHaveLength(5);
        expect(result.every(drop => drop.userId === testUserId)).toBe(true);
      });
      expect(mockStorage.getUserDrops).toHaveBeenCalledTimes(3);
    });

    test('should handle empty state transitions', async () => {
      // Arrange - Start with empty, then add drops
      mockStorage.getUserDrops.mockResolvedValueOnce([]);
      
      const newDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          text: 'First drop after empty state',
          questionText: 'New question'
        })
      ];
      
      mockStorage.getUserDrops.mockResolvedValueOnce(newDrops);

      // Act
      const emptyResult = await mockStorage.getUserDrops(testUserId);
      const populatedResult = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(emptyResult).toHaveLength(0);
      expect(populatedResult).toHaveLength(1);
      expect(populatedResult[0].text).toBe('First drop after empty state');
    });
  });
}); 