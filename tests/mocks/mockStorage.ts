/**
 * Mock Storage Service
 * 
 * Comprehensive mock setup for the storage service that replaces database operations
 * with Jest mocks. This should be used in all unit tests to prevent database connections.
 */

import type { IStorage } from '../../server/storage';
import { 
  createMockUser,
  createMockDrop,
  createMockDropWithQuestion,
  createMockMessage,
  createMockQuestion,
  createMockAnalysis,
  createMockAnalysisEligibility
} from '../factories/testData';

/**
 * Creates a complete mock of the storage service with all methods mocked
 * All methods return Promise.resolve() with mock data by default
 */
export const createMockStorage = (): jest.Mocked<IStorage> => ({
  // User methods
  getUser: jest.fn().mockResolvedValue(createMockUser()),
  getUserByUsername: jest.fn().mockResolvedValue(createMockUser()),
  upsertUser: jest.fn().mockImplementation(async (userData) => 
    createMockUser(userData)
  ),

  // Drop/Journal Entry methods
  getDrops: jest.fn().mockResolvedValue([createMockDropWithQuestion()]),
  getUserDrops: jest.fn().mockResolvedValue([createMockDropWithQuestion()]),
  getDrop: jest.fn().mockResolvedValue(createMockDropWithQuestion()),
  createDrop: jest.fn().mockImplementation(async (dropData) => 
    createMockDrop({ ...dropData, id: 1 })
  ),
  updateDrop: jest.fn().mockImplementation(async (id, updates) => 
    createMockDrop({ id, ...updates })
  ),

  // Message methods
  getMessages: jest.fn().mockResolvedValue([createMockMessage()]),
  createMessage: jest.fn().mockImplementation(async (messageData) => 
    createMockMessage({ ...messageData, id: 1 })
  ),

  // Daily Question methods
  getDailyQuestion: jest.fn().mockResolvedValue('How are you feeling today?'),

  // Question management methods
  getQuestions: jest.fn().mockResolvedValue([createMockQuestion()]),
  createQuestion: jest.fn().mockImplementation(async (questionData) => 
    createMockQuestion({ ...questionData, id: 1 })
  ),
  updateQuestion: jest.fn().mockImplementation(async (id, updates) => 
    createMockQuestion({ id, ...updates })
  ),

  // Analysis methods
  createAnalysis: jest.fn().mockImplementation(async (analysisData) => 
    createMockAnalysis({ ...analysisData, id: 1 })
  ),
  getUserAnalyses: jest.fn().mockResolvedValue([createMockAnalysis()]),
  getAnalysis: jest.fn().mockResolvedValue(createMockAnalysis()),
  updateAnalysisFavorite: jest.fn().mockImplementation(async (id, isFavorited) => 
    createMockAnalysis({ id, isFavorited })
  ),
  getAnalysisEligibility: jest.fn().mockResolvedValue(createMockAnalysisEligibility()),
  getUnanalyzedDrops: jest.fn().mockResolvedValue([createMockDropWithQuestion()]),
  getAnalysisDrops: jest.fn().mockResolvedValue([createMockDropWithQuestion()]),
});

/**
 * Default mock storage instance
 * Can be imported and used directly in tests
 */
export const mockStorage = createMockStorage();

/**
 * Mock setup for server/storage module
 * Use this in jest.mock() calls
 */
export const mockStorageModule = {
  storage: mockStorage
};

/**
 * Complete mock setup for DatabaseStorage class
 * Use this to mock the DatabaseStorage constructor
 */
export const MockDatabaseStorage = jest.fn().mockImplementation(() => mockStorage);

/**
 * Utility functions for common test scenarios
 */

/**
 * Sets up storage mocks for a user who is eligible for analysis
 */
export const setupEligibleUserMocks = (userId: string = 'test-user-1') => {
  mockStorage.getAnalysisEligibility.mockResolvedValue({
    isEligible: true,
    unanalyzedCount: 8,
    requiredCount: 7
  });
  
  mockStorage.getUnanalyzedDrops.mockResolvedValue([
    createMockDropWithQuestion({ id: 1, userId }),
    createMockDropWithQuestion({ id: 2, userId }),
    createMockDropWithQuestion({ id: 3, userId }),
    createMockDropWithQuestion({ id: 4, userId }),
    createMockDropWithQuestion({ id: 5, userId }),
    createMockDropWithQuestion({ id: 6, userId }),
    createMockDropWithQuestion({ id: 7, userId }),
    createMockDropWithQuestion({ id: 8, userId }),
  ]);
};

/**
 * Sets up storage mocks for a user who is NOT eligible for analysis
 */
export const setupIneligibleUserMocks = (userId: string = 'test-user-1', dropCount: number = 5) => {
  mockStorage.getAnalysisEligibility.mockResolvedValue({
    isEligible: false,
    unanalyzedCount: dropCount,
    requiredCount: 7
  });
  
  const drops = Array.from({ length: dropCount }, (_, i) => 
    createMockDropWithQuestion({ id: i + 1, userId })
  );
  
  mockStorage.getUnanalyzedDrops.mockResolvedValue(drops);
};

/**
 * Sets up storage mocks for a user with no drops
 */
export const setupEmptyUserMocks = (userId: string = 'test-user-1') => {
  mockStorage.getAnalysisEligibility.mockResolvedValue({
    isEligible: false,
    unanalyzedCount: 0,
    requiredCount: 7
  });
  
  mockStorage.getUnanalyzedDrops.mockResolvedValue([]);
  mockStorage.getUserDrops.mockResolvedValue([]);
  mockStorage.getUserAnalyses.mockResolvedValue([]);
};

/**
 * Resets all mock functions to their default state
 */
export const resetStorageMocks = () => {
  Object.values(mockStorage).forEach(mockFn => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockClear();
    }
  });
  
  // Restore default implementations
  const newMockStorage = createMockStorage();
  Object.keys(mockStorage).forEach(key => {
    (mockStorage as any)[key] = (newMockStorage as any)[key];
  });
};

/**
 * Sets up mock to throw an error for testing error scenarios
 */
export const setupStorageErrorMocks = (methodName: keyof IStorage, error: Error) => {
  (mockStorage[methodName] as jest.Mock).mockRejectedValue(error);
};

/**
 * Sets up storage mocks for daily question scenarios
 */
export const setupDailyQuestionMocks = (testUserId: string = 'test-user-1') => {
  // Set up user with today's question not answered yet
  mockStorage.getDailyQuestion.mockResolvedValue('How are you feeling today?');
  mockStorage.getUser.mockResolvedValue(createMockUser({ id: testUserId }));
  mockStorage.getUserDrops.mockResolvedValue([]);
};

/**
 * Sets up storage mocks for user who already answered today
 */
export const setupAnsweredTodayMocks = (testUserId: string = 'test-user-1') => {
  // Set up user who already answered today
  const todaysDrop = createMockDropWithQuestion({ 
    userId: testUserId, 
    createdAt: new Date(),
    questionText: 'How are you feeling today?'
  });
  mockStorage.getDailyQuestion.mockResolvedValue('How are you feeling today?');
  mockStorage.getUserDrops.mockResolvedValue([todaysDrop]);
};

/**
 * Sets up storage mocks for message and conversation scenarios
 */
export const setupMessageConversationMocks = (testUserId: string = 'test-user-1', testDropId: number = 1) => {
  // Set up user and drop
  mockStorage.getUser.mockResolvedValue(createMockUser({ id: testUserId }));
  mockStorage.getDrop.mockResolvedValue(createMockDropWithQuestion({ 
    id: testDropId, 
    userId: testUserId 
  }));
  
  // Set up empty messages initially
  mockStorage.getMessages.mockResolvedValue([]);
  
  // Set up message creation to return created message
  mockStorage.createMessage.mockImplementation(async (messageData) => {
    return createMockMessage({
      id: Math.floor(Math.random() * 1000),
      ...messageData
    });
  });
};

/**
 * Sets up storage mocks for conversation with messages
 */
export const setupConversationWithMessagesMocks = (testUserId: string = 'test-user-1', testDropId: number = 1, messageCount: number = 4) => {
  // Set up user and drop
  mockStorage.getUser.mockResolvedValue(createMockUser({ id: testUserId }));
  mockStorage.getDrop.mockResolvedValue(createMockDropWithQuestion({ 
    id: testDropId, 
    userId: testUserId 
  }));
  
  // Set up messages for the conversation
  const messages = Array.from({ length: messageCount }, (_, i) => 
    createMockMessage({
      id: i + 1,
      dropId: testDropId,
      text: `${i % 2 === 0 ? 'User' : 'AI'} message ${i + 1}`,
      fromUser: i % 2 === 0
    })
  );
  mockStorage.getMessages.mockResolvedValue(messages);
  
  // Set up message creation
  mockStorage.createMessage.mockImplementation(async (messageData) => {
    return createMockMessage({
      id: Math.floor(Math.random() * 1000),
      ...messageData
    });
  });
}; 