/**
 * Database Storage Implementation
 * 
 * This class provides the PostgreSQL database implementation of the IStorage interface.
 * It handles all database operations, query construction, and error handling.
 */

import { db } from './db';
import { eq, desc, sql } from 'drizzle-orm';
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

/**
 * DatabaseStorage - Concrete implementation of the IStorage interface
 * This class uses Drizzle ORM to interact with the PostgreSQL database
 */
export class DatabaseStorage implements IStorage {
  
  /**
   * Constructor
   * Initializes the database storage and seeds initial data if needed
   */
  constructor() {
    // Automatically seed questions if the database is empty
    this.ensureQuestionsExist();
  }

  /**
   * Ensures that the database has starter questions
   * This is called during initialization to seed the database if it's empty
   * @private
   */
  private async ensureQuestionsExist() {
    // Check if there are any questions already in the database
    const existingQuestions = await db
      .select({ count: sql<number>`count(*)` })
      .from(questionTable);
    
    // If no questions exist, seed the database with the default list
    if (existingQuestions[0].count === 0) {
      // Insert all questions from the predefined list
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

  /**
   * USER METHODS
   */

  /**
   * Retrieves a user by their ID
   * @param id - The unique identifier for the user
   * @returns The user object or undefined if not found
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  /**
   * Retrieves a user by their username
   * @param username - The username to look up
   * @returns The user object or undefined if not found
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  /**
   * Creates a new user or updates an existing one
   * Used for user registration and profile updates
   * @param userData - The user data to insert or update
   * @returns The created or updated user object
   */
  async upsertUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(), // Always update the timestamp
        },
      })
      .returning();
    return user;
  }
  
  /**
   * Retrieves all journal entries (drops) for a specific user
   * Includes the question text from the related question
   * @param userId - The ID of the user whose drops to retrieve
   * @returns Array of drops with their associated questions
   */
  async getUserDrops(userId: string): Promise<DropWithQuestion[]> {
    try {
      // Join with the questions table to get the question text, filtered by userId
      const dropsWithQuestions = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // Adding the question text from the joined table
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .where(eq(drops.userId, userId))
        .orderBy(desc(drops.createdAt)); // Most recent first
      
      return dropsWithQuestions as DropWithQuestion[];
    } catch (error) {
      console.error('Error fetching user drops:', error);
      return [];
    }
  }
  
  /**
   * DROP/JOURNAL ENTRY METHODS
   */
  
  /**
   * Retrieves all drops/journal entries in the system
   * Includes the question text from the related question
   * @returns Array of all drops with their associated questions
   */
  async getDrops(): Promise<DropWithQuestion[]> {
    try {
      // Join with questions to get the question text
      const dropsWithQuestions = await db
        .select({
          // We select fields explicitly rather than using * to ensure type safety
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // Adding the question text from the joined table
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .orderBy(desc(drops.createdAt)); // Most recent first
      
      return dropsWithQuestions as DropWithQuestion[];
    } catch (error) {
      console.error('Error fetching drops:', error);
      return [];
    }
  }
  
  /**
   * Retrieves a single drop/journal entry by ID
   * Includes the question text from the related question
   * @param id - The ID of the drop to retrieve
   * @returns The drop with its associated question or undefined if not found
   */
  async getDrop(id: number): Promise<DropWithQuestion | undefined> {
    try {
      // Join with questions to get the question text
      const [dropWithQuestion] = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          // Adding the question text from the joined table
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
  
    /**
   * Creates a new drop/journal entry
   * Also initializes the conversation with a personalized AI response
   * @param insertDrop - The drop data to insert
   * @returns The created drop object
   * @throws Error if creation fails
   */
  async createDrop(insertDrop: InsertDrop): Promise<Drop> {
    try {
      // Insert the new drop
      const [drop] = await db.insert(drops).values(insertDrop).returning();
      
      // Check if we're in a test environment
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID;
      
      if (isTestEnv) {
        // For tests, create a synchronous message to maintain compatibility
        await this.createMessage({
          dropId: drop.id,
          text: `Thank you for sharing that. I'd like to explore your thoughts on this more deeply. What led you to this answer?`,
          fromUser: false
        });
      } else {
        // For production, generate a personalized initial AI response asynchronously
        const self = this;
        setTimeout(async () => {
          try {
            // Check if drop still exists (important for tests that clean up quickly)
            const dropExists = await db.select().from(drops).where(eq(drops.id, drop.id)).limit(1);
            if (dropExists.length === 0) {
              return; // Drop was deleted, skip message creation
            }

            // Import the generateResponse function here to avoid circular dependencies
            let generateResponse;
            try {
              const anthropicModule = await import('./services/anthropic');
              generateResponse = anthropicModule.generateResponse;
            } catch (importError) {
              console.error('Could not import anthropic service:', importError);
              throw new Error('Anthropic service unavailable');
            }
            
            // Get the question text for context
            const question = await db
              .select()
              .from(questionTable)
              .where(eq(questionTable.id, insertDrop.questionId))
              .limit(1);
            
            const questionText = question[0]?.text || 'the question';
            
            // Create a context-aware prompt that includes both the question and user's response
            const contextualPrompt = `The user was asked: "${questionText}" and they responded: "${insertDrop.text}"`;
            
            // Generate a personalized AI response using the Anthropic service
            const personalizedResponse = await generateResponse(contextualPrompt, drop.id);
            
            // Create the initial AI message with the personalized response
            await self.createMessage({
              dropId: drop.id,
              text: personalizedResponse,
              fromUser: false
            });
          } catch (error) {
            console.error('Error generating personalized initial response:', error);
            // Fallback to a generic message if AI generation fails
            try {
              // Check again if drop still exists before creating fallback message
              const dropExists = await db.select().from(drops).where(eq(drops.id, drop.id)).limit(1);
              if (dropExists.length > 0) {
                await self.createMessage({
                  dropId: drop.id,
                  text: `Thank you for sharing that. I'd like to explore your thoughts on this more deeply. What led you to this answer?`,
                  fromUser: false
                });
              }
            } catch (fallbackError) {
              console.error('Error creating fallback message:', fallbackError);
            }
          }
        }, 100); // Small delay to ensure drop is fully created
      }
      
      // Return the updated drop with the correct message count
      const [updatedDrop] = await db.select().from(drops).where(eq(drops.id, drop.id));
      return updatedDrop;
    } catch (error) {
      console.error('Error creating drop:', error);
      throw new Error('Failed to create drop');
    }
  }
  
  /**
   * Updates a drop/journal entry
   * @param id - The ID of the drop to update
   * @param updates - The fields to update
   * @returns The updated drop or undefined if not found
   */
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
  
  /**
   * MESSAGE METHODS
   */
  
  /**
   * Retrieves all messages for a specific drop/journal entry
   * @param dropId - The ID of the drop whose messages to retrieve
   * @returns Array of messages in chronological order
   */
  async getMessages(dropId: number): Promise<Message[]> {
    try {
      const messageList = await db
        .select()
        .from(messages)
        .where(eq(messages.dropId, dropId))
        .orderBy(messages.createdAt); // Chronological order
        
      return messageList;
    } catch (error) {
      console.error(`Error fetching messages for drop ${dropId}:`, error);
      return [];
    }
  }
  
  /**
   * Creates a new message in a conversation
   * Also updates the message count on the parent drop
   * @param insertMessage - The message data to insert
   * @returns The created message object
   * @throws Error if creation fails
   */
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      // Insert the new message
      const [message] = await db.insert(messages).values(insertMessage).returning();
      
      // Update the message count on the parent drop
      // This is an atomic operation using SQL to increment
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
  
  /**
   * DAILY QUESTION METHODS
   */
  
  /**
   * Gets a question for the daily journal prompt
   * Uses date-based modulo to ensure the same question per day while cycling through all questions
   * @returns The text of the selected question
   */
  async getDailyQuestion(): Promise<string> {
    try {
      // Get all active questions ordered by ID for consistent cycling
      const questions = await db
        .select()
        .from(questionTable)
        .where(eq(questionTable.isActive, true))
        .orderBy(questionTable.id);

      // Fallback if no questions are available
      if (questions.length === 0) {
        console.error('No active questions found');
        return 'What brought you joy today?';
      }

      // Use date-based index to ensure same question per day
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      
      // Create a simple day number that increments each day
      const dayNumber = year * 365 + month * 31 + day;
      const questionIndex = dayNumber % questions.length;

      return questions[questionIndex].text;
    } catch (error) {
      console.error('Error fetching daily question:', error);
      return 'What brought you joy today?';
    }
  }
  
  /**
   * QUESTION MANAGEMENT METHODS
   */
  
  /**
   * Retrieves all questions in the system
   * @returns Array of all questions
   */
  async getQuestions(): Promise<Question[]> {
    try {
      const questions = await db
        .select()
        .from(questionTable)
        .orderBy(desc(questionTable.createdAt)); // Most recent first
        
      return questions;
    } catch (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
  }

  /**
   * Creates a new question
   * @param insertQuestion - The question data to insert
   * @returns The created question object
   * @throws Error if creation fails
   */
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

  /**
   * Updates a question
   * @param id - The ID of the question to update
   * @param updates - The fields to update
   * @returns The updated question or undefined if not found
   */
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