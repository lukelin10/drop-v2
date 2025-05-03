import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, TEST_USERNAME, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';

describe('Authentication API', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
    
    // Create a test user in the database
    await storage.upsertUser({
      id: TEST_USER_ID,
      username: TEST_USERNAME,
      email: 'test@example.com',
    });
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  test('GET /api/auth/user returns user data for authenticated user', async () => {
    const response = await request(app).get('/api/auth/user');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', TEST_USER_ID);
    expect(response.body).toHaveProperty('username', TEST_USERNAME);
  });

  // In a real application, we might test other authentication endpoints
  // like login, logout, etc., but since we're using Replit Auth, those
  // are handled externally and we would need different testing approaches
});