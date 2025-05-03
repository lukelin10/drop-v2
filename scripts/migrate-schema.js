import pg from 'pg';
const { Client } = pg;

async function migrateSchema() {
  // Connect to the database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create sessions table for auth
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    console.log('Created sessions table if it didn\'t exist');
    
    // Create index on expire for sessions table
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions ("expire");
    `);
    
    // Check if users table exists
    const checkUsersTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    
    // If users table exists, update the schema
    if (checkUsersTable.rows[0].exists) {
      console.log('Users table exists, updating schema');
      
      // We need to replace the users table due to foreign key constraints
      try {
        // First drop the foreign key constraint if it exists
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.table_constraints
              WHERE constraint_name = 'drops_user_id_users_id_fk'
            ) THEN
              ALTER TABLE drops DROP CONSTRAINT drops_user_id_users_id_fk;
            END IF;
          END $$;
        `);
        console.log('Dropped foreign key constraint if it existed');
        
        // Create a new users table with correct schema
        await client.query(`
          CREATE TABLE IF NOT EXISTS sessions_users (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE,
            first_name VARCHAR(255),
            last_name VARCHAR(255),
            bio TEXT,
            profile_image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log('Created sessions_users table');
        
        // Update drops table to use varchar user_id
        await client.query(`
          ALTER TABLE drops 
          ALTER COLUMN user_id TYPE VARCHAR(255);
        `);
        console.log('Updated drops.user_id to VARCHAR');
        
      } catch (e) {
        console.error('Error during migration:', e.message);
      }
    } else {
      // Create users table from scratch
      await client.query(`
        CREATE TABLE users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE,
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          bio TEXT,
          profile_image_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('Created users table from scratch');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error performing migration:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

migrateSchema();