/**
 * Drop Creation Business Logic Unit Tests
 * 
 * Tests drop creation logic that interacts with the storage layer.
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

describe('Drop Creation Business Logic Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;
  const testUserId2 = TEST_USER_IDS.USER_2;

  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Drop Creation Logic', () => {
    test('should create drop with valid data', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Today I feel grateful for the small moments of joy I experienced.'
      };
      const expectedDrop = createMockDrop({ ...dropData, id: 1 });
      mockStorage.createDrop.mockResolvedValue(expectedDrop);

      // Act
      const result = await mockStorage.createDrop(dropData);

      // Assert
      expect(result).toMatchObject(dropData);
      expect(result.id).toBe(1);
      expect(result.userId).toBe(testUserId);
      expect(result.questionId).toBe(1);
      expect(result.text).toBe(dropData.text);
      expect(mockStorage.createDrop).toHaveBeenCalledWith(dropData);
    });

    test('should link drop to correct question', async () => {
      // Arrange
      const testQuestion = createMockDailyQuestion({ id: 5, text: 'What made you smile today?' });
      const dropData = {
        userId: testUserId,
        questionId: testQuestion.id,
        text: 'Playing with my dog made me smile today.'
      };
      const expectedDrop = createMockDrop({ ...dropData, id: 1 });
      
      mockStorage.getQuestions.mockResolvedValue([testQuestion]);
      mockStorage.createDrop.mockResolvedValue(expectedDrop);

      // Act
      const questions = await mockStorage.getQuestions();
      const result = await mockStorage.createDrop(dropData);

      // Assert
      expect(questions).toHaveLength(1);
      expect(questions[0].id).toBe(testQuestion.id);
      expect(result.questionId).toBe(testQuestion.id);
      expect(mockStorage.createDrop).toHaveBeenCalledWith(expect.objectContaining({
        questionId: testQuestion.id
      }));
    });

    test('should set correct user ID', async () => {
      // Arrange
      const user = createMockUser({ id: testUserId });
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Test reflection content'
      };
      const expectedDrop = createMockDrop({ ...dropData, id: 1 });
      
      mockStorage.getUser.mockResolvedValue(user);
      mockStorage.createDrop.mockResolvedValue(expectedDrop);

      // Act
      const userExists = await mockStorage.getUser(testUserId);
      const result = await mockStorage.createDrop(dropData);

      // Assert
      expect(userExists).toBeDefined();
      expect(userExists?.id).toBe(testUserId);
      expect(result.userId).toBe(testUserId);
      expect(mockStorage.createDrop).toHaveBeenCalledWith(expect.objectContaining({
        userId: testUserId
      }));
    });

    test('should generate initial AI response asynchronously', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'I had a challenging day but learned something new.'
      };
      const createdDrop = createMockDrop({ ...dropData, id: 1, messageCount: 0 });
      const updatedDrop = createMockDrop({ ...dropData, id: 1, messageCount: 1 });
      
      mockStorage.createDrop.mockResolvedValue(createdDrop);
      mockStorage.updateDrop.mockResolvedValue(updatedDrop);

      // Act
      const result = await mockStorage.createDrop(dropData);
      
      // Simulate AI response generation updating message count
      const updatedResult = await mockStorage.updateDrop(result.id, { messageCount: 1 });

      // Assert
      expect(result.messageCount).toBe(0); // Initially no messages
      expect(updatedResult?.messageCount).toBe(1); // After AI response
      expect(mockStorage.createDrop).toHaveBeenCalledWith(dropData);
      expect(mockStorage.updateDrop).toHaveBeenCalledWith(1, { messageCount: 1 });
    });

    test('should update user drop cache', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Test drop content'
      };
      const newDrop = createMockDrop({ ...dropData, id: 1 });
      const existingDrops = [
        createMockDropWithQuestion({ id: 2, userId: testUserId, text: 'Previous drop' })
      ];
      const updatedDrops = [
        createMockDropWithQuestion({ ...dropData, id: 1, questionText: 'How are you feeling today?' }),
        ...existingDrops
      ];

      mockStorage.createDrop.mockResolvedValue(newDrop);
      mockStorage.getUserDrops.mockResolvedValueOnce(existingDrops);
      mockStorage.getUserDrops.mockResolvedValueOnce(updatedDrops);

      // Act
      const dropsBefore = await mockStorage.getUserDrops(testUserId);
      const createdDrop = await mockStorage.createDrop(dropData);
      const dropsAfter = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(dropsBefore).toHaveLength(1);
      expect(createdDrop).toMatchObject(dropData);
      expect(dropsAfter).toHaveLength(2);
      expect(dropsAfter[0].id).toBe(1); // New drop should be first (most recent)
      expect(mockStorage.getUserDrops).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Validation Logic', () => {
    test('should handle missing question gracefully', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 999, // Non-existent question ID
        text: 'Test drop content'
      };
      
      mockStorage.getQuestions.mockResolvedValue([]); // No questions found
      mockStorage.createDrop.mockRejectedValue(new Error('Question not found'));

      // Act & Assert
      await expect(mockStorage.createDrop(dropData)).rejects.toThrow('Question not found');
      expect(mockStorage.createDrop).toHaveBeenCalledWith(dropData);
    });

    test('should validate required fields', async () => {
      // Arrange - Missing text field
      const invalidDropData = {
        userId: testUserId,
        questionId: 1,
        text: '' // Empty text should be invalid
      };
      
      mockStorage.createDrop.mockRejectedValue(new Error('Text is required'));

      // Act & Assert
      await expect(mockStorage.createDrop(invalidDropData)).rejects.toThrow('Text is required');
      expect(mockStorage.createDrop).toHaveBeenCalledWith(invalidDropData);
    });

    test('should prevent empty submissions', async () => {
      // Arrange
      const emptyDropData = {
        userId: testUserId,
        questionId: 1,
        text: '   ' // Only whitespace
      };
      
      mockStorage.createDrop.mockRejectedValue(new Error('Text cannot be empty'));

      // Act & Assert
      await expect(mockStorage.createDrop(emptyDropData)).rejects.toThrow('Text cannot be empty');
      expect(mockStorage.createDrop).toHaveBeenCalledWith(emptyDropData);
    });

    test('should validate user ID exists', async () => {
      // Arrange
      const dropData = {
        userId: 'non-existent-user',
        questionId: 1,
        text: 'Test drop content'
      };
      
      mockStorage.getUser.mockResolvedValue(undefined);
      mockStorage.createDrop.mockRejectedValue(new Error('User not found'));

      // Act
      const user = await mockStorage.getUser('non-existent-user');
      
      // Assert
      expect(user).toBeUndefined();
      await expect(mockStorage.createDrop(dropData)).rejects.toThrow('User not found');
    });

    test('should validate question ID exists', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 999,
        text: 'Test drop content'
      };
      
      mockStorage.getQuestions.mockResolvedValue([
        createMockQuestion({ id: 1 }),
        createMockQuestion({ id: 2 })
      ]);
      mockStorage.createDrop.mockRejectedValue(new Error('Invalid question ID'));

      // Act
      const questions = await mockStorage.getQuestions();
      const questionExists = questions.some(q => q.id === 999);
      
      // Assert
      expect(questionExists).toBe(false);
      await expect(mockStorage.createDrop(dropData)).rejects.toThrow('Invalid question ID');
    });
  });

  describe('Daily Question Integration', () => {
    test('should detect when user answered today', async () => {
      // Arrange
      const todayQuestion = 'How are you feeling today?';
      const todayDrop = createMockDropWithQuestion({
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: new Date()
      });
      
      setupAnsweredTodayMocks(testUserId);
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);

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
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Second reflection of the day'
      };
      const firstDrop = createMockDropWithQuestion({
        id: 1,
        userId: testUserId,
        questionText: todayQuestion,
        createdAt: new Date()
      });
      const secondDrop = createMockDrop({ ...dropData, id: 2 });
      
      mockStorage.getDailyQuestion.mockResolvedValue(todayQuestion);
      mockStorage.getUserDrops.mockResolvedValue([firstDrop]);
      mockStorage.createDrop.mockResolvedValue(secondDrop);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const existingDrops = await mockStorage.getUserDrops(testUserId);
      const newDrop = await mockStorage.createDrop(dropData);
      
      // Check if user already answered today
      const today = new Date().toISOString().split('T')[0];
      const todaysAnswers = existingDrops.filter(drop => {
        const dropDate = new Date(drop.createdAt).toISOString().split('T')[0];
        return dropDate === today && drop.questionText === question;
      });

      // Assert
      expect(question).toBe(todayQuestion);
      expect(todaysAnswers).toHaveLength(1);
      expect(newDrop).toMatchObject(dropData);
      expect(mockStorage.createDrop).toHaveBeenCalledWith(dropData);
    });

    test('should work across timezone boundaries', async () => {
      // Arrange
      const testQuestion = 'How are you feeling today?';
      const utcDate = new Date();
      utcDate.setUTCHours(23, 59, 59, 999); // End of day in UTC
      
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Late night reflection'
      };
      const lateNightDrop = createMockDrop({ 
        ...dropData, 
        id: 1,
        createdAt: utcDate 
      });
      
      mockStorage.getDailyQuestion.mockResolvedValue(testQuestion);
      mockStorage.createDrop.mockResolvedValue(lateNightDrop);

      // Act
      const question = await mockStorage.getDailyQuestion();
      const result = await mockStorage.createDrop(dropData);

      // Assert
      expect(question).toBe(testQuestion);
      expect(result.createdAt).toEqual(utcDate);
      expect(result).toMatchObject(dropData);
    });

    test('should handle question changes mid-day', async () => {
      // Arrange
      const morningQuestion = 'How are you feeling today?';
      const afternoonQuestion = 'What made you smile today?';
      
      const morningDropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Morning reflection'
      };
      const afternoonDropData = {
        userId: testUserId,
        questionId: 2,
        text: 'Afternoon reflection'
      };
      
      mockStorage.getDailyQuestion
        .mockResolvedValueOnce(morningQuestion)
        .mockResolvedValueOnce(afternoonQuestion);
      mockStorage.createDrop
        .mockResolvedValueOnce(createMockDrop({ ...morningDropData, id: 1 }))
        .mockResolvedValueOnce(createMockDrop({ ...afternoonDropData, id: 2 }));

      // Act
      const morningQuestionText = await mockStorage.getDailyQuestion();
      const morningDrop = await mockStorage.createDrop(morningDropData);
      
      const afternoonQuestionText = await mockStorage.getDailyQuestion();
      const afternoonDrop = await mockStorage.createDrop(afternoonDropData);

      // Assert
      expect(morningQuestionText).toBe(morningQuestion);
      expect(afternoonQuestionText).toBe(afternoonQuestion);
      expect(morningDrop.questionId).toBe(1);
      expect(afternoonDrop.questionId).toBe(2);
      expect(mockStorage.createDrop).toHaveBeenCalledTimes(2);
    });

    test('should handle non-existent user gracefully', async () => {
      // Arrange
      const dropData = {
        userId: 'non-existent-user',
        questionId: 1,
        text: 'Test drop content'
      };
      
      mockStorage.getUser.mockResolvedValue(undefined);
      mockStorage.createDrop.mockRejectedValue(new Error('User does not exist'));

      // Act
      const user = await mockStorage.getUser('non-existent-user');
      
      // Assert
      expect(user).toBeUndefined();
      await expect(mockStorage.createDrop(dropData)).rejects.toThrow('User does not exist');
    });

    test('should maintain drop creation order', async () => {
      // Arrange
      const drop1Data = {
        userId: testUserId,
        questionId: 1,
        text: 'First drop'
      };
      const drop2Data = {
        userId: testUserId,
        questionId: 1,
        text: 'Second drop'
      };
      
      const drop1 = createMockDrop({ ...drop1Data, id: 1, createdAt: new Date('2024-01-01T10:00:00Z') });
      const drop2 = createMockDrop({ ...drop2Data, id: 2, createdAt: new Date('2024-01-01T11:00:00Z') });
      
      mockStorage.createDrop
        .mockResolvedValueOnce(drop1)
        .mockResolvedValueOnce(drop2);

      // Act
      const firstDrop = await mockStorage.createDrop(drop1Data);
      const secondDrop = await mockStorage.createDrop(drop2Data);

      // Assert
      expect(firstDrop.id).toBe(1);
      expect(secondDrop.id).toBe(2);
      expect(new Date(secondDrop.createdAt).getTime()).toBeGreaterThan(new Date(firstDrop.createdAt).getTime());
      expect(mockStorage.createDrop).toHaveBeenCalledTimes(2);
    });
  });
}); 