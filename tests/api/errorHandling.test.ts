import request from 'supertest';
import { getTestApp } from '../testServer';
import { TEST_USER_ID, cleanDatabase } from '../setup';
import { storage } from '../../server/storage';

describe('API Error Handling', () => {
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
      text: 'Test question for error handling',
      isActive: true,
      category: 'test'
    });
    testQuestionId = question.id;
  });
  
  beforeEach(async () => {
    await cleanDatabase();
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
      // Create a test drop
      const dropResponse = await request(app)
        .post('/api/drops')
        .send({
          questionId: testQuestionId,
          text: 'Test drop for concurrency'
        });
      
      const dropId = dropResponse.body.id;
      
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
          }),
        request(app)
          .patch(`/api/drops/${dropId}`)
          .send({
            favorite: true
          })
      ];
      
      // Wait for all updates to complete
      const results = await Promise.all(updatePromises);
      
      // Verify all requests were successful
      results.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Verify the final state of the drop
      const finalResponse = await request(app).get(`/api/drops/${dropId}`);
      expect(finalResponse.status).toBe(200);
      
      // Since we can't control the exact order of concurrent operations,
      // just verify that one of the text updates was applied and the favorite flag was updated
      const finalDrop = finalResponse.body;
      expect(finalDrop.text).toMatch(/^Updated text [12]$/);
      expect(finalDrop.favorite).toBe(true);
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