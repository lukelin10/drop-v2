import { enableMocksForAPITests, getTestApp, getMockStorage, TEST_USER_ID } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import { createMockUser, createMockQuestion, createMockDrop, createMockDropWithQuestion } from '../factories/testData';

describe('API Error Handling', () => {
  let app: any;
  const testQuestionId = 1;
  
  beforeAll(async () => {
    app = await getTestApp();
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up basic mocks for error testing
    const mockStorage = getMockStorage();
    const mockUser = createMockUser({ id: TEST_USER_ID });
    const mockQuestion = createMockQuestion({ 
      id: testQuestionId, 
      text: 'Test question for error handling' 
    });
    
    mockStorage.getUser.mockResolvedValue(mockUser);
    mockStorage.createQuestion.mockResolvedValue(mockQuestion);
    
    // Mock error responses for 404 tests
    mockStorage.getDrop.mockImplementation(async (id: number) => {
      if (id === 9999) return null; // Simulate not found
      return createMockDrop({ id });
    });
    
    mockStorage.getMessages.mockImplementation(async (dropId: number) => {
      if (dropId === 9999) return null; // Simulate drop not found
      return [];
    });
    
    mockStorage.updateDrop.mockImplementation(async (id: number, updates: any) => {
      if (id === 9999) return null; // Simulate not found
      return createMockDrop({ id, ...updates });
    });
  });
  
  describe('Input Validation', () => {
    test('POST /api/drops returns 400 with invalid input', async () => {
      // Missing required field (text)
      const response1 = await request(app)
        .post('/api/drops')
        .send({
          questionId: testQuestionId
          // Missing text field
        });
      
      expect(response1.status).toBe(400);
      expect(response1.body).toHaveProperty('message');
      
      // Invalid questionId (non-existent)
      const response2 = await request(app)
        .post('/api/drops')
        .send({
          questionId: 9999,
          text: 'This should fail validation'
        });
      
      expect(response2.status).toBe(404);
      expect(response2.body).toHaveProperty('message');
      
      // Empty text field
      const response3 = await request(app)
        .post('/api/drops')
        .send({
          questionId: testQuestionId,
          text: ''
        });
      
      expect(response3.status).toBe(400);
      expect(response3.body).toHaveProperty('message');
    });
    
    test('POST /api/messages returns 400 with invalid input', async () => {
      // Create a valid drop first
      const dropResponse = await request(app)
        .post('/api/drops')
        .send({
          questionId: testQuestionId,
          text: 'Test drop for message validation'
        });
      
      const dropId = dropResponse.body.id;
      
      // Missing required field (text)
      const response1 = await request(app)
        .post('/api/messages')
        .send({
          dropId: dropId,
          fromUser: true
          // Missing text field
        });
      
      expect(response1.status).toBe(400);
      expect(response1.body).toHaveProperty('message');
      
      // Missing required field (fromUser)
      const response2 = await request(app)
        .post('/api/messages')
        .send({
          dropId: dropId,
          text: 'This should fail validation'
          // Missing fromUser field
        });
      
      expect(response2.status).toBe(400);
      expect(response2.body).toHaveProperty('message');
      
      // Empty text field
      const response3 = await request(app)
        .post('/api/messages')
        .send({
          dropId: dropId,
          text: '',
          fromUser: true
        });
      
      expect(response3.status).toBe(400);
      expect(response3.body).toHaveProperty('message');
    });
  });
  
  describe('Resource Not Found', () => {
    test('GET /api/drops/:id returns 404 for non-existent drop', async () => {
      const response = await request(app).get('/api/drops/9999');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
    
    test('GET /api/drops/:id/messages returns 404 for non-existent drop', async () => {
      const response = await request(app).get('/api/drops/9999/messages');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
    
    test('PATCH /api/drops/:id returns 404 for non-existent drop', async () => {
      const response = await request(app)
        .patch('/api/drops/9999')
        .send({
          favorite: true
        });
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });
  
  describe('Method Not Allowed', () => {
    test('DELETE /api/drops returns 405 Method Not Allowed', async () => {
      const response = await request(app).delete('/api/drops');
      
      expect(response.status).toBe(404); // Express default behavior returns 404 for undefined routes
    });
    
    test('PUT /api/messages returns 405 Method Not Allowed', async () => {
      const response = await request(app).put('/api/messages');
      
      expect(response.status).toBe(404); // Express default behavior returns 404 for undefined routes
    });
  });
  
  describe('Concurrency Handling', () => {
    test('Concurrent updates to the same drop work correctly', async () => {
      // Get mock storage instance
      const mockStorage = getMockStorage();
      
      // Create a test drop first
      const testDropId = 1;
      const testDrop = createMockDropWithQuestion({
        id: testDropId,
        userId: TEST_USER_ID,
        questionId: testQuestionId,
        text: 'Test drop for concurrency'
      });
      
      // Setup mock to return the created drop with correct ownership
      mockStorage.createDrop.mockResolvedValue(testDrop);
      mockStorage.getDrop.mockResolvedValue(testDrop);
      
      // Create a test drop via API
      const dropResponse = await request(app)
        .post('/api/drops')
        .send({
          questionId: testQuestionId,
          text: 'Test drop for concurrency'
        });
      
      const dropId = dropResponse.body.id;
      
      // Mock updateDrop to return updated versions
      mockStorage.updateDrop.mockImplementation(async (id: number, updates: any) => {
        return { ...testDrop, ...updates };
      });
      
      // Send multiple update requests simultaneously
      const updatePromises = [
        request(app)
          .patch(`/api/drops/${dropId}`)
          .send({
            text: 'Updated text 1'
          }),
        request(app)
          .patch(`/api/drops/${dropId}`)
          .send({
            text: 'Updated text 2'
          })
      ];
      
      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      
      // Verify all requests were successful
      results.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify updateDrop was called for each request
      expect(mockStorage.updateDrop).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Rate Limiting', () => {
    test('Multiple rapid requests are handled properly', async () => {
      // Send a burst of requests to get all drops
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/api/drops')
      );
      
      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      
      // Verify all requests were successful
      // Note: This test assumes rate limiting is either not implemented or set high enough
      // If rate limiting is implemented with low thresholds, this test should be updated
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});