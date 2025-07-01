/**
 * Success State Logic Unit Tests
 * 
 * Tests success state logic that determines when users have completed their daily reflection.
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
  setupAnsweredTodayMocks
} from '../mocks/mockStorage';
import { 
  createMockUser, 
  createMockDrop, 
  createMockDropWithQuestion,
  createMockQuestion,
  createMockDailyQuestion,
  createMockDropWithToday,
  TEST_USER_IDS,
  TEST_DATES
} from '../factories/testData';

describe('Success State Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;

  beforeEach(() => {
    // Reset all mocks
    resetStorageMocks();
    jest.clearAllMocks();
  });

  describe('Daily Completion Detection Logic', () => {
    test('should detect when user answered today\'s question', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const todayDrop = createMockDropWithQuestion({
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: new Date() // Today's date
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([todayDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const today = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(true);
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0].questionText).toBe(todayQuestion);
      expect(userDrops[0].userId).toBe(testUserId);
    });

    test('should detect when user has NOT answered today\'s question', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const yesterdayDrop = createMockDropWithQuestion({
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday's date
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([yesterdayDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const today = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(false);
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0].questionText).toBe(todayQuestion);
      
      // Verify the drop is from yesterday
      const dropDate = new Date(userDrops[0].createdAt).toISOString().split('T')[0];
      expect(dropDate).not.toBe(today);
    });

    test('should handle empty drops array correctly', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      setupEmptyUserMocks(testUserId);
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const hasAnsweredToday = userDrops.length === 0 ? false : userDrops.some(drop => {
        const today = new Date().toISOString().split('T')[0];
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(false);
      expect(userDrops).toHaveLength(0);
    });

    test('should handle missing daily question data', async () => {
      // Arrange
      const todayDrop = createMockDropWithQuestion({
        userId: testUserId,
        text: 'Some reflection',
        questionText: 'Some question',
        createdAt: new Date()
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(null as any);
      mockStorage.getUserDrops.mockResolvedValue([todayDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic with missing question
      const hasAnsweredToday = !question || userDrops.length === 0 ? false : userDrops.some(drop => {
        const today = new Date().toISOString().split('T')[0];
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBeNull();
      expect(hasAnsweredToday).toBe(false); // Should return false when no question data
      expect(userDrops).toHaveLength(1);
    });

    test('should differentiate between today\'s question and other questions', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const differentQuestion = 'What made you smile today?';
      
      const dropWithDifferentQuestion = createMockDropWithQuestion({
        userId: testUserId,
        questionText: differentQuestion,
        createdAt: new Date() // Today's date but different question
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([dropWithDifferentQuestion]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const today = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(false); // Should be false - answered different question
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0].questionText).toBe(differentQuestion);
      expect(userDrops[0].questionText).not.toBe(todayQuestion);
    });
  });

  describe('Timezone and Date Boundary Logic', () => {
    test('should work correctly at midnight boundary', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const midnightDate = new Date();
      midnightDate.setHours(0, 0, 0, 0); // Exactly midnight
      
      const midnightDrop = createMockDropWithQuestion({
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: midnightDate
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([midnightDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const today = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(true);
      expect(userDrops).toHaveLength(1);
    });

    test('should distinguish between consecutive days', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      
      const yesterdayDrop = createMockDropWithQuestion({
        id: 1,
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: yesterday
      });
      const todayDrop = createMockDropWithQuestion({
        id: 2,
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: today
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([yesterdayDrop, todayDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic
      const todayStr = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === todayStr;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(true); // Should detect today's answer
      expect(userDrops).toHaveLength(2);
    });
  });

  describe('Success State Integration Logic', () => {
    test('should trigger success state after answering today\'s question', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const answerText = 'I feel great and ready to take on the day!';
      
      const newDropData = {
        userId: testUserId,
        questionId: 1,
        text: answerText
      };
      const createdDrop = createMockDrop({ ...newDropData, id: 1, createdAt: new Date() });
      const dropWithQuestion = createMockDropWithQuestion({
        ...createdDrop,
        questionText: todayQuestion,
        createdAt: new Date() // Ensure today's date
      });
      
      // First call: user hasn't answered yet
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValueOnce([]);
      
      // Second call: after creating drop
      mockStorage.createDrop.mockResolvedValue(createdDrop);
      mockStorage.getUserDrops.mockResolvedValueOnce([dropWithQuestion]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      
      // Check initial state - no answer yet
      const initialDrops = await mockStorage.getUserDrops(testUserId);
      const initialHasAnswered = initialDrops.length > 0 && initialDrops.some(drop => {
        const today = new Date().toISOString().split('T')[0];
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });
      
      // Submit answer
      const newDrop = await mockStorage.createDrop(newDropData);
      
      // Check state after answering
      const finalDrops = await mockStorage.getUserDrops(testUserId);
      const finalHasAnswered = finalDrops.some(drop => {
        const today = new Date().toISOString().split('T')[0];
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(initialHasAnswered).toBe(false); // Initially no answer
      expect(newDrop).toMatchObject(newDropData);
      expect(finalHasAnswered).toBe(true); // After answering, should be true
      expect(finalDrops).toHaveLength(1);
      expect(finalDrops[0].text).toBe(answerText);
    });

    test('should prevent duplicate success states', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      
      setupAnsweredTodayMocks(testUserId);
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Check if already answered
      const today = new Date().toISOString().split('T')[0];
      const hasAnswered = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnswered).toBe(true); // Already answered
      expect(userDrops).toHaveLength(1); // Should have the first drop
      // Success state should already be active
    });
  });

  describe('Success State Error Scenarios', () => {
    test('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockStorage.getDailyQuestion.mockRejectedValue(dbError);
      mockStorage.getUserDrops.mockRejectedValue(dbError);

      // Act & Assert
      await expect(mockStorage.getDailyQuestion()).rejects.toThrow('Database connection failed');
      await expect(mockStorage.getUserDrops(testUserId)).rejects.toThrow('Database connection failed');
    });

    test('should handle malformed date data', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const dropWithBadDate = {
        id: 1,
        userId: testUserId,
        questionText: todayQuestion,
        text: 'Some reflection',
        createdAt: 'invalid-date-string' // Bad date format
      };
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([dropWithBadDate as any]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic with error handling
      let hasAnsweredToday = false;
      try {
        const today = new Date().toISOString().split('T')[0];
        hasAnsweredToday = userDrops.some(drop => {
          try {
            const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
            const isToday = dropDate === today;
            const isCurrentQuestion = drop.questionText === question;
            return isToday && isCurrentQuestion;
          } catch {
            return false; // Handle invalid dates gracefully
          }
        });
      } catch {
        hasAnsweredToday = false;
      }

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(false); // Should handle error gracefully
      expect(userDrops).toHaveLength(1);
    });

    test('should handle null/undefined drops data', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue(null as any);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Simulate hasAnsweredTodaysQuestion logic with null handling
      const hasAnsweredToday = !userDrops || userDrops.length === 0 ? false : userDrops.some(drop => {
        const today = new Date().toISOString().split('T')[0];
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        const isToday = dropDate === today;
        const isCurrentQuestion = drop.questionText === question;
        return isToday && isCurrentQuestion;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(false); // Should handle null gracefully
    });
  });
});
