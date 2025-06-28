import request from 'supertest';
import { getTestApp, TEST_USER_ID, cleanDatabase } from '../setup-server';
import { storage } from '../../server/storage';
import { generateResponse } from '../../server/services/anthropic';

// Mock the AI response generation
jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockResolvedValue('This is a mock AI response'),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

describe('Complete Conversation Flow', () => {
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
      text: 'What are your goals for today?',
      isActive: true,
      category: 'daily'
    });
    testQuestionId = question.id;
  });
  
  beforeEach(async () => {
    await cleanDatabase();
    
    // Reset the mock before each test
    (generateResponse as jest.Mock).mockClear();
  });
  
  test('Complete user journey from question to conversation', async () => {
    // Step 1: User sees the daily question
    const questionResponse = await request(app).get('/api/daily-question');
    expect(questionResponse.status).toBe(200);
    expect(questionResponse.body).toHaveProperty('question');
    expect(typeof questionResponse.body.question).toBe('string');
    
    // Step 2: User creates a drop (answers the daily question)
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'My goal is to complete this project and learn something new.'
      });
    
    expect(dropResponse.status).toBe(201);
    expect(dropResponse.body).toHaveProperty('id');
    expect(dropResponse.body).toHaveProperty('text', 'My goal is to complete this project and learn something new.');
    
    const dropId = dropResponse.body.id;
    
    // Step 3: User views their drops
    const dropsResponse = await request(app).get('/api/drops');
    expect(dropsResponse.status).toBe(200);
    expect(Array.isArray(dropsResponse.body)).toBe(true);
    expect(dropsResponse.body.length).toBe(1);
    expect(dropsResponse.body[0].id).toBe(dropId);
    
    // Step 4: User starts a conversation about the drop
    // First message from user
    const message1Response = await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: 'I want to discuss my goals.',
        fromUser: true
      });
    
    expect(message1Response.status).toBe(201);
    expect(message1Response.body).toHaveProperty('id');
    expect(message1Response.body).toHaveProperty('text', 'I want to discuss my goals.');
    expect(message1Response.body).toHaveProperty('fromUser', true);
    
    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for AI response
    const messagesResponse1 = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse1.status).toBe(200);
    expect(messagesResponse1.body.length).toBe(3); // 1 initial AI + 1 user + 1 AI response
    expect(messagesResponse1.body[2].fromUser).toBe(false); // Latest AI response
    
    // Step 5: User continues the conversation
    const message2Response = await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: 'I want to learn more about testing.',
        fromUser: true
      });
    
    expect(message2Response.status).toBe(201);
    
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for second AI response
    const messagesResponse2 = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse2.status).toBe(200);
    expect(messagesResponse2.body.length).toBe(5); // 1 initial AI + 2 user + 2 AI responses
    
    // Step 6: Verify message count is updated
    const updatedDropsResponse = await request(app).get('/api/drops');
    expect(updatedDropsResponse.status).toBe(200);
    const updatedDrop = updatedDropsResponse.body.find((drop: any) => drop.id === dropId);
    expect(updatedDrop).toBeTruthy();
    expect(updatedDrop.messageCount).toBe(5);
  });
  
  test('Error handling during conversation flow', async () => {
    // Create a drop first
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Test drop for error handling'
      });
    
    const dropId = dropResponse.body.id;
    
    // Test: Attempting to update non-existent drop
    const badUpdateResponse = await request(app)
      .patch(`/api/drops/9999`)
      .send({
        favorite: true
      });
    
    expect(badUpdateResponse.status).toBe(404);
    
    // Test: Attempting to send message to non-existent drop
    const badMessageResponse = await request(app)
      .post('/api/messages')
      .send({
        dropId: 9999,
        text: 'This should fail',
        fromUser: true
      });
    
    expect(badMessageResponse.status).toBe(404);
    
    // Test: Sending an empty message
    const emptyMessageResponse = await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: '',
        fromUser: true
      });
    
    expect(emptyMessageResponse.status).toBe(400);
    
    // Test: Sending a message with missing required fields
    const incompleteMessageResponse = await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId
        // Missing text and fromUser fields
      });
    
    expect(incompleteMessageResponse.status).toBe(400);
  });
  
  test('Conversation history is maintained between messages', async () => {
    // Create a drop
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Test drop for conversation history'
      });
    
    const dropId = dropResponse.body.id;
    
    // First message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: 'Message 1',
        fromUser: true
      });
    
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Second message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: 'Message 2',
        fromUser: true
      });
    
    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify the conversation history
    const messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.length).toBe(5); // 1 initial AI + 2 user + 2 AI responses
    
    // Verify messages are in the correct order (skipping the initial AI message)
    expect(messagesResponse.body[1].text).toBe('Message 1');
    expect(messagesResponse.body[1].fromUser).toBe(true);
    
    expect(messagesResponse.body[2].fromUser).toBe(false); // AI response
    
    expect(messagesResponse.body[3].text).toBe('Message 2');
    expect(messagesResponse.body[3].fromUser).toBe(true);
    
    expect(messagesResponse.body[4].fromUser).toBe(false); // AI response
    
    // Verify the AI was called with the correct drop ID (which contains conversation history)
    expect(generateResponse).toHaveBeenCalledTimes(2);
    const lastCall = (generateResponse as jest.Mock).mock.calls[1];
    expect(lastCall[1]).toBe(dropId); // Second argument should be dropId for history
  });
});