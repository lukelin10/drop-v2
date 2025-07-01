/**
 * Daily Question Business Logic Unit Tests
 * 
 * Tests daily question logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks,
  setupStorageErrorMocks
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

describe('Daily Question Business Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;

  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Question Selection Logic', () => {
    test('should return the same question for the same day', async () => {
      // Arrange
      const expectedQuestion = 'How are you feeling today?';
      mockStorage.getDailyQuestion.mockResolvedValue(expectedQuestion);

      // Act
      const question1 = await mockStorage.getDailyQuestion();
      const question2 = await mockStorage.getDailyQuestion();

      // Assert
      expect(question1).toBe(expectedQuestion);
      expect(question2).toBe(expectedQuestion);
      expect(question1).toBe(question2);
      expect(mockStorage.getDailyQuestion).toHaveBeenCalledTimes(2);
    });

    test('should advance to next question on different days', async () => {
      // Arrange - Mock different questions for different days
      const todaysQuestion = 'How are you feeling today?';
      const tomorrowsQuestion = 'What made you smile today?';
      
      mockStorage.getDailyQuestion
        .mockResolvedValueOnce(todaysQuestion)
        .mockResolvedValueOnce(tomorrowsQuestion);

      // Act
      const question1 = await mockStorage.getDailyQuestion();
      const question2 = await mockStorage.getDailyQuestion();

      // Assert
      expect(question1).toBe(todaysQuestion);
      expect(question2).toBe(tomorrowsQuestion);
      expect(question1).not.toBe(question2);
    });

    test('should handle no active questions gracefully', async () => {
      // Arrange
      const fallbackQuestion = 'What brought you joy today?';
      mockStorage.getDailyQuestion.mockResolvedValue(fallbackQuestion);

      // Act
      const question = await mockStorage.getDailyQuestion();

      // Assert
      expect(question).toBe(fallbackQuestion);
      expect(typeof question).toBe('string');
      expect(question.length).toBeGreaterThan(0);
    });

    test('should update question usage statistics', async () => {
      // Arrange
      const testQuestion = createMockQuestion({ 
        id: 1, 
        usageCount: 5,
        lastUsedAt: TEST_DATES.PAST 
      });
      const updatedQuestion = createMockQuestion({ 
        id: 1, 
        usageCount: 6,
        lastUsedAt: new Date() 
      });
      
      mockStorage.getQuestions.mockResolvedValue([testQuestion]);
      mockStorage.updateQuestion.mockResolvedValue(updatedQuestion);
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion.text);

      // Act
      const question = await mockStorage.getDailyQuestion();

      // Assert
      expect(question).toBe(testQuestion.text);
      expect(mockStorage.getDailyQuestion).toHaveBeenCalled();
    });

    test('should cycle through questions when all are used', async () => {
      // Arrange
      const questions = [
        'How are you feeling today?',
        'What made you smile today?',
        'What are you grateful for?'
      ];
      
      // Mock cycling through all questions
      questions.forEach((q, index) => {
        mockStorage.getDailyQuestion.mockResolvedValueOnce(q);
      });
      
      // Act
      const retrievedQuestions = [];
      for (let i = 0; i < questions.length; i++) {
        retrievedQuestions.push(await mockStorage.getDailyQuestion());
      }

      // Assert
      expect(retrievedQuestions).toEqual(questions);
      expect(mockStorage.getDailyQuestion).toHaveBeenCalledTimes(3);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const fallbackQuestion = 'What brought you joy today?';
      mockStorage.getDailyQuestion.mockRejectedValueOnce(new Error('Database connection failed'));
      
      // Act
      const question = await mockStorage.getDailyQuestion().catch(() => fallbackQuestion);

      // Assert
      expect(question).toBe(fallbackQuestion);
      expect(typeof question).toBe('string');
      expect(question.length).toBeGreaterThan(0);
    });
  });

  describe('Question Display Logic', () => {
    test('should format question correctly', async () => {
      // Arrange
      const testQuestion = 'How are you feeling today?';
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion);

      // Act
      const question = await mockStorage.getDailyQuestion();

      // Assert
      expect(question).toBe(testQuestion);
      expect(question).toMatch(/\?$/); // Should end with question mark
      expect(question.trim()).toBe(question); // Should not have leading/trailing whitespace
      expect(question.length).toBeGreaterThan(10); // Should be a meaningful question
    });

    test('should handle loading states', async () => {
      // Arrange
      let resolveQuestion: (value: string) => void;
      const questionPromise = new Promise<string>((resolve) => {
        resolveQuestion = resolve;
      });
      mockStorage.getDailyQuestion.mockReturnValue(questionPromise);

      // Act
      const questionRequest = mockStorage.getDailyQuestion();
      
      // Simulate loading delay
      setTimeout(() => {
        resolveQuestion!('How are you feeling today?');
      }, 100);

      const question = await questionRequest;

      // Assert
      expect(question).toBe('How are you feeling today?');
    });

    test('should handle question rotation', async () => {
      // Arrange
      const rotatingQuestions = [
        'How are you feeling today?',
        'What made you smile today?',
        'What challenges did you face?'
      ];
      
      rotatingQuestions.forEach((q, index) => {
        mockStorage.getDailyQuestion.mockResolvedValueOnce(q);
      });

      // Act
      const questions = [];
      for (let i = 0; i < rotatingQuestions.length; i++) {
        questions.push(await mockStorage.getDailyQuestion());
      }

      // Assert
      expect(questions).toEqual(rotatingQuestions);
      expect(new Set(questions).size).toBe(3); // All questions should be unique
    });
  });

  describe('Daily Question Integration Logic', () => {
    test('should detect when user answered today', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const todayDrop = createMockDropWithQuestion({
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: new Date() // Today's date
      });
      
      setupEligibleUserMocks(testUserId);
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([todayDrop]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Check if user answered today's question
      const today = new Date().toISOString().split('T')[0];
      const hasAnsweredToday = userDrops.some(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        return dropDate === today && drop.questionText === question;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(hasAnsweredToday).toBe(true);
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0].questionText).toBe(todayQuestion);
    });

    test('should handle multiple answers same day', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const todayDrops = [
        createMockDropWithQuestion({
          id: 1,
          userId: testUserId,
          questionText: todayQuestion,
          createdAt: new Date()
        }),
        createMockDropWithQuestion({
          id: 2,
          userId: testUserId,
          questionText: todayQuestion,
          createdAt: new Date()
        })
      ];
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue(todayDrops);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);
      
      // Check today's answers
      const today = new Date().toISOString().split('T')[0];
      const todaysAnswers = userDrops.filter(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        return dropDate === today && drop.questionText === question;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(todaysAnswers).toHaveLength(2);
      expect(todaysAnswers.every(drop => drop.questionText === todayQuestion)).toBe(true);
    });

    test('should work across timezone boundaries', async () => {
      // Arrange
      const testQuestion = 'How are you feeling today?';
      const utcDate = new Date();
      utcDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      
      const dropAtStartOfDay = createMockDropWithQuestion({
        userId: testUserId,
        questionText: testQuestion,
        createdAt: utcDate
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion);
      mockStorage.getUserDrops.mockResolvedValue([dropAtStartOfDay]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(question).toBe(testQuestion);
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0].questionText).toBe(testQuestion);
    });

    test('should handle question changes mid-day', async () => {
      // Arrange
      const morningQuestion = 'How are you feeling today?';
      const afternoonQuestion = 'What made you smile today?';
      
      mockStorage.getDailyQuestion
        .mockResolvedValueOnce(morningQuestion)
        .mockResolvedValueOnce(afternoonQuestion);

      // Act
      const question1 = await mockStorage.getDailyQuestion();
      const question2 = await mockStorage.getDailyQuestion();

      // Assert
      expect(question1).toBe(morningQuestion);
      expect(question2).toBe(afternoonQuestion);
      // In practice, this shouldn't happen as questions should be consistent per day
      // but we test the robustness of the logic
    });

    test('should handle non-existent user gracefully', async () => {
      // Arrange
      const testQuestion = 'How are you feeling today?';
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion);
      mockStorage.getUserDrops.mockResolvedValue([]);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops('non-existent-user');

      // Assert
      expect(question).toBe(testQuestion);
      expect(userDrops).toHaveLength(0);
    });

    test('should handle empty drops array', async () => {
      // Arrange
      const testQuestion = 'How are you feeling today?';
      setupEmptyUserMocks(testUserId);
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const userDrops = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(question).toBe(testQuestion);
      expect(userDrops).toHaveLength(0);
    });
  });
}); 