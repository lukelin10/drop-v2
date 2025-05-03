import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';

describe('API Error Handling', () => {
  let app: any;
  let testQuestionId: number;
  let testDropId: number;
  let otherUserId = 'other-user-id';

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create two test users - one for authentication and one for cross-user tests
    await storage.upsertUser({
      id: TEST_USER_ID,
      username: 'testuser',
      email: 'test@example.com',
    });
    
    await storage.upsertUser({
      id: otherUserId,
      username: 'otheruser',
      email: 'other@example.com',
    });
    
    // Create a test question
    const question = await storage.createQuestion({
      text: 'Test question for error handling?',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
    
    // Create a drop owned by the "other" user to test authorization
    const drop = await storage.createDrop({
      userId: otherUserId, // Important: Not the test user!
      questionId: testQuestionId,
      text: 'Drop owned by other user'
    });
    testDropId = drop.id;
  });

  test('POST /api/drops with invalid data returns 400', async () => {
    const invalidDrop = {
      // Missing required fields
    };
    
    const response = await request(app)
      .post('/api/drops')
      .send(invalidDrop);
      
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('errors');
  });
  
  test('POST /api/messages for non-existent drop returns 404', async () => {
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
  
  test('POST /api/messages for another user\'s drop returns 403', async () => {
    // Try to post a message to a drop owned by another user
    const unauthorizedMessage = {
      dropId: testDropId, // Drop owned by otherUserId
      text: 'Trying to post to someone else\'s drop',
      fromUser: true
    };
    
    const response = await request(app)
      .post('/api/messages')
      .send(unauthorizedMessage);
      
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Access denied');
  });
  
  test('GET /api/drops/:id/messages for non-existent drop returns 404', async () => {
    const response = await request(app).get('/api/drops/9999/messages');
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('message');
  });
});