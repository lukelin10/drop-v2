/**
 * Test Data Factories
 * 
 * Simple factory functions for creating mock test data.
 * These factories provide consistent, realistic test data while allowing
 * customization through overrides.
 */

import type {
  User,
  Drop,
  Message,
  Question,
  Analysis,
  AnalysisDrop,
  DropWithQuestion
} from '../../shared/schema';

// Test constants for consistent data
export const TEST_DATES = {
  PAST: new Date('2024-01-01'),
  RECENT: new Date('2024-01-15'),
  NOW: new Date('2024-01-20'),
} as const;

export const TEST_USER_IDS = {
  USER_1: 'test-user-1',
  USER_2: 'test-user-2',
  USER_3: 'test-user-3',
} as const;

/**
 * Creates a mock user with realistic default values
 */
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: TEST_USER_IDS.USER_1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  name: 'Test User',
  lastName: 'User',
  bio: 'Test user bio',
  profileImageUrl: null,
  createdAt: TEST_DATES.PAST,
  updatedAt: TEST_DATES.RECENT,
  lastAnalysisDate: null,
  ...overrides
});

/**
 * Creates a mock question with realistic default values
 */
export const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 1,
  text: 'How are you feeling today?',
  isActive: true,
  createdAt: TEST_DATES.PAST,
  lastUsedAt: TEST_DATES.RECENT,
  usageCount: 5,
  category: 'general',
  ...overrides
});

/**
 * Creates a mock drop (journal entry) with realistic default values
 */
export const createMockDrop = (overrides: Partial<Drop> = {}): Drop => ({
  id: 1,
  questionId: 1,
  text: 'Today I feel grateful for the small moments of joy I experienced.',
  createdAt: TEST_DATES.RECENT,
  messageCount: 2,
  userId: TEST_USER_IDS.USER_1,
  ...overrides
});

/**
 * Creates a mock drop with question text included
 */
export const createMockDropWithQuestion = (overrides: Partial<DropWithQuestion> = {}): DropWithQuestion => ({
  ...createMockDrop(overrides),
  questionText: 'How are you feeling today?',
  ...overrides
});

/**
 * Creates a mock message with realistic default values
 */
export const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 1,
  dropId: 1,
  text: 'That sounds like a really meaningful reflection.',
  fromUser: false,
  createdAt: TEST_DATES.RECENT,
  ...overrides
});

/**
 * Creates a mock analysis with realistic default values
 */
export const createMockAnalysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  id: 1,
  userId: TEST_USER_IDS.USER_1,
  content: 'Your recent journal entries show a pattern of mindful gratitude and self-reflection. You consistently acknowledge both challenges and positive moments, demonstrating emotional balance and growth mindset.\n\nThis practice of recognizing small joys while processing difficulties indicates developing resilience and emotional intelligence. Your writing shows increased self-awareness over time.\n\nContinue this balanced approach to reflection, as it builds a strong foundation for personal growth and mental well-being.',
  summary: 'Growing self-awareness through balanced reflection',
  bulletPoints: '• Strong practice of gratitude and mindfulness\n• Balanced emotional processing of challenges\n• Increasing self-awareness over time\n• Developing resilience and growth mindset\n• Foundation for continued personal growth',
  createdAt: TEST_DATES.NOW,
  isFavorited: false,
  ...overrides
});

/**
 * Creates a mock analysis-drop relationship
 */
export const createMockAnalysisDrop = (overrides: Partial<AnalysisDrop> = {}): AnalysisDrop => ({
  id: 1,
  analysisId: 1,
  dropId: 1,
  createdAt: TEST_DATES.NOW,
  ...overrides
});

/**
 * Creates multiple mock users with different characteristics
 */
export const createMockUsers = (count: number): User[] =>
  Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `test-user-${i + 1}`,
      username: `testuser${i + 1}`,
      email: `test${i + 1}@example.com`,
      firstName: `Test${i + 1}`,
    })
  );

/**
 * Creates multiple mock drops with varying dates
 */
export const createMockDrops = (count: number, userId: string = TEST_USER_IDS.USER_1): Drop[] =>
  Array.from({ length: count }, (_, i) =>
    createMockDrop({
      id: i + 1,
      questionId: (i % 3) + 1, // Rotate through 3 questions
      text: `Journal entry ${i + 1}: Reflecting on today's experiences and growth.`,
      userId,
      createdAt: new Date(TEST_DATES.RECENT.getTime() + i * 24 * 60 * 60 * 1000), // Spread over days
    })
  );

/**
 * Creates multiple mock messages for a drop
 */
export const createMockMessages = (dropId: number, count: number = 2): Message[] => [
  createMockMessage({
    id: 1,
    dropId,
    text: 'I had a really meaningful conversation with a friend today.',
    fromUser: true,
  }),
  createMockMessage({
    id: 2,
    dropId,
    text: 'That sounds wonderful! What made it feel so meaningful to you?',
    fromUser: false,
  }),
  ...Array.from({ length: count - 2 }, (_, i) =>
    createMockMessage({
      id: i + 3,
      dropId,
      text: `Follow-up message ${i + 1}`,
      fromUser: i % 2 === 0,
    })
  )
];

/**
 * Creates a complete mock conversation (drop + messages)
 */
export const createMockConversation = (dropId: number = 1, messageCount: number = 4) => ({
  drop: createMockDrop({ id: dropId, messageCount }),
  messages: createMockMessages(dropId, messageCount),
});

/**
 * Creates mock data for analysis eligibility testing
 */
export const createMockAnalysisEligibility = (overrides: Partial<{
  isEligible: boolean;
  unanalyzedCount: number;
  requiredCount: number;
}> = {}) => ({
  isEligible: true,
  unanalyzedCount: 5,
  requiredCount: 3,
  ...overrides
});

/**
 * Creates a mock question for daily question scenarios
 */
export const createMockDailyQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 1,
  text: 'How are you feeling today?',
  isActive: true,
  createdAt: TEST_DATES.PAST,
  lastUsedAt: TEST_DATES.RECENT,
  usageCount: 5,
  category: 'daily',
  ...overrides
});

/**
 * Creates a mock drop with today's date for daily question testing
 */
export const createMockDropWithToday = (overrides: Partial<Drop> = {}): Drop => ({
  ...createMockDrop(overrides),
  createdAt: new Date(), // Today's date
});

/**
 * Creates mock analysis creation result
 */
export const createMockAnalysisResult = (success: boolean = true, overrides: any = {}) => ({
  success,
  analysis: success ? createMockAnalysis() : undefined,
  error: success ? undefined : 'Mock analysis creation failed',
  metadata: {
    userId: TEST_USER_IDS.USER_1,
    dropCount: 7,
    processingTime: 1500,
    ...overrides.metadata
  },
  ...overrides
}); 