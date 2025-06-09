import { DatabaseStorage } from '../../server/DatabaseStorage';
import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Mock the database to control its behavior in tests
jest.mock('../../server/db', () => {
  const { testDb } = require('../setup');
  return {
    db: testDb
  };
});

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;
  const testUserId = 'test-user-id';
  let testQuestionId: number;
  
  beforeAll(async () => {
    // Create test question
    const result = await testDb.insert(schema.questionTable).values({
      text: 'Test question for storage tests?',
      isActive: true,
      category: 'test',
      createdAt: new Date()
    }).returning();
    
    testQuestionId = result[0].id;
  });
  
  beforeEach(async () => {
    // Clean up database before each test
    await testDb.delete(schema.messages);
    await testDb.delete(schema.drops);
    
    // Create a fresh instance of DatabaseStorage for each test
    storage = new DatabaseStorage();
  });
  
  describe('User operations', () => {
    test('upsertUser creates a new user when not found', async () => {
      const userData = {
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      };
      
      const user = await storage.upsertUser(userData);
      
      expect(user).toMatchObject(userData);
      
      // Verify user was created in database
      const dbUser = await storage.getUser(testUserId);
      expect(dbUser).toMatchObject(userData);
    });
    
    test('upsertUser updates an existing user', async () => {
      // First create a user
      await storage.upsertUser({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      });
      
      // Then update the same user
      const updatedUserData = {
        id: testUserId,
        username: 'updated_username',
        email: 'updated@example.com'
      };
      
      const updatedUser = await storage.upsertUser(updatedUserData);
      
      expect(updatedUser).toMatchObject(updatedUserData);
      
      // Verify user was updated in database
      const dbUser = await storage.getUser(testUserId);
      expect(dbUser).toMatchObject(updatedUserData);
    });
    
    test('getUserByUsername returns a user when found', async () => {
      const userData = {
        id: testUserId,
        username: 'usernametest',
        email: 'test@example.com'
      };
      
      await storage.upsertUser(userData);
      
      const user = await storage.getUserByUsername('usernametest');
      
      expect(user).toMatchObject(userData);
    });
    
    test('getUserByUsername returns undefined when user not found', async () => {
      const user = await storage.getUserByUsername('nonexistent');
      
      expect(user).toBeUndefined();
    });
  });
  
  describe('Drop operations', () => {
    test('createDrop creates a new drop', async () => {
      // Create user first
      await storage.upsertUser({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      });
      
      const dropData = {
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Test drop content'
      };
      
      const drop = await storage.createDrop(dropData);
      
      expect(drop).toMatchObject(dropData);
      expect(drop).toHaveProperty('id');
      expect(drop).toHaveProperty('createdAt');
      
      // Verify drop appears in the user's drops
      const userDrops = await storage.getUserDrops(testUserId);
      expect(userDrops.length).toBe(1);
      expect(userDrops[0]).toMatchObject({
        ...dropData,
        questionText: expect.any(String)
      });
    });
    
    test('updateDrop updates an existing drop', async () => {
      // Create user
      await storage.upsertUser({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      });
      
      // Create drop
      const drop = await storage.createDrop({
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Original text'
      });
      
      // Update drop
      const updatedDrop = await storage.updateDrop(drop.id, {
        text: 'Updated text'
      });
      
      expect(updatedDrop).toHaveProperty('text', 'Updated text');
      
      // Verify update in database
      const retrievedDrop = await storage.getDrop(drop.id);
      expect(retrievedDrop).toHaveProperty('text', 'Updated text');
    });
    
    test('getDrop returns undefined for non-existent drop', async () => {
      const drop = await storage.getDrop(9999);
      
      expect(drop).toBeUndefined();
    });
  });
  
  describe('Message operations', () => {
    let testDropId: number;
    
    beforeEach(async () => {
      // Create user
      await storage.upsertUser({
        id: testUserId,
        username: 'testuser',
        email: 'test@example.com'
      });
      
      // Create drop for messages
      const drop = await storage.createDrop({
        userId: testUserId,
        questionId: testQuestionId,
        text: 'Drop for message tests'
      });
      
      testDropId = drop.id;
    });
    
    test('createMessage creates a new message', async () => {
      const messageData = {
        dropId: testDropId,
        text: 'Test message content',
        fromUser: true
      };
      
      const message = await storage.createMessage(messageData);
      
      expect(message).toMatchObject(messageData);
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('createdAt');
      
      // Verify message appears in drop's messages
      const messages = await storage.getMessages(testDropId);
      expect(messages.length).toBe(2); // 1 automatic initial message + 1 test message
      expect(messages[1]).toMatchObject(messageData); // The test message is the second one
    });
    
    test('getMessages returns messages in chronological order', async () => {
      // Create three messages with timestamps that come after the automatic initial message
      const baseTime = new Date(Date.now() + 60000); // Start 1 minute in the future
      
      // Message 1
      await testDb.insert(schema.messages).values({
        dropId: testDropId,
        text: 'First message',
        fromUser: true,
        createdAt: baseTime
      });
      
      // Message 2
      await testDb.insert(schema.messages).values({
        dropId: testDropId,
        text: 'Second message',
        fromUser: false,
        createdAt: new Date(baseTime.getTime() + 60000) // 1 minute later
      });
      
      // Message 3
      await testDb.insert(schema.messages).values({
        dropId: testDropId,
        text: 'Third message',
        fromUser: true,
        createdAt: new Date(baseTime.getTime() + 120000) // 2 minutes later
      });
      
      const messages = await storage.getMessages(testDropId);
      
      expect(messages.length).toBe(4); // 1 automatic initial message + 3 test messages
      // The automatic message should be first (oldest), then our test messages in order
      expect(messages[0].fromUser).toBe(false); // Automatic initial message from AI
      expect(messages[0].text).toBeTruthy(); // Should have some text content
      expect(messages[0].text.length).toBeGreaterThan(0); // Should not be empty
      expect(messages[1].text).toBe('First message');
      expect(messages[2].text).toBe('Second message');
      expect(messages[3].text).toBe('Third message');
    });
  });
  
  describe('Question operations', () => {
    test('getDailyQuestion returns a question string', async () => {
      const question = await storage.getDailyQuestion();
      
      expect(typeof question).toBe('string');
      expect(question.length).toBeGreaterThan(0);
    });

    test('getDailyQuestion returns consistent question for same day', async () => {
      // Mock Date constructor to return consistent date
      const originalDate = global.Date;
      const mockDate = new originalDate('2024-01-01T12:00:00Z');
      
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = originalDate.now;

      try {
        const question1 = await storage.getDailyQuestion();
        const question2 = await storage.getDailyQuestion();
        const question3 = await storage.getDailyQuestion();

        // All calls on same day should return same question
        expect(question1).toBe(question2);
        expect(question2).toBe(question3);
      } finally {
        // Restore original Date
        global.Date = originalDate;
      }
    });

    test('getDailyQuestion returns different questions for different days', async () => {
      const originalDate = global.Date;

      try {
        // Day 1
        global.Date = jest.fn(() => new originalDate('2024-01-01T12:00:00Z')) as any;
        global.Date.now = originalDate.now;
        const day1Question = await storage.getDailyQuestion();

        // Day 2  
        global.Date = jest.fn(() => new originalDate('2024-01-02T12:00:00Z')) as any;
        global.Date.now = originalDate.now;
        const day2Question = await storage.getDailyQuestion();

        // Day 3
        global.Date = jest.fn(() => new originalDate('2024-01-03T12:00:00Z')) as any;
        global.Date.now = originalDate.now;
        const day3Question = await storage.getDailyQuestion();

        // Different days should return different questions
        expect(day1Question).not.toBe(day2Question);
        expect(day2Question).not.toBe(day3Question);
        expect(day1Question).not.toBe(day3Question);
      } finally {
        global.Date = originalDate;
      }
    });

    test('getDailyQuestion cycles through all available questions', async () => {
      const originalDate = global.Date;

      try {
        // Get all active questions to determine pool size
        const allQuestions = await storage.getQuestions();
        const activeQuestions = allQuestions.filter(q => q.isActive);
        const poolSize = activeQuestions.length;

        const receivedQuestions = new Set();

        // Test enough days to cycle through entire pool + some extra
        for (let day = 1; day <= poolSize + 3; day++) {
          global.Date = jest.fn(() => new originalDate(`2024-01-${day.toString().padStart(2, '0')}T12:00:00Z`)) as any;
          global.Date.now = originalDate.now;
          const question = await storage.getDailyQuestion();
          receivedQuestions.add(question);
        }

        // Should have received multiple different questions
        expect(receivedQuestions.size).toBeGreaterThan(1);
        
        // If we have enough questions in the pool, we should see cycling
        if (poolSize >= 2) {
          expect(receivedQuestions.size).toBeGreaterThanOrEqual(2);
        }
      } finally {
        global.Date = originalDate;
      }
    });

    test('getDailyQuestion handles empty question pool gracefully', async () => {
      // Temporarily disable all questions
      const allQuestions = await storage.getQuestions();
      for (const question of allQuestions) {
        await storage.updateQuestion(question.id, { isActive: false });
      }

      try {
        const question = await storage.getDailyQuestion();
        
        // Should return fallback question
        expect(question).toBe('What brought you joy today?');
      } finally {
        // Re-enable all questions
        for (const question of allQuestions) {
          await storage.updateQuestion(question.id, { isActive: true });
        }
      }
    });
    
    test('getQuestions returns all questions', async () => {
      // Create a few test questions
      await testDb.insert(schema.questionTable).values([
        {
          text: 'Test question 1?',
          isActive: true,
          category: 'test',
          createdAt: new Date()
        },
        {
          text: 'Test question 2?',
          isActive: true,
          category: 'test',
          createdAt: new Date()
        }
      ]);
      
      const questions = await storage.getQuestions();
      
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThanOrEqual(3); // 1 from beforeAll + 2 from this test
      
      // Verify structure of question objects
      questions.forEach(question => {
        expect(question).toHaveProperty('id');
        expect(question).toHaveProperty('text');
        expect(question).toHaveProperty('isActive');
        expect(question).toHaveProperty('category');
      });
    });
    
    test('createQuestion creates a new question', async () => {
      const questionData = {
        text: 'New test question?',
        isActive: true,
        category: 'test'
      };
      
      const question = await storage.createQuestion(questionData);
      
      expect(question).toMatchObject(questionData);
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('createdAt');
      
      // Verify question exists in database
      const questions = await storage.getQuestions();
      const foundQuestion = questions.find(q => q.text === questionData.text);
      expect(foundQuestion).toBeDefined();
    });
    
    test('updateQuestion updates an existing question', async () => {
      // Create a question
      const question = await storage.createQuestion({
        text: 'Original question?',
        isActive: true,
        category: 'test'
      });
      
      // Update question
      const updatedQuestion = await storage.updateQuestion(question.id, {
        text: 'Updated question?',
        isActive: false
      });
      
      expect(updatedQuestion).toHaveProperty('text', 'Updated question?');
      expect(updatedQuestion).toHaveProperty('isActive', false);
      expect(updatedQuestion).toHaveProperty('category', 'test'); // unchanged
      
      // Verify update in database
      const questions = await storage.getQuestions();
      const foundQuestion = questions.find(q => q.id === question.id);
      expect(foundQuestion).toHaveProperty('text', 'Updated question?');
      expect(foundQuestion).toHaveProperty('isActive', false);
    });
  });
});