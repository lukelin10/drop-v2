import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema.js';

// Use WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Creating schema...');
  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Schema created successfully!');
  } catch (err) {
    console.error('Error creating schema:', err);
    process.exit(1);
  }

  // Seed questions if needed
  try {
    const questions = await db.select().from(schema.questionTable);
    if (questions.length === 0) {
      console.log('Seeding questions...');
      await db.insert(schema.questionTable).values(
        schema.questionsList.map(text => ({ 
          text,
          isActive: true,
          category: 'general'
        }))
      );
      console.log(`Seeded ${schema.questionsList.length} questions`);
    } else {
      console.log(`Found ${questions.length} existing questions`);
    }
  } catch (err) {
    console.error('Error seeding questions:', err);
  }

  await pool.end();
}

main();