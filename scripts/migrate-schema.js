const { Client } = require('pg');

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
    
    // If users table exists, create a new schema-compliant version
    if (checkUsersTable.rows[0].exists) {
      console.log('Users table exists, updating schema');
      
      // Create temp table for new users schema
      await client.query(`
        CREATE TABLE users_new (
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
      console.log('Created new users table');
      
      // Check if drops table references users
      const checkDropsTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'drops'
        );
      `);
      
      if (checkDropsTable.rows[0].exists) {
        // Update drops table to use varchar user_id
        await client.query(`
          ALTER TABLE drops 
          ALTER COLUMN user_id TYPE VARCHAR(255);
        `);
        console.log('Updated drops.user_id to VARCHAR');
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