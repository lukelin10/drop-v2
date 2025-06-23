import request from 'supertest';
import express from 'express';
import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type { Express } from 'express';

// Mock dependencies before importing routes
jest.mock('../../server/replitAuth', () => ({
  isAuthenticated: jest.fn(),
  setupAuth: jest.fn(async () => {
    return;
  })
}));

jest.mock('../../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockImplementation(async (userMessage, dropId) => {
    return `Test AI response to: ${userMessage}`;
  }),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

// Import after mocking
import { registerRoutes } from '../../server/routes';

describe('Analysis API Endpoints', () => {
  const testUserId = 'test-user-id';
  const testUserId2 = 'test-user-id-2';
  let testQuestionId: number;
  let authToken: string;
  let authToken2: string;
  let app: Express;

  beforeAll(async () => {
    // Create test question
    const result = await testDb.insert(schema.questionTable).values({
      text: 'Test question for analysis API tests?',
      isActive: true,
      category: 'test',
      createdAt: new Date()
    }).returning();
    
    testQuestionId = result[0].id;
  });

  beforeEach(async () => {
    // Clean up database before each test
    await testDb.delete(schema.analysisDrops);
    await testDb.delete(schema.analyses);
    await testDb.delete(schema.messages);
    await testDb.delete(schema.drops);
    await testDb.delete(schema.users);

    // Create test users
    await testDb.insert(schema.users).values([
      {
        id: testUserId,
        username: 'testuser1',
        email: 'test1@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: testUserId2,
        username: 'testuser2',
        email: 'test2@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Mock authentication - in a real app, you'd use proper auth tokens
    authToken = `Bearer mock-token-${testUserId}`;
    authToken2 = `Bearer mock-token-${testUserId2}`;

    // Configure the authentication mock for this test
    const mockAuth = require('../../server/replitAuth').isAuthenticated as jest.Mock;
    mockAuth.mockImplementation((req: any, res: any, next: any) => {
      const token = req.headers.authorization;
      if (token === authToken) {
        req.user = { claims: { sub: testUserId } };
        next();
      } else if (token === authToken2) {
        req.user = { claims: { sub: testUserId2 } };
        next();
      } else {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    });

    // Create fresh app instance with the configured auth
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    await registerRoutes(app);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/analyses/eligibility', () => {
    test('returns not eligible for new user', async () => {
      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        isEligible: false,
        unanalyzedCount: 0,
        requiredCount: 7
      });
    });

    test('returns not eligible with fewer than 7 drops', async () => {
      // Create 5 drops
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        isEligible: false,
        unanalyzedCount: 5,
        requiredCount: 7
      });
    });

    test('returns eligible with 7 or more drops', async () => {
      // Create 8 drops
      for (let i = 0; i < 8; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toEqual({
        isEligible: true,
        unanalyzedCount: 8,
        requiredCount: 7
      });
    });

    test('requires authentication', async () => {
      await request(app)
        .get('/api/analyses/eligibility')
        .expect(401);
    });
  });

  describe('POST /api/analyses', () => {
    test('creates analysis when user is eligible', async () => {
      // Create 7 drops to make user eligible
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('bulletPoints');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('isFavorited', false);

      // Verify analysis was created in database
      const analyses = await testDb
        .select()
        .from(schema.analyses)
        .where(eq(schema.analyses.userId, testUserId));

      expect(analyses).toHaveLength(1);

      // Verify analysis-drop relationships were created
      const analysisDrops = await testDb
        .select()
        .from(schema.analysisDrops)
        .where(eq(schema.analysisDrops.analysisId, analyses[0].id));

      expect(analysisDrops).toHaveLength(7);

      // Verify user's last analysis date was updated
      const [user] = await testDb
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, testUserId));

      expect(user.lastAnalysisDate).toBeTruthy();
    });

    test('rejects analysis when user not eligible', async () => {
      // Create only 5 drops (not enough)
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Not enough unanalyzed drops for analysis');
      expect(response.body).toHaveProperty('eligibility');
      expect(response.body.eligibility.isEligible).toBe(false);
    });

    test('rejects analysis when user has no drops', async () => {
      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Not enough unanalyzed drops for analysis');
    });

    test('requires authentication', async () => {
      await request(app)
        .post('/api/analyses')
        .expect(401);
    });
  });

  describe('GET /api/analyses', () => {
    beforeEach(async () => {
      // Create some test analyses
      const analysisData = [
        {
          userId: testUserId,
          content: 'First analysis content',
          summary: 'First summary',
          bulletPoints: '• First point',
          createdAt: new Date('2024-01-01'),
          isFavorited: false
        },
        {
          userId: testUserId,
          content: 'Second analysis content',
          summary: 'Second summary',
          bulletPoints: '• Second point',
          createdAt: new Date('2024-01-02'),
          isFavorited: true
        },
        {
          userId: testUserId2, // Different user
          content: 'Other user analysis',
          summary: 'Other summary',
          bulletPoints: '• Other point',
          createdAt: new Date('2024-01-01'),
          isFavorited: false
        }
      ];

      await testDb.insert(schema.analyses).values(analysisData);
    });

    test('returns user analyses in reverse chronological order', async () => {
      const response = await request(app)
        .get('/api/analyses')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveLength(2); // Only user's analyses
      expect(response.body[0].summary).toBe('Second summary'); // Newest first
      expect(response.body[1].summary).toBe('First summary');
      
      // Verify all analyses belong to the user
      response.body.forEach((analysis: any) => {
        expect(analysis.userId).toBe(testUserId);
      });
    });

    test('respects pagination parameters', async () => {
      // Create more analyses for pagination test
      for (let i = 0; i < 5; i++) {
        await testDb.insert(schema.analyses).values({
          userId: testUserId,
          content: `Analysis ${i + 3}`,
          summary: `Summary ${i + 3}`,
          bulletPoints: `• Point ${i + 3}`,
          createdAt: new Date(`2024-01-${i + 3}`),
          isFavorited: false
        });
      }

      // Test limit
      const response1 = await request(app)
        .get('/api/analyses?limit=3')
        .set('Authorization', authToken)
        .expect(200);

      expect(response1.body).toHaveLength(3);

      // Test offset
      const response2 = await request(app)
        .get('/api/analyses?limit=2&offset=2')
        .set('Authorization', authToken)
        .expect(200);

      expect(response2.body).toHaveLength(2);
      expect(response2.body[0].id).not.toBe(response1.body[0].id);
    });

    test('handles invalid pagination parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/analyses?limit=invalid&offset=also-invalid')
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('requires authentication', async () => {
      await request(app)
        .get('/api/analyses')
        .expect(401);
    });
  });

  describe('GET /api/analyses/:id', () => {
    let testAnalysisId: number;
    let otherUserAnalysisId: number;

    beforeEach(async () => {
      // Create test analysis for user 1
      const [analysis1] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Test point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();

      testAnalysisId = analysis1.id;

      // Create test analysis for user 2
      const [analysis2] = await testDb.insert(schema.analyses).values({
        userId: testUserId2,
        content: 'Other user analysis',
        summary: 'Other summary',
        bulletPoints: '• Other point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();

      otherUserAnalysisId = analysis2.id;
    });

    test('returns analysis when user owns it', async () => {
      const response = await request(app)
        .get(`/api/analyses/${testAnalysisId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('id', testAnalysisId);
      expect(response.body).toHaveProperty('userId', testUserId);
      expect(response.body).toHaveProperty('content', 'Test analysis content');
    });

    test('returns 403 when user tries to access other user analysis', async () => {
      const response = await request(app)
        .get(`/api/analyses/${otherUserAnalysisId}`)
        .set('Authorization', authToken)
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Access denied');
    });

    test('returns 404 for non-existent analysis', async () => {
      const response = await request(app)
        .get('/api/analyses/99999')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Analysis not found');
    });

    test('handles invalid analysis ID', async () => {
      await request(app)
        .get('/api/analyses/invalid')
        .set('Authorization', authToken)
        .expect(404); // Invalid ID should return "not found"
    });

    test('requires authentication', async () => {
      await request(app)
        .get(`/api/analyses/${testAnalysisId}`)
        .expect(401);
    });
  });

  describe('PUT /api/analyses/:id/favorite', () => {
    let testAnalysisId: number;
    let otherUserAnalysisId: number;

    beforeEach(async () => {
      // Create test analysis for user 1
      const [analysis1] = await testDb.insert(schema.analyses).values({
        userId: testUserId,
        content: 'Test analysis content',
        summary: 'Test summary',
        bulletPoints: '• Test point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();

      testAnalysisId = analysis1.id;

      // Create test analysis for user 2
      const [analysis2] = await testDb.insert(schema.analyses).values({
        userId: testUserId2,
        content: 'Other user analysis',
        summary: 'Other summary',
        bulletPoints: '• Other point',
        createdAt: new Date(),
        isFavorited: false
      }).returning();

      otherUserAnalysisId = analysis2.id;
    });

    test('sets favorite to true', async () => {
      const response = await request(app)
        .put(`/api/analyses/${testAnalysisId}/favorite`)
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(200);

      expect(response.body).toHaveProperty('isFavorited', true);

      // Verify in database
      const [analysis] = await testDb
        .select()
        .from(schema.analyses)
        .where(eq(schema.analyses.id, testAnalysisId));

      expect(analysis.isFavorited).toBe(true);
    });

    test('sets favorite to false', async () => {
      // First set to true
      await testDb
        .update(schema.analyses)
        .set({ isFavorited: true })
        .where(eq(schema.analyses.id, testAnalysisId));

      const response = await request(app)
        .put(`/api/analyses/${testAnalysisId}/favorite`)
        .set('Authorization', authToken)
        .send({ isFavorited: false })
        .expect(200);

      expect(response.body).toHaveProperty('isFavorited', false);
    });

    test('validates isFavorited field', async () => {
      const response = await request(app)
        .put(`/api/analyses/${testAnalysisId}/favorite`)
        .set('Authorization', authToken)
        .send({ isFavorited: 'not-a-boolean' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'isFavorited must be a boolean');
    });

    test('requires isFavorited field', async () => {
      const response = await request(app)
        .put(`/api/analyses/${testAnalysisId}/favorite`)
        .set('Authorization', authToken)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'isFavorited must be a boolean');
    });

    test('returns 403 when user tries to favorite other user analysis', async () => {
      const response = await request(app)
        .put(`/api/analyses/${otherUserAnalysisId}/favorite`)
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Access denied');
    });

    test('returns 404 for non-existent analysis', async () => {
      const response = await request(app)
        .put('/api/analyses/99999/favorite')
        .set('Authorization', authToken)
        .send({ isFavorited: true })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Analysis not found');
    });

    test('requires authentication', async () => {
      await request(app)
        .put(`/api/analyses/${testAnalysisId}/favorite`)
        .send({ isFavorited: true })
        .expect(401);
    });
  });

  describe('Error handling', () => {
    test('handles database errors gracefully', async () => {
      // Mock a database error
      const originalMethod = require('../../server/storage').storage.getAnalysisEligibility;
      jest.spyOn(require('../../server/storage').storage, 'getAnalysisEligibility')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/analyses/eligibility')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Failed to check analysis eligibility');

      // Restore original method
      require('../../server/storage').storage.getAnalysisEligibility.mockRestore();
    });

    test('handles analysis creation errors gracefully', async () => {
      // Create 7 drops to make user eligible
      for (let i = 0; i < 7; i++) {
        await testDb.insert(schema.drops).values({
          userId: testUserId,
          questionId: testQuestionId,
          text: `Test drop ${i + 1}`,
          createdAt: new Date()
        });
      }

      // Mock a database error
      jest.spyOn(require('../../server/storage').storage, 'createAnalysis')
        .mockRejectedValueOnce(new Error('Database write failed'));

      const response = await request(app)
        .post('/api/analyses')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Failed to create analysis');

      require('../../server/storage').storage.createAnalysis.mockRestore();
    });
  });
}); 