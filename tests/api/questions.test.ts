import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';

describe('Questions API', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create a test user
    await storage.upsertUser({
      id: TEST_USER_ID,
      username: 'testuser',
      email: 'test@example.com',
    });
    
    // Create some test questions
    await storage.createQuestion({
      text: 'Test question 1?',
      isActive: true,
      category: 'test'
    });
    
    await storage.createQuestion({
      text: 'Test question 2?',
      isActive: true,
      category: 'test'
    });
  });

  beforeEach(async () => {
    // We don't need to clean questions between tests
    // They'll be reused
  });

  test('GET /api/daily-question returns a question', async () => {
    const response = await request(app).get('/api/daily-question');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('question');
    expect(typeof response.body.question).toBe('string');
    expect(response.body.question.length).toBeGreaterThan(0);
  });

  test('GET /api/questions returns all questions', async () => {
    const response = await request(app).get('/api/questions');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2); // We created at least 2 test questions
    
    // Each question should have these properties
    response.body.forEach((question: any) => {
      expect(question).toHaveProperty('id');
      expect(question).toHaveProperty('text');
      expect(question).toHaveProperty('isActive');
      expect(question).toHaveProperty('category');
    });
  });
});