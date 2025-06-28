import { enableMocksForAPITests, getTestApp, TEST_USER_ID, TEST_USERNAME } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import { mockStorage } from '../mocks/mockStorage';
import { createMockUser } from '../factories/testData';

describe('Authentication API', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mock user for auth tests
    const mockUser = createMockUser({
      id: TEST_USER_ID,
      username: TEST_USERNAME,
      email: 'test@example.com'
    });
    
    mockStorage.getUser.mockResolvedValue(mockUser);
    mockStorage.getUserByUsername.mockResolvedValue(mockUser);
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