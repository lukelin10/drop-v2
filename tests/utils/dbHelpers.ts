import { testDb } from '../setup';
import * as schema from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Creates a test drop with specified or default properties
 */
export async function createTestDrop(options: {
  userId?: string;
  questionId: number;
  text?: string;
}) {
  const { userId = 'test-user-id', questionId, text = 'Test drop content' } = options;
  
  // First check if userId is a field in the drops table
  const dropValues: any = {
    questionId,
    text,
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 0
  };
  
  // Add userId if it's a valid field (checking schema)
  if (schema.drops.userId) {
    dropValues.userId = userId;
  }
  
  const drop = await testDb.insert(schema.drops).values(dropValues).returning();
  
  return drop[0];
}

/**
 * Creates a test message with specified or default properties
 */
export async function createTestMessage(options: {
  dropId: number;
  text?: string;
  fromUser?: boolean;
}) {
  const { dropId, text = 'Test message', fromUser = true } = options;
  
  const message = await testDb.insert(schema.messages).values({
    dropId,
    text,
    fromUser,
    createdAt: new Date()
  }).returning();
  
  return message[0];
}

/**
 * Creates a test question with specified or default properties
 */
export async function createTestQuestion(options: {
  text?: string;
  isActive?: boolean;
  category?: string;
}) {
  const { 
    text = 'Test question?', 
    isActive = true, 
    category = 'test'
  } = options;
  
  const question = await testDb.insert(schema.questionTable).values({
    text,
    isActive,
    category,
    createdAt: new Date()
  }).returning();
  
  return question[0];
}

/**
 * Retrieves all drops for a user
 */
export async function getDropsForUser(userId: string) {
  return await testDb.select().from(schema.drops).where(eq(schema.drops.userId, userId));
}

/**
 * Retrieves all messages for a drop
 */
export async function getMessagesForDrop(dropId: number) {
  return await testDb.select().from(schema.messages).where(eq(schema.messages.dropId, dropId));
}