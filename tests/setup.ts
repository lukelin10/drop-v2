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

// Helper to create all necessary tables for tests
export async function createTestTables() {
  try {
    // Create sessions table for auth
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);

    // Create sessions_users table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions_users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        bio TEXT,
        profile_image_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_analysis_date TIMESTAMP
      )
    `);

    // Add last_analysis_date column if it doesn't exist
    await testDb.execute(sql`
      ALTER TABLE sessions_users 
      ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP
    `);

    // Create question table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS question (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        last_used_at TIMESTAMP,
        usage_count INTEGER DEFAULT 0 NOT NULL,
        category TEXT DEFAULT 'general'
      )
    `);

    // Create drops table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS drops (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES question(id),
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        message_count INTEGER DEFAULT 0 NOT NULL,
        user_id VARCHAR(255) REFERENCES sessions_users(id)
      )
    `);

    // Create messages table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        drop_id INTEGER NOT NULL REFERENCES drops(id),
        text TEXT NOT NULL,
        from_user BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Create analyses table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES sessions_users(id),
        content TEXT NOT NULL,
        summary TEXT NOT NULL,
        bullet_points TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        is_favorited BOOLEAN DEFAULT false NOT NULL
      )
    `);

    // Create analysis_drops junction table
    await testDb.execute(sql`
      CREATE TABLE IF NOT EXISTS analysis_drops (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
        drop_id INTEGER NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(analysis_id, drop_id)
      )
    `);

    console.log('Test tables created successfully');
  } catch (error) {
    console.error('Error creating test tables:', error);
  }
}

// Helper to clean database tables between tests
export async function cleanDatabase() {
  try {
    // Delete all records from tables in correct order to respect foreign key constraints
    // 1. First, delete analysis_drops (junction table)
    await testDb.delete(schema.analysisDrops);
    // 2. Delete analyses
    await testDb.delete(schema.analyses);
    // 3. Delete messages (they reference drops via drop_id)
    await testDb.delete(schema.messages);
    // 4. Delete drops (they reference questions and users)
    await testDb.delete(schema.drops);
    // 5. Delete users (but preserve questions as they're often reused)
    await testDb.delete(schema.users);
  } catch (error) {
    console.error('Error cleaning database:', error);
    // If cleanup fails, try raw SQL with CASCADE
    try {
      await testDb.execute(sql`DELETE FROM analysis_drops`);
      await testDb.execute(sql`DELETE FROM analyses`);
      await testDb.execute(sql`DELETE FROM messages`);
      await testDb.execute(sql`DELETE FROM drops`);
      await testDb.execute(sql`DELETE FROM sessions_users`);
    } catch (fallbackError) {
      console.error('Fallback cleanup also failed:', fallbackError);
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
  // Create all necessary tables for tests
  await createTestTables();
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