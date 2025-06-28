import { enableMocksForAPITests, getTestApp, getMockStorage, TEST_USER_ID } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import { createMockUser, createMockQuestion } from '../factories/testData';

describe('Questions API', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock questions
    const mockStorage = getMockStorage();
    const mockQuestions = [
      createMockQuestion({ 
        text: 'Test question 1?', 
        isActive: true, 
        category: 'test' 
      }),
      createMockQuestion({ 
        text: 'Test question 2?', 
        isActive: true, 
        category: 'test' 
      })
    ];
    
    mockStorage.getQuestions.mockResolvedValue(mockQuestions);
    mockStorage.getDailyQuestion.mockResolvedValue('Test question 1?'); // Returns string, not object
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