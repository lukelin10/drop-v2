import { pool, db } from './db';
import * as schema from '@shared/schema';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Push the schema to the database
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();