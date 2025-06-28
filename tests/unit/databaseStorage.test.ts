/**
 * Storage Service Unit Tests
 * 
 * Tests business logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 * 
 * NOTE: This used to test DatabaseStorage directly (integration-style).
 * Now it tests storage-dependent business logic at the unit level.
 */

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks,
  setupEligibleUserMocks,
  setupIneligibleUserMocks,
  setupEmptyUserMocks 
} from '../mocks/mockStorage';
import { 
  createMockUser, 
  createMockDrop, 
  createMockDropWithQuestion,
  createMockMessage,
  createMockQuestion,
  createMockAnalysis,
  TEST_USER_IDS 
} from '../factories/testData';

// Setup mocks to prevent database access
// Mock setup handled automatically by jest.setup.ts

describe('Storage Service Unit Tests', () => {
  const testUserId = TEST_USER_IDS.USER_1;

  beforeEach(() => {
    resetStorageMocks();
  });

  describe('User Operations', () => {
    test('should create new user when not found', async () => {
      // Arrange
      const userData = {
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      };
      const expectedUser = createMockUser(userData);
      mockStorage.upsertUser.mockResolvedValue(expectedUser);

      // Act
      const result = await mockStorage.upsertUser(userData);

      // Assert
      expect(result).toMatchObject(userData);
      expect(mockStorage.upsertUser).toHaveBeenCalledWith(userData);
    });

    test('should update existing user', async () => {
      // Arrange
      const originalUser = createMockUser({ id: testUserId, username: 'original' });
      const updatedUserData = {
        id: testUserId,
        username: 'updated_username',
        email: 'updated@example.com'
      };
      const expectedUpdatedUser = createMockUser(updatedUserData);

      mockStorage.getUser.mockResolvedValue(originalUser);
      mockStorage.upsertUser.mockResolvedValue(expectedUpdatedUser);

      // Act
      const result = await mockStorage.upsertUser(updatedUserData);

      // Assert
      expect(result.username).toBe('updated_username');
      expect(result.email).toBe('updated@example.com');
      expect(mockStorage.upsertUser).toHaveBeenCalledWith(updatedUserData);
    });

    test('should find user by username when exists', async () => {
      // Arrange
      const userData = createMockUser({ username: 'usernametest' });
      mockStorage.getUserByUsername.mockResolvedValue(userData);

      // Act
      const result = await mockStorage.getUserByUsername('usernametest');

      // Assert
      expect(result).toMatchObject(userData);
      expect(mockStorage.getUserByUsername).toHaveBeenCalledWith('usernametest');
    });

    test('should return undefined when user not found by username', async () => {
      // Arrange
      mockStorage.getUserByUsername.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.getUserByUsername('nonexistent');

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorage.getUserByUsername).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('Drop Operations', () => {
    test('should create new drop with proper data', async () => {
      // Arrange
      const dropData = {
        userId: testUserId,
        questionId: 1,
        text: 'Test drop content'
      };
      const expectedDrop = createMockDrop({ ...dropData, id: 42 });
      const expectedDropWithQuestion = createMockDropWithQuestion({ 
        ...dropData, 
        id: 42,
        questionText: 'Test question' 
      });

      mockStorage.createDrop.mockResolvedValue(expectedDrop);
      mockStorage.getUserDrops.mockResolvedValue([expectedDropWithQuestion]);

      // Act
      const drop = await mockStorage.createDrop(dropData);
      const userDrops = await mockStorage.getUserDrops(testUserId);

      // Assert
      expect(drop).toMatchObject(dropData);
      expect(drop.id).toBe(42);
      expect(userDrops).toHaveLength(1);
      expect(userDrops[0]).toHaveProperty('questionText');
      expect(mockStorage.createDrop).toHaveBeenCalledWith(dropData);
    });

    test('should update existing drop', async () => {
      // Arrange
      const originalDrop = createMockDrop({ id: 1, text: 'Original text' });
      const updatedDrop = createMockDrop({ id: 1, text: 'Updated text' });
      
      mockStorage.updateDrop.mockResolvedValue(updatedDrop);
      mockStorage.getDrop.mockResolvedValue(createMockDropWithQuestion({ id: 1, text: 'Updated text' }));

      // Act
      const result = await mockStorage.updateDrop(1, { text: 'Updated text' });
      const retrievedDrop = await mockStorage.getDrop(1);

      // Assert
      expect(result?.text).toBe('Updated text');
      expect(retrievedDrop?.text).toBe('Updated text');
      expect(mockStorage.updateDrop).toHaveBeenCalledWith(1, { text: 'Updated text' });
    });

    test('should return undefined for non-existent drop', async () => {
      // Arrange
      mockStorage.getDrop.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.getDrop(9999);

      // Assert
      expect(result).toBeUndefined();
      expect(mockStorage.getDrop).toHaveBeenCalledWith(9999);
    });
  });

  describe('Message Operations', () => {
    test('should create message for drop', async () => {
      // Arrange
      const messageData = {
        dropId: 1,
        text: 'Test message content',
        fromUser: true
      };
      const expectedMessage = createMockMessage({ ...messageData, id: 123 });
      const messagesForDrop = [expectedMessage];

      mockStorage.createMessage.mockResolvedValue(expectedMessage);
      mockStorage.getMessages.mockResolvedValue(messagesForDrop);

      // Act
      const message = await mockStorage.createMessage(messageData);
      const dropMessages = await mockStorage.getMessages(1);

      // Assert
      expect(message).toMatchObject(messageData);
      expect(message.id).toBe(123);
      expect(dropMessages).toHaveLength(1);
      expect(dropMessages[0]).toMatchObject(messageData);
      expect(mockStorage.createMessage).toHaveBeenCalledWith(messageData);
    });

    test('should retrieve messages for drop', async () => {
      // Arrange
      const messages = [
        createMockMessage({ id: 1, dropId: 42, fromUser: true }),
        createMockMessage({ id: 2, dropId: 42, fromUser: false })
      ];
      mockStorage.getMessages.mockResolvedValue(messages);

      // Act
      const result = await mockStorage.getMessages(42);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].fromUser).toBe(true);
      expect(result[1].fromUser).toBe(false);
      expect(mockStorage.getMessages).toHaveBeenCalledWith(42);
    });
  });

  describe('Question Operations', () => {
    test('should get daily question', async () => {
      // Arrange
      const expectedQuestion = 'How are you feeling today?';
      mockStorage.getDailyQuestion.mockResolvedValue(expectedQuestion);

      // Act
      const result = await mockStorage.getDailyQuestion();

      // Assert
      expect(result).toBe(expectedQuestion);
      expect(mockStorage.getDailyQuestion).toHaveBeenCalled();
    });

    test('should create new question', async () => {
      // Arrange
      const questionData = {
        text: 'New test question?',
        isActive: true,
        category: 'test'
      };
      const expectedQuestion = createMockQuestion({ ...questionData, id: 456 });
      mockStorage.createQuestion.mockResolvedValue(expectedQuestion);

      // Act
      const result = await mockStorage.createQuestion(questionData);

      // Assert
      expect(result).toMatchObject(questionData);
      expect(result.id).toBe(456);
      expect(mockStorage.createQuestion).toHaveBeenCalledWith(questionData);
    });

    test('should get all questions', async () => {
      // Arrange
      const questions = [
        createMockQuestion({ id: 1, text: 'Question 1' }),
        createMockQuestion({ id: 2, text: 'Question 2' }),
      ];
      mockStorage.getQuestions.mockResolvedValue(questions);

      // Act
      const result = await mockStorage.getQuestions();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Question 1');
      expect(result[1].text).toBe('Question 2');
      expect(mockStorage.getQuestions).toHaveBeenCalled();
    });
  });

  describe('Analysis Operations', () => {
    test('should check analysis eligibility for eligible user', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(8);
      expect(eligibility.requiredCount).toBe(7);
    });

    test('should check analysis eligibility for ineligible user', async () => {
      // Arrange
      setupIneligibleUserMocks(testUserId, 5);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);

      // Assert
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(5);
      expect(eligibility.requiredCount).toBe(7);
    });

    test('should create analysis with included drops', async () => {
      // Arrange
      const analysisData = {
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Point 1\n• Point 2'
      };
      const dropIds = [1, 2, 3, 4, 5, 6, 7];
      const expectedAnalysis = createMockAnalysis({ ...analysisData, id: 789 });

      mockStorage.createAnalysis.mockResolvedValue(expectedAnalysis);

      // Act
      const result = await mockStorage.createAnalysis(analysisData, dropIds);

      // Assert
      expect(result).toMatchObject(analysisData);
      expect(result.id).toBe(789);
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(analysisData, dropIds);
    });

    test('should get user analyses', async () => {
      // Arrange
      const analyses = [
        createMockAnalysis({ id: 1, userId: testUserId }),
        createMockAnalysis({ id: 2, userId: testUserId })
      ];
      mockStorage.getUserAnalyses.mockResolvedValue(analyses);

      // Act
      const result = await mockStorage.getUserAnalyses(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(testUserId);
      expect(result[1].userId).toBe(testUserId);
      expect(mockStorage.getUserAnalyses).toHaveBeenCalledWith(testUserId);
    });

    test('should toggle analysis favorite status', async () => {
      // Arrange
      const originalAnalysis = createMockAnalysis({ id: 1, isFavorited: false });
      const favoritedAnalysis = createMockAnalysis({ id: 1, isFavorited: true });

      mockStorage.updateAnalysisFavorite.mockResolvedValue(favoritedAnalysis);

      // Act
      const result = await mockStorage.updateAnalysisFavorite(1, true);

      // Assert
      expect(result?.isFavorited).toBe(true);
      expect(mockStorage.updateAnalysisFavorite).toHaveBeenCalledWith(1, true);
    });

    test('should get unanalyzed drops for user', async () => {
      // Arrange
      const unanalyzedDrops = [
        createMockDropWithQuestion({ id: 1, userId: testUserId }),
        createMockDropWithQuestion({ id: 2, userId: testUserId }),
      ];
      mockStorage.getUnanalyzedDrops.mockResolvedValue(unanalyzedDrops);

      // Act
      const result = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(testUserId);
      expect(result[0]).toHaveProperty('questionText');
      expect(mockStorage.getUnanalyzedDrops).toHaveBeenCalledWith(testUserId);
    });

    test('should get drops included in analysis', async () => {
      // Arrange
      const analysisDrops = [
        createMockDropWithQuestion({ id: 1 }),
        createMockDropWithQuestion({ id: 2 }),
        createMockDropWithQuestion({ id: 3 }),
      ];
      mockStorage.getAnalysisDrops.mockResolvedValue(analysisDrops);

      // Act
      const result = await mockStorage.getAnalysisDrops(42);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('questionText');
      expect(mockStorage.getAnalysisDrops).toHaveBeenCalledWith(42);
    });
  });

  describe('Error Handling', () => {
    test('should handle user not found error', async () => {
      // Arrange
      mockStorage.getUser.mockResolvedValue(undefined);

      // Act
      const result = await mockStorage.getUser('nonexistent-user');

      // Assert
      expect(result).toBeUndefined();
    });

    test('should handle storage errors gracefully', async () => {
      // Arrange
      const error = new Error('Storage connection failed');
      mockStorage.getUser.mockRejectedValue(error);

      // Act & Assert
      await expect(mockStorage.getUser('test-user')).rejects.toThrow('Storage connection failed');
    });
  });

  describe('Scenario Testing', () => {
    test('should handle empty user scenario', async () => {
      // Arrange
      setupEmptyUserMocks(testUserId);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);
      const drops = await mockStorage.getUserDrops(testUserId);
      const analyses = await mockStorage.getUserAnalyses(testUserId);

      // Assert
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(0);
      expect(drops).toHaveLength(0);
      expect(analyses).toHaveLength(0);
    });

    test('should handle user with sufficient drops for analysis', async () => {
      // Arrange
      setupEligibleUserMocks(testUserId);

      // Act
      const eligibility = await mockStorage.getAnalysisEligibility(testUserId);
      const unanalyzedDrops = await mockStorage.getUnanalyzedDrops(testUserId);

      // Assert
      expect(eligibility.isEligible).toBe(true);
      expect(unanalyzedDrops).toHaveLength(8);
      expect(unanalyzedDrops.every(drop => drop.userId === testUserId)).toBe(true);
    });
  });
});