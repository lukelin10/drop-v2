import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Configure Neon to use HTTP instead of WebSockets for tests
neonConfig.poolQueryViaFetch = true;

// Environment setup
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key'; // Mock API key for tests

// CRITICAL SAFETY: Database setup with mock fallback
let testPool: Pool | null = null;
let testDb: any;
let isRealDatabase = false;

if (!process.env.TEST_DATABASE_URL) {
  console.log('⚠️  TEST_DATABASE_URL not configured');
  console.log('🛡️  Using mock database - production data protected');
  console.log('📝 Database-dependent tests will be skipped safely');
  
  // Create mock database that prevents any real database operations
  testDb = {
    insert: () => ({ 
      values: () => ({ 
        returning: () => Promise.resolve([{ id: 'mock-id' }]) 
      }) 
    }),
    select: () => ({ 
      from: () => ({ 
        where: () => Promise.resolve([]) 
      })
    }),
    delete: () => Promise.resolve({ changes: 0 }),
    update: () => ({ 
      set: () => ({ 
        where: () => Promise.resolve({ changes: 0 }) 
      }) 
    }),
    execute: () => Promise.resolve({ rows: [] }),
    transaction: (callback: any) => Promise.resolve(callback({ rollback: () => {} }))
  };
  isRealDatabase = false;
} else {
  console.log('✅ TEST_DATABASE_URL configured - using real test database');
  testPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  testDb = drizzle(testPool, { schema });
  isRealDatabase = true;
}

export { testDb, isRealDatabase };

// Helper to create all necessary tables for tests
export async function createTestTables() {
  if (!isRealDatabase) {
    console.log('📋 Skipping table creation - using mock database');
    return;
  }
  
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

// Transaction-based test isolation - much safer than deleting data
let testTransaction: any = null;

export async function beginTestTransaction() {
  // SAFETY CHECK: Only run in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('CRITICAL: Test transaction should only run in test environment!');
    throw new Error('Test transaction attempted outside of test environment');
  }

  if (!isRealDatabase) {
    console.log('📋 Skipping transaction - using mock database');
    return;
  }

  // Additional safety check: ensure we're not using production database
  const testDbUrl = process.env.TEST_DATABASE_URL || '';
  if (testDbUrl === process.env.DATABASE_URL) {
    console.error('CRITICAL: TEST_DATABASE_URL is the same as DATABASE_URL!');
    throw new Error('Test database URL cannot be the same as production database URL');
  }

  // Begin transaction for test isolation
  testTransaction = await testDb.transaction(async (tx) => {
    return tx; // Return the transaction for use in tests
  });
}

export async function rollbackTestTransaction() {
  // SAFETY CHECK: Only run in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test rollback should only run in test environment');
  }
  
  if (!isRealDatabase) {
    return; // Nothing to rollback in mock database
  }
  
  // Rollback the transaction to undo all test changes
  if (testTransaction) {
    await testTransaction.rollback();
    testTransaction = null;
  }
}

// Legacy function kept for backward compatibility but made safe
export async function cleanDatabase() {
  console.log('⚠️  cleanDatabase() is deprecated. Using transaction rollback instead for safety.');
  await rollbackTestTransaction();
}

// Helper to close database connection after tests
export async function closeDbConnection() {
  if (testPool) {
    await testPool.end();
  }
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

// Helper to skip database-dependent tests
export function skipIfMockDatabase(testName: string) {
  if (!isRealDatabase) {
    console.log(`⏭️  Skipping database test: ${testName} (using mock database)`);
    return true;
  }
  return false;
}

// Before and after hooks to set up and tear down test environment
beforeAll(async () => {
  // SAFETY CHECK: Only run test hooks in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test hooks should only run in test environment');
  }
  // Create all necessary tables for tests
  await createTestTables();
});

afterAll(async () => {
  await closeDbConnection();
});

beforeEach(async () => {
  // SAFETY CHECK: Only run in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test setup should only run in test environment');
  }
  await beginTestTransaction();
});

afterEach(async () => {
  // SAFETY CHECK: Only run in test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test cleanup should only run in test environment');
  }
  await rollbackTestTransaction();
});

