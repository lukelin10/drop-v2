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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });