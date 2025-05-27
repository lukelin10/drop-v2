import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';
import { generateResponse } from '../../server/services/anthropic';

// Mock the Claude API response
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockResolvedValue('Test AI response'),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

describe('Messages API', () => {
  let app: any;
  let testQuestionId: number;
  let testDropId: number;

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create a test user
    await storage.upsertUser({
      id: TEST_USER_ID,
      username: 'testuser',
      email: 'test@example.com',
    });
    
    // Create a test question
    const question = await storage.createQuestion({
      text: 'Test question for messages?',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
    
    // Create a fresh test drop for each test
    const drop = await storage.createDrop({
      userId: TEST_USER_ID,
      questionId: testQuestionId,
      text: 'Test drop for messages'
    });
    testDropId = drop.id;
  });

  test('POST /api/messages creates a user message', async () => {
    const newMessage = {
      dropId: testDropId,
      text: 'Test user message',
      fromUser: true
    };
    
    const response = await request(app)
      .post('/api/messages')
      .send(newMessage);
      
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe(newMessage.text);
    expect(response.body.dropId).toBe(newMessage.dropId);
    expect(response.body.fromUser).toBe(true);
    
    // Verify the message was created
    const messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.length).toBe(2); // 1 automatic initial message + 1 user message
    expect(messagesResponse.body[1].text).toBe(newMessage.text); // User message is the second one
  });

  test('POST /api/messages returns 404 for non-existent drop', async () => {
    const nonExistentMessage = {
      dropId: 9999, // Non-existent ID
      text: 'Test message',
      fromUser: true
    };
    
    const response = await request(app)
      .post('/api/messages')
      .send(nonExistentMessage);
      
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });

  test('POST /api/messages returns 400 for invalid data', async () => {
    const invalidMessage = {
      // Missing required fields
    };
    
    const response = await request(app)
      .post('/api/messages')
      .send(invalidMessage);
      
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('errors');
  });

  test('POST /api/messages creates an AI response asynchronously', async () => {
    const userMessage = {
      dropId: testDropId,
      text: 'Hello AI assistant',
      fromUser: true
    };
    
    // Send user message
    const response = await request(app)
      .post('/api/messages')
      .send(userMessage);
      
    expect(response.status).toBe(201);
    
    // Wait a bit for the AI response to be generated (which happens asynchronously)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify both user message and AI response exist
    const messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.length).toBe(3); // 1 automatic initial message + 1 user message + 1 AI response
    
    // First message should be the automatic initial message
    expect(messagesResponse.body[0].fromUser).toBe(false);
    expect(messagesResponse.body[0].text).toContain('Thank you for sharing');
    
    // Second message should be from user
    expect(messagesResponse.body[1].fromUser).toBe(true);
    expect(messagesResponse.body[1].text).toBe(userMessage.text);
    
    // Third message should be from AI (using the mock from testServer.ts)
    expect(messagesResponse.body[2].fromUser).toBe(false);
    expect(messagesResponse.body[2].text).toBe('Test AI response to: Hello AI assistant');
  });
});