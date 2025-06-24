#!/usr/bin/env node

/**
 * Simple Question Reset Script
 * 
 * This script resets the question selection logic to start from question ID 398.
 * It marks all questions with ID < 398 as "used" and resets questions >= 398 as unused.
 * 
 * Usage: node scripts/reset-questions-simple.js
 * 
 * WARNING: This script modifies the database. Use with caution.
 */

import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { lt, gte } from 'drizzle-orm';
import ws from 'ws';
import * as schema from '../shared/schema.js';

// Use WebSocket for Neon serverless
neonConfig.webSocketConstructor = ws;

const START_QUESTION_ID = 398;

async function resetQuestionLogic() {
  console.log(`🔄 Resetting question selection logic to start from ID ${START_QUESTION_ID}`);
  console.log('='.repeat(60));

  // Check environment
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    // First, get current state
    console.log('\n📊 Analyzing current question state...');
    
    const allQuestions = await db.select().from(schema.questionTable);
    const totalQuestions = allQuestions.length;
    const unusedQuestions = allQuestions.filter(q => q.lastUsedAt === null);
    const usedQuestions = allQuestions.filter(q => q.lastUsedAt !== null);
    
    console.log(`  Total questions: ${totalQuestions}`);
    console.log(`  Currently unused: ${unusedQuestions.length}`);
    console.log(`  Currently used: ${usedQuestions.length}`);
    
    // Check if target question exists
    const targetQuestion = allQuestions.find(q => q.id === START_QUESTION_ID);
    if (!targetQuestion) {
      console.error(`❌ ERROR: Question ID ${START_QUESTION_ID} not found in database`);
      console.log(`Available question IDs range from ${Math.min(...allQuestions.map(q => q.id))} to ${Math.max(...allQuestions.map(q => q.id))}`);
      await pool.end();
      process.exit(1);
    }
    
    console.log(`✅ Target question ID ${START_QUESTION_ID} found: "${targetQuestion.text}"`);

    // Step 1: Mark all questions with ID < START_QUESTION_ID as "used"
    console.log(`\n🔄 Step 1: Marking questions with ID < ${START_QUESTION_ID} as used...`);
    
    const markedAsUsedResult = await db
      .update(schema.questionTable)
      .set({
        lastUsedAt: new Date('2024-01-01T00:00:00Z'), // Set to a past date
        usageCount: 1
      })
      .where(lt(schema.questionTable.id, START_QUESTION_ID))
      .returning({ id: schema.questionTable.id });
    
    console.log(`  ✅ Marked ${markedAsUsedResult.length} questions as used`);

    // Step 2: Reset all questions with ID >= START_QUESTION_ID as unused
    console.log(`\n🔄 Step 2: Resetting questions with ID >= ${START_QUESTION_ID} as unused...`);
    
    const resetAsUnusedResult = await db
      .update(schema.questionTable)
      .set({
        lastUsedAt: null,
        usageCount: 0
      })
      .where(gte(schema.questionTable.id, START_QUESTION_ID))
      .returning({ id: schema.questionTable.id });
    
    console.log(`  ✅ Reset ${resetAsUnusedResult.length} questions as unused`);

    // Step 3: Verify the result
    console.log('\n✅ Verification: Checking new state...');
    
    const updatedQuestions = await db.select().from(schema.questionTable);
    const newUnusedQuestions = updatedQuestions.filter(q => q.lastUsedAt === null);
    const newUsedQuestions = updatedQuestions.filter(q => q.lastUsedAt !== null);
    
    console.log(`  Total questions: ${updatedQuestions.length}`);
    console.log(`  Now unused: ${newUnusedQuestions.length}`);
    console.log(`  Now used: ${newUsedQuestions.length}`);
    
    // Show the next few questions that will be served
    const nextQuestions = newUnusedQuestions
      .sort((a, b) => a.id - b.id)
      .slice(0, 5);
    
    console.log('\n🎯 Next questions to be served:');
    nextQuestions.forEach((q, index) => {
      console.log(`  ${index + 1}. ID ${q.id}: "${q.text}"`);
    });

    console.log('\n🎉 Question reset completed successfully!');
    console.log(`📍 The system will now start serving questions from ID ${START_QUESTION_ID}`);
    
  } catch (error) {
    console.error('\n❌ Error during reset:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the reset
console.log('⚠️  WARNING: This script will modify question usage data in the database');
console.log(`   It will reset the question selection to start from ID ${START_QUESTION_ID}`);
console.log('\n🚀 Starting reset process...\n');

resetQuestionLogic(); 