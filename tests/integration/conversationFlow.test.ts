import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';

// Mock the Claude API
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockImplementation(async (userMessage) => {
    return `AI response to: ${userMessage}`;
  }),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

describe('Full Conversation Flow', () => {
  let app: any;
  let testQuestionId: number;

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
      text: 'Test question for conversation flow?',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  test('Complete conversation flow: create drop, exchange messages, receive AI responses', async () => {
    // 1. Create a new drop
    const newDrop = {
      questionId: testQuestionId,
      text: 'Initial reflection on test question'
    };
    
    const dropResponse = await request(app)
      .post('/api/drops')
      .send(newDrop);
      
    expect(dropResponse.status).toBe(201);
    const dropId = dropResponse.body.id;
    
    // 2. Send first message
    const firstMessage = {
      dropId,
      text: 'I would like to discuss this further',
      fromUser: true
    };
    
    const firstMessageResponse = await request(app)
      .post('/api/messages')
      .send(firstMessage);
      
    expect(firstMessageResponse.status).toBe(201);
    
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Check messages - should have user message and AI response
    let messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.length).toBe(2);
    expect(messagesResponse.body[0].fromUser).toBe(true);
    expect(messagesResponse.body[0].text).toBe(firstMessage.text);
    expect(messagesResponse.body[1].fromUser).toBe(false);
    
    // 4. Send a follow-up message
    const secondMessage = {
      dropId,
      text: 'That\'s interesting, tell me more',
      fromUser: true
    };
    
    const secondMessageResponse = await request(app)
      .post('/api/messages')
      .send(secondMessage);
      
    expect(secondMessageResponse.status).toBe(201);
    
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Check all messages - should now have 4 messages in conversation
    messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.length).toBe(4);
    
    // Messages should alternate between user and AI
    expect(messagesResponse.body[0].fromUser).toBe(true);
    expect(messagesResponse.body[1].fromUser).toBe(false);
    expect(messagesResponse.body[2].fromUser).toBe(true);
    expect(messagesResponse.body[3].fromUser).toBe(false);
    
    // 6. Check that the drops list includes our drop
    const dropsResponse = await request(app).get('/api/drops');
    expect(dropsResponse.status).toBe(200);
    expect(dropsResponse.body.length).toBe(1);
    expect(dropsResponse.body[0].id).toBe(dropId);
    expect(dropsResponse.body[0].text).toBe(newDrop.text);
  });
});