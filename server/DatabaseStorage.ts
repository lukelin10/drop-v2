import { db } from './db';
import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import { 
  questionTable,
  drops,
  messages,
  users,
  type Question,
  type InsertQuestion,
  type Drop,
  type InsertDrop,
  type Message,
  type InsertMessage,
  type User,
  type InsertUser,
  type DropWithQuestion,
  questionsList
} from "@shared/schema";
import { getRandomInt } from "../client/src/lib/utils";
import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  constructor() {
    // Seed questions if needed
    this.ensureQuestionsExist();
  }

  private async ensureQuestionsExist() {
    // Check if there are any questions
    const existingQuestions = await db
      .select({ count: sql<number>`count(*)` })
      .from(questionTable);
    
    if (existingQuestions[0].count === 0) {
      // Insert the questions
      await db.insert(questionTable).values(
        questionsList.map(text => ({ 
          text,
          isActive: true,
          category: 'general'
        }))
      );
      console.log(`Seeded ${questionsList.length} questions`);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  async getUserDrops(userId: string): Promise<DropWithQuestion[]> {
    try {
      // Join with questions to get the question text, filtered by userId
      const dropsWithQuestions = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          favorite: drops.favorite,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // select the question text from question table
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .where(eq(drops.userId, userId))
        .orderBy(desc(drops.createdAt));
      
      return dropsWithQuestions as DropWithQuestion[];
    } catch (error) {
      console.error('Error fetching user drops:', error);
      return [];
    }
  }
  
  // Drop methods
  async getDrops(): Promise<DropWithQuestion[]> {
    try {
      // Join with questions to get the question text
      // select all columns from drops table individually
      const dropsWithQuestions = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          favorite: drops.favorite,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // select the question text from question table
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .orderBy(desc(drops.createdAt));
      
      return dropsWithQuestions as DropWithQuestion[];
    } catch (error) {
      console.error('Error fetching drops:', error);
      return [];
    }
  }
  
  async getDrop(id: number): Promise<DropWithQuestion | undefined> {
    try {
      // Join with questions to get the question text
      const [dropWithQuestion] = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          favorite: drops.favorite,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // select the question text from question table
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .where(eq(drops.id, id));
      
      return dropWithQuestion as DropWithQuestion;
    } catch (error) {
      console.error(`Error fetching drop with id ${id}:`, error);
      return undefined;
    }
  }
  
  async createDrop(insertDrop: InsertDrop): Promise<Drop> {
    try {
      const [drop] = await db.insert(drops).values(insertDrop).returning();
      
      // Create initial bot response
      await this.createMessage({
        dropId: drop.id,
        text: `Thank you for sharing that. I'd like to explore your thoughts on this more deeply. What led you to this answer?`,
        fromUser: false
      });
      
      return drop;
    } catch (error) {
      console.error('Error creating drop:', error);
      throw new Error('Failed to create drop');
    }
  }
  
  async updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined> {
    try {
      const [updatedDrop] = await db
        .update(drops)
        .set(updates)
        .where(eq(drops.id, id))
        .returning();
      
      return updatedDrop;
    } catch (error) {
      console.error(`Error updating drop with id ${id}:`, error);
      return undefined;
    }
  }
  
  // Message methods
  async getMessages(dropId: number): Promise<Message[]> {
    try {
      const messageList = await db
        .select()
        .from(messages)
        .where(eq(messages.dropId, dropId))
        .orderBy(messages.createdAt);
        
      return messageList;
    } catch (error) {
      console.error(`Error fetching messages for drop ${dropId}:`, error);
      return [];
    }
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const [message] = await db.insert(messages).values(insertMessage).returning();
      
      // Update message count on the drop
      await db
        .update(drops)
        .set({
          messageCount: sql`${drops.messageCount} + 1`
        })
        .where(eq(drops.id, insertMessage.dropId));
      
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }
  }
  
  // Daily question
  async getDailyQuestion(): Promise<string> {
    try {
      // Get a question that hasn't been used recently, prioritizing 
      // those with lower usage counts and marked as active
      const [question] = await db
        .select()
        .from(questionTable)
        .where(eq(questionTable.isActive, true))
        .orderBy(questionTable.usageCount)
        .limit(1);

      if (!question) {
        console.error('No active questions found');
        return 'What is on your mind today?'; // Default fallback question
      }

      // Update the usage statistics
      await db
        .update(questionTable)
        .set({
          lastUsedAt: new Date(),
          usageCount: sql`${questionTable.usageCount} + 1`
        })
        .where(eq(questionTable.id, question.id));

      return question.text;
    } catch (error) {
      console.error('Error fetching daily question:', error);
      return 'How are you feeling today?'; // Emergency fallback question
    }
  }
  
  // Question management
  async getQuestions(): Promise<Question[]> {
    try {
      const questions = await db
        .select()
        .from(questionTable)
        .orderBy(desc(questionTable.createdAt));
        
      return questions;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    try {
      const [question] = await db
        .insert(questionTable)
        .values(insertQuestion)
        .returning();
      return question;
    } catch (error) {
      console.error('Error creating question:', error);
      throw new Error('Failed to create question');
    }
  }

  async updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined> {
    try {
      const [question] = await db
        .update(questionTable)
        .set(updates)
        .where(eq(questionTable.id, id))
        .returning();
      return question;
    } catch (error) {
      console.error(`Error updating question with id ${id}:`, error);
      return undefined;
    }
  }
}