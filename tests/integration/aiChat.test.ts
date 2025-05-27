import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';
import { generateResponse } from '../../server/services/anthropic';

// Get the mocked function from the global mock (set up in testServer.ts)
const mockGenerateResponse = generateResponse as jest.MockedFunction<typeof generateResponse>;

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
    expect(messagesResponse.body.length).toBe(3); // 1 automatic initial + 1 user + 1 AI response
    expect(messagesResponse.body[2].fromUser).toBe(false);
    expect(messagesResponse.body[2].text).toContain('Test AI response to: hello there');
    
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
    expect(messagesResponse.body.length).toBe(5); // 1 automatic initial + 2 user + 2 AI responses
    expect(messagesResponse.body[4].fromUser).toBe(false);
    expect(messagesResponse.body[4].text).toContain('Test AI response to: I feel sad today');
    
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
    expect(messagesResponse.body.length).toBe(7); // 1 automatic initial + 3 user + 3 AI responses
    expect(messagesResponse.body[6].fromUser).toBe(false);
    expect(messagesResponse.body[6].text).toContain('Test AI response to: Actually I\'m feeling happy now');
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