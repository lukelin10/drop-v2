/**
 * Mock Data Generators for Tests
 * 
 * Provides helper functions to generate test data without database operations.
 * Uses the factory system to create realistic mock objects.
 * 
 * NOTE: This used to contain database helper functions.
 * Now it provides pure mock data generators for unit tests.
 */

import { 
  createMockDrop, 
  createMockMessage, 
  createMockQuestion,
  createMockDropWithQuestion,
  TEST_USER_IDS 
} from '../factories/testData';
import type { Drop, Message, Question, DropWithQuestion } from '../../shared/schema';

// Track generated IDs to ensure uniqueness within a test session
let nextDropId = 1;
let nextMessageId = 1;
let nextQuestionId = 1;

/**
 * Resets ID counters (call this in beforeEach)
 */
export function resetTestIds() {
  nextDropId = 1;
  nextMessageId = 1;
  nextQuestionId = 1;
}

/**
 * Creates a test drop with specified or default properties
 */
export function createTestDrop(options: {
  userId?: string;
  questionId?: number;
  text?: string;
  id?: number;
}): Drop {
  const { 
    userId = TEST_USER_IDS.USER_1, 
    questionId = 1, 
    text = 'Test drop content',
    id = nextDropId++
  } = options;
  
  return createMockDrop({
    id,
    userId,
    questionId,
    text,
    messageCount: 0,
    createdAt: new Date(),
  });
}

/**
 * Creates a test message with specified or default properties
 */
export function createTestMessage(options: {
  dropId: number;
  text?: string;
  fromUser?: boolean;
  id?: number;
}): Message {
  const { 
    dropId, 
    text = 'Test message', 
    fromUser = true,
    id = nextMessageId++
  } = options;
  
  return createMockMessage({
    id,
    dropId,
    text,
    fromUser,
    createdAt: new Date()
  });
}

/**
 * Creates a test question with specified or default properties
 */
export function createTestQuestion(options: {
  text?: string;
  isActive?: boolean;
  category?: string;
  id?: number;
}): Question {
  const { 
    text = 'Test question?', 
    isActive = true, 
    category = 'test',
    id = nextQuestionId++
  } = options;
  
  return createMockQuestion({
    id,
    text,
    isActive,
    category,
    createdAt: new Date(),
    lastUsedAt: null,
    usageCount: 0
  });
}

/**
 * Creates a test drop with question text included
 */
export function createTestDropWithQuestion(options: {
  userId?: string;
  questionId?: number;
  text?: string;
  questionText?: string;
  id?: number;
}): DropWithQuestion {
  const {
    userId = TEST_USER_IDS.USER_1,
    questionId = 1,
    text = 'Test drop content',
    questionText = 'Test question?',
    id = nextDropId++
  } = options;

  return createMockDropWithQuestion({
    id,
    userId,
    questionId,
    text,
    questionText,
    messageCount: 0,
    createdAt: new Date()
  });
}

/**
 * Generates mock drops for a user (replaces database query)
 */
export function getDropsForUser(userId: string, count: number = 5): Drop[] {
  return Array.from({ length: count }, (_, i) => 
    createTestDrop({ 
      userId, 
      id: i + 1,
      text: `Drop ${i + 1} for user ${userId}`
    })
  );
}

/**
 * Generates mock messages for a drop (replaces database query)
 */
export function getMessagesForDrop(dropId: number, count: number = 3): Message[] {
  return Array.from({ length: count }, (_, i) => 
    createTestMessage({ 
      dropId, 
      id: i + 1,
      text: `Message ${i + 1} for drop ${dropId}`,
      fromUser: i % 2 === 0
    })
  );
}

/**
 * Creates a complete test conversation (drop + messages)
 */
export function createTestConversation(options: {
  userId?: string;
  questionId?: number;
  dropText?: string;
  messageCount?: number;
}) {
  const {
    userId = TEST_USER_IDS.USER_1,
    questionId = 1,
    dropText = 'Test conversation drop',
    messageCount = 4
  } = options;

  const drop = createTestDrop({ userId, questionId, text: dropText });
  const messages = getMessagesForDrop(drop.id, messageCount);

  return { drop, messages };
}

/**
 * Creates multiple test users with their drops
 */
export function createTestUsersWithDrops(userCount: number = 2, dropsPerUser: number = 3) {
  return Array.from({ length: userCount }, (_, userIndex) => {
    const userId = `test-user-${userIndex + 1}`;
    const drops = getDropsForUser(userId, dropsPerUser);
    
    return {
      userId,
      drops,
      dropCount: drops.length
    };
  });
}

/**
 * Creates test data for analysis scenarios
 */
export function createAnalysisTestData(options: {
  userId?: string;
  eligibleDropCount?: number;
  ineligibleDropCount?: number;
}) {
  const {
    userId = TEST_USER_IDS.USER_1,
    eligibleDropCount = 8,
    ineligibleDropCount = 5
  } = options;

  return {
    eligibleUser: {
      userId,
      drops: getDropsForUser(userId, eligibleDropCount),
      isEligible: eligibleDropCount >= 7
    },
    ineligibleUser: {
      userId: `${userId}-ineligible`,
      drops: getDropsForUser(`${userId}-ineligible`, ineligibleDropCount),
      isEligible: ineligibleDropCount >= 7
    }
  };
}

/**
 * Creates test questions with different categories
 */
export function createTestQuestions(count: number = 5): Question[] {
  const categories = ['general', 'reflection', 'mood', 'goals', 'gratitude'];
  
  return Array.from({ length: count }, (_, i) => 
    createTestQuestion({
      id: i + 1,
      text: `Test question ${i + 1}?`,
      category: categories[i % categories.length],
      isActive: i < count - 1 // Last one inactive for testing
    })
  );
}

/**
 * Creates bulk test data for performance testing
 */
export function createBulkTestData(options: {
  userCount?: number;
  dropsPerUser?: number;
  messagesPerDrop?: number;
}) {
  const {
    userCount = 10,
    dropsPerUser = 20,
    messagesPerDrop = 5
  } = options;

  const users = Array.from({ length: userCount }, (_, i) => ({
    userId: `bulk-user-${i + 1}`,
    drops: getDropsForUser(`bulk-user-${i + 1}`, dropsPerUser),
    totalMessages: dropsPerUser * messagesPerDrop
  }));

  return {
    users,
    totalUsers: userCount,
    totalDrops: userCount * dropsPerUser,
    totalMessages: userCount * dropsPerUser * messagesPerDrop
  };
}

/**
 * Helper to create realistic test scenarios
 */
export const TestScenarios = {
  // User just started, no analysis eligibility
  newUser: () => ({
    userId: 'new-user',
    drops: getDropsForUser('new-user', 2),
    isEligible: false
  }),

  // User close to analysis eligibility
  almostEligible: () => ({
    userId: 'almost-eligible-user',
    drops: getDropsForUser('almost-eligible-user', 6),
    isEligible: false
  }),

  // User eligible for analysis
  eligible: () => ({
    userId: 'eligible-user',
    drops: getDropsForUser('eligible-user', 8),
    isEligible: true
  }),

  // Active user with many drops
  activeUser: () => ({
    userId: 'active-user',
    drops: getDropsForUser('active-user', 20),
    isEligible: true,
    hasMultipleAnalyses: true
  }),

  // Complete conversation flow
  fullConversation: () => createTestConversation({
    userId: 'conversation-user',
    questionId: 1,
    dropText: 'Today I reflected on my personal growth and realized how much I\'ve changed.',
    messageCount: 6
  })
};