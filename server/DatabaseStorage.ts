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
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Drop methods
  async getDrops(): Promise<any[]> {
    // Join with questions to get the question text
    const dropsWithQuestions = await db
      .select({
        ...drops,
        questionText: questionTable.text
      })
      .from(drops)
      .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
      .orderBy(desc(drops.createdAt));
    
    return dropsWithQuestions;
  }
  
  async getDrop(id: number): Promise<any | undefined> {
    // Join with questions to get the question text
    const [dropWithQuestion] = await db
      .select({
        ...drops,
        questionText: questionTable.text
      })
      .from(drops)
      .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
      .where(eq(drops.id, id));
    
    return dropWithQuestion || undefined;
  }
  
  async createDrop(insertDrop: InsertDrop): Promise<Drop> {
    const [drop] = await db.insert(drops).values(insertDrop).returning();
    
    // Create initial bot response
    await this.createMessage({
      dropId: drop.id,
      text: `Thank you for sharing that. I'd like to explore your thoughts on this more deeply. What led you to this answer?`,
      fromUser: false
    });
    
    return drop;
  }
  
  async updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined> {
    const [updatedDrop] = await db
      .update(drops)
      .set(updates)
      .where(eq(drops.id, id))
      .returning();
    
    return updatedDrop || undefined;
  }
  
  // Message methods
  async getMessages(dropId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.dropId, dropId))
      .orderBy(messages.createdAt);
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    
    // Update message count on the drop
    await db
      .update(drops)
      .set({
        messageCount: sql`${drops.messageCount} + 1`
      })
      .where(eq(drops.id, insertMessage.dropId));
    
    return message;
  }
  
  // Daily question
  async getDailyQuestion(): Promise<string> {
    // Get a question that hasn't been used recently, prioritizing 
    // those with lower usage counts and marked as active
    const [question] = await db
      .select()
      .from(questionTable)
      .where(eq(questionTable.isActive, true))
      .orderBy(questionTable.usageCount)
      .limit(1);

    if (!question) {
      throw new Error("No active questions found");
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
  }
  
  // Question management
  async getQuestions(): Promise<Question[]> {
    return await db
      .select()
      .from(questionTable)
      .orderBy(desc(questionTable.createdAt));
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const [question] = await db
      .insert(questionTable)
      .values(insertQuestion)
      .returning();
    return question;
  }

  async updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined> {
    const [question] = await db
      .update(questionTable)
      .set(updates)
      .where(eq(questionTable.id, id))
      .returning();
    return question;
  }
}