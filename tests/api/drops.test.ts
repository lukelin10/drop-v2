import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';
import { insertQuestionSchema } from '../../shared/schema';

describe('Drops API', () => {
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
      text: 'Test question for drops?',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  test('GET /api/drops returns empty array when no drops exist', async () => {
    const response = await request(app).get('/api/drops');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(0);
  });

  test('POST /api/drops creates a new drop', async () => {
    const newDrop = {
      questionId: testQuestionId,
      text: 'Test drop content'
    };
    
    const response = await request(app)
      .post('/api/drops')
      .send(newDrop);
      
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.text).toBe(newDrop.text);
    expect(response.body.questionId).toBe(newDrop.questionId);
    expect(response.body.userId).toBe(TEST_USER_ID);
    
    // Verify the drop was created
    const dropsResponse = await request(app).get('/api/drops');
    expect(dropsResponse.status).toBe(200);
    expect(dropsResponse.body.length).toBe(1);
    expect(dropsResponse.body[0].text).toBe(newDrop.text);
  });

  test('POST /api/drops returns 400 for invalid data', async () => {
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

  test('GET /api/drops/:id/messages returns messages for a drop', async () => {
    // First create a drop
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Test drop for messages'
      });
    
    const dropId = dropResponse.body.id;
    
    // Initially there should be one automatic initial message
    const messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse.status).toBe(200);
    expect(Array.isArray(messagesResponse.body)).toBe(true);
    expect(messagesResponse.body.length).toBe(1); // Automatic initial message
    expect(messagesResponse.body[0].fromUser).toBe(false);
    expect(messagesResponse.body[0].text).toBeTruthy(); // Should have text content
    expect(messagesResponse.body[0].text.length).toBeGreaterThan(0); // Should not be empty
  });
});