import request from 'supertest';
import { getTestApp } from './testServer';
import { TEST_USER_ID, cleanDatabase } from './setup';
import { storage } from '../server/storage';

describe('Debug Message Creation', () => {
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
      text: 'Debug question?',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  test('Debug: Check messages after drop creation', async () => {
    console.log('=== Creating drop ===');
    
    // Create a drop
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Test drop'
      });
    
    console.log('Drop created:', dropResponse.body);
    const dropId = dropResponse.body.id;
    
    // Check messages immediately after drop creation
    const messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    console.log('Messages after drop creation:', messagesResponse.body);
    console.log('Message count:', messagesResponse.body.length);
    
    expect(messagesResponse.status).toBe(200);
    console.log('Expected: 1 message (initial AI), Actual:', messagesResponse.body.length);
    
    // Send a user message
    console.log('=== Sending user message ===');
    const messageResponse = await request(app)
      .post('/api/messages')
      .send({
        dropId: dropId,
        text: 'Hello AI',
        fromUser: true
      });
    
    console.log('User message created:', messageResponse.body);
    
    // Check messages after user message
    const messagesResponse2 = await request(app).get(`/api/drops/${dropId}/messages`);
    console.log('Messages after user message:', messagesResponse2.body);
    console.log('Message count:', messagesResponse2.body.length);
    
    // Wait for AI response
    console.log('=== Waiting for AI response ===');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check messages after AI response
    const messagesResponse3 = await request(app).get(`/api/drops/${dropId}/messages`);
    console.log('Messages after AI response:', messagesResponse3.body);
    console.log('Final message count:', messagesResponse3.body.length);
  });
}); 