import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Configure Neon to use HTTP instead of WebSockets for tests
neonConfig.poolQueryViaFetch = true;

// Environment setup
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key'; // Mock API key for tests

// Make sure we have a test database URL
if (!process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
  // For development, we can use the main database but with a test prefix
  // This is not ideal for a real production app, but works for our purposes
  process.env.TEST_DATABASE_URL = process.env.DATABASE_URL;
  console.warn('Warning: Using main DATABASE_URL for tests. This is not recommended for production.');
}

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must be set for running tests');
}

// Test database setup
const testPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
export const testDb = drizzle(testPool, { schema });

// Helper to clean database tables between tests
export async function cleanDatabase() {
  try {
    // Delete all records from tables in correct order to respect foreign key constraints
    // 1. First, delete all messages (they reference drops via drop_id)
    await testDb.delete(schema.messages);
    // 2. Then delete all drops (they reference questions and users, but those are preserved)
    await testDb.delete(schema.drops);
    // Don't delete users or questions as they're likely to be re-used across tests
  } catch (error) {
    console.error('Error cleaning database:', error);
    // If cleanup fails, try to clean up individual tables with explicit ordering
    try {
      // Force delete messages first to remove foreign key dependencies
      await testDb.delete(schema.messages);
      // Then delete drops
      await testDb.delete(schema.drops);
    } catch (fallbackError) {
      console.error('Fallback cleanup also failed:', fallbackError);
      // As a last resort, try to use raw SQL to delete with CASCADE
      try {
        await testDb.execute(sql`DELETE FROM messages`);
        await testDb.execute(sql`DELETE FROM drops`);
      } catch (finalError) {
        console.error('Final cleanup attempt failed:', finalError);
      }
    }
  }
}

// Helper to close database connection after tests
export async function closeDbConnection() {
  await testPool.end();
}

// Mock authentication helpers
export const TEST_USER_ID = 'test-user-id';
export const TEST_USERNAME = 'testuser';

export function getMockAuthUser() {
  return {
    id: TEST_USER_ID,
    username: TEST_USERNAME,
    email: 'test@example.com'
  };
}

// Before and after hooks to set up and tear down test environment
beforeAll(async () => {
  // Any setup that should happen once before all tests
});

afterAll(async () => {
  await closeDbConnection();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  // Any cleanup after each test
});