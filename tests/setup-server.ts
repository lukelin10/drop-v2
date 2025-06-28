/**
 * Server Setup for API Tests
 * 
 * Provides a clean Express app with mocked dependencies for API testing.
 * This replaces the old testServer.ts approach with a streamlined architecture.
 */

import express from 'express';
import type { Express } from 'express';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// Test constants
export const TEST_USER_ID = 'test-user-123';
export const TEST_USERNAME = 'testuser';

// Mock storage instance
let testApp: Express | null = null;
let testDb: any = null;

// Global storage mock for API tests
let globalMockStorage: any = null;

/**
 * Enable mocks for API tests
 * Call this BEFORE importing any server modules
 */
export const enableMocksForAPITests = () => {
  console.log('🔧 Enabling API test mocks...');

  // Import mock storage
  const { mockStorage } = require('./mocks/mockStorage');
  globalMockStorage = mockStorage;

  // Mock storage service at module level
  jest.doMock('../server/storage', () => ({
    storage: globalMockStorage
  }));

  // Mock Anthropic service
  jest.doMock('../server/services/anthropic', () => ({
    generateResponse: jest.fn().mockImplementation(async (userMessage: string) => {
      return `Test AI response to: ${userMessage}`;
    }),
    getConversationHistory: jest.fn().mockResolvedValue([])
  }));

  // Mock Analysis LLM service
  jest.doMock('../server/services/analysisLLM', () => ({
    generateAnalysis: jest.fn().mockResolvedValue({
      summary: 'Test analysis summary',
      content: 'Test analysis content with insights',
      bulletPoints: '• Test insight 1\n• Test insight 2\n• Test insight 3'
    })
  }));

  console.log('✅ API test mocks enabled');
};

/**
 * Get the current mock storage instance
 */
export const getMockStorage = () => {
  if (!globalMockStorage) {
    const { mockStorage } = require('./mocks/mockStorage');
    return mockStorage;
  }
  return globalMockStorage;
};

/**
 * Get test Express app with mocked authentication
 */
export const getTestApp = async (): Promise<Express> => {
  if (testApp) {
    return testApp;
  }

  console.log('🚀 Creating test Express app...');

  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  app.use((req: any, res: any, next: any) => {
    req.user = { 
      claims: { 
        sub: TEST_USER_ID 
      } 
    };
    next();
  });

  // Clear module cache to ensure mocked modules are used
  delete require.cache[require.resolve('../server/routes')];
  delete require.cache[require.resolve('../server/storage')];
  delete require.cache[require.resolve('../server/services/anthropic')];
  delete require.cache[require.resolve('../server/services/analysisLLM')];

  // Import and mount routes after mocking and cache clearing
  const { registerRoutes } = await import('../server/routes');
  await registerRoutes(app);

  testApp = app;
  console.log('✅ Test Express app created');
  return app;
};

/**
 * Get test database instance
 * Only used for integration tests that need real database operations
 */
export const getTestDb = () => {
  if (!testDb) {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL required for integration tests');
    }
    
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    testDb = drizzle(pool, { schema });
  }
  
  return testDb;
};

/**
 * Clean database for integration tests
 */
export const cleanDatabase = async () => {
  if (!process.env.TEST_DATABASE_URL) {
    console.log('⚠️  No TEST_DATABASE_URL - skipping database cleanup');
    return;
  }

  const db = getTestDb();
  
  // Clean in reverse dependency order
  await db.delete(schema.analysisDrops);
  await db.delete(schema.analyses);
  await db.delete(schema.messages);
  await db.delete(schema.drops);
  await db.delete(schema.questionTable);
  await db.delete(schema.users);
  
  console.log('🧹 Database cleaned');
};

/**
 * Legacy exports for compatibility
 */
export { getTestDb as testDb };

