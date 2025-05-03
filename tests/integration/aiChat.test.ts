import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';
import { generateResponse } from '../../server/services/anthropic';

// Mock different responses based on message content
const mockGenerateResponse = jest.fn().mockImplementation((userMessage: string) => {
  if (userMessage.includes('hello')) {
    return Promise.resolve('Hello! How are you feeling today?');
  }
  if (userMessage.includes('sad')) {
    return Promise.resolve('I\'m sorry to hear you\'re feeling sad. Would you like to talk about what\'s troubling you?');
  }
  if (userMessage.includes('happy')) {
    return Promise.resolve('That\'s wonderful! What has been bringing you joy recently?');
  }
  // Default response
  return Promise.resolve(`I'm here to listen and provide guidance. Tell me more about your thoughts.`);
});

// Override the mock from testServer.ts with our more sophisticated mock
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: mockGenerateResponse,
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

describe('AI-Powered Chat', () => {
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
      text: 'How are you feeling today?',
      isActive: true,
      category: 'daily'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
    
    // Create a fresh test drop for each test
    const drop = await storage.createDrop({
      userId: TEST_USER_ID,
      questionId: testQuestionId,
      text: 'Reflecting on my feelings'
    });
    testDropId = drop.id;
    
    // Reset the mock before each test
    mockGenerateResponse.mockClear();
  });

  test('AI responds differently based on message content', async () => {
    // Test with "hello" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'hello there',
        fromUser: true
      });
      
    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the response
    let messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(2);
    expect(messagesResponse.body[1].fromUser).toBe(false);
    expect(messagesResponse.body[1].text).toContain('How are you feeling today?');
    
    // Test with "sad" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'I feel sad today',
        fromUser: true
      });
      
    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the response
    messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(4);
    expect(messagesResponse.body[3].fromUser).toBe(false);
    expect(messagesResponse.body[3].text).toContain('sorry to hear you\'re feeling sad');
    
    // Test with "happy" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'Actually I\'m feeling happy now',
        fromUser: true
      });
      
    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the response
    messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(6);
    expect(messagesResponse.body[5].fromUser).toBe(false);
    expect(messagesResponse.body[5].text).toContain('wonderful');
  });

  test('AI receives conversation history for contextual responses', async () => {
    // First message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'hello there',
        fromUser: true
      });
      
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second message referring to the first
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'Can we talk about what I mentioned earlier?',
        fromUser: true
      });
      
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // The generateResponse function should have been called with the user message
    // and the drop ID, which allows it to fetch conversation history
    expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
    expect(mockGenerateResponse.mock.calls[1][0]).toBe('Can we talk about what I mentioned earlier?');
    expect(mockGenerateResponse.mock.calls[1][1]).toBe(testDropId);
  });
});