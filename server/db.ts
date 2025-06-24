import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Configure Neon based on environment
if (process.env.NODE_ENV === 'test') {
  // In test environment, use HTTP instead of WebSockets for better reliability
  neonConfig.poolQueryViaFetch = true;
} else {
  // In production/development, use WebSockets for better performance
  neonConfig.webSocketConstructor = ws;
}

// Determine which database URL to use based on environment
let databaseUrl: string;

if (process.env.NODE_ENV === 'test') {
  // In test environment, REQUIRE a separate test database
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL must be set for running tests. NEVER use production database for tests!");
  }
  databaseUrl = process.env.TEST_DATABASE_URL;
  console.log('Using test database for NODE_ENV=test');
} else {
  // In production/development, use the main database
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  databaseUrl = process.env.DATABASE_URL;
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });