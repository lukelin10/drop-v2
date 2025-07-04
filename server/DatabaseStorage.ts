/**
 * Database Storage Implementation
 * 
 * This class provides the PostgreSQL database implementation of the IStorage interface.
 * It handles all database operations, query construction, and error handling.
 */

import { db } from './db';
import { eq, desc, sql, and } from 'drizzle-orm';
import {
  questionTable,
  drops,
  messages,
  users,
  analyses,
  analysisDrops,
  type Question,
  type InsertQuestion,
  type Drop,
  type InsertDrop,
  type Message,
  type InsertMessage,
  type User,
  type InsertUser,
  type DropWithQuestion,
  type Analysis,
  type InsertAnalysis,
  type AnalysisDrop,
  type InsertAnalysisDrop
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
   * Initializes the database storage
   */
  constructor() {
    // Database storage initialization - no automatic seeding or modifications
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
   * Returns the same question for the entire day, advancing to the next question each day
   * Questions are selected sequentially by ID starting from the lowest unused question
   * @returns The text of the selected question for today
   */
  async getDailyQuestion(): Promise<string> {
    try {
      // Get today's date in UTC to ensure consistent behavior across timezones
      const today = new Date();
      const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Check if we already have a question marked for today
      const todaysQuestion = await db
        .select()
        .from(questionTable)
        .where(and(
          eq(questionTable.isActive, true),
          sql`DATE(${questionTable.lastUsedAt}) = ${todayDateString}`
        ))
        .limit(1);

      // If we already selected a question for today, return it
      if (todaysQuestion.length > 0) {
        return todaysQuestion[0].text;
      }

      // No question selected for today yet, so select the next one
      // First, try to get the next unused question (where lastUsedAt is null)
      let nextQuestion = await db
        .select()
        .from(questionTable)
        .where(and(
          eq(questionTable.isActive, true),
          sql`${questionTable.lastUsedAt} IS NULL`
        ))
        .orderBy(questionTable.id)
        .limit(1);

      // If no unused questions, fallback to the oldest used question
      // This handles the case where all questions have been used at least once
      if (nextQuestion.length === 0) {
        nextQuestion = await db
          .select()
          .from(questionTable)
          .where(eq(questionTable.isActive, true))
          .orderBy(questionTable.lastUsedAt, questionTable.id)
          .limit(1);
      }

      // Final fallback if no active questions exist
      if (nextQuestion.length === 0) {
        console.error('No active questions found');
        return 'What brought you joy today?';
      }

      const selectedQuestion = nextQuestion[0];

      // Mark this question as used for today
      await db
        .update(questionTable)
        .set({
          lastUsedAt: new Date(), // This will be today's timestamp
          usageCount: sql`${questionTable.usageCount} + 1`
        })
        .where(eq(questionTable.id, selectedQuestion.id));

      return selectedQuestion.text;
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

  /**
   * ANALYSIS METHODS
   */

  /**
   * Creates a new analysis and tracks which drops were included
   * @param insertAnalysis - The analysis data to insert
   * @param includedDropIds - Array of drop IDs that were analyzed
   * @returns The created analysis object
   * @throws Error if creation fails
   */
  async createAnalysis(insertAnalysis: InsertAnalysis, includedDropIds: number[]): Promise<Analysis> {
    try {
      // Insert the new analysis
      const [analysis] = await db.insert(analyses).values(insertAnalysis).returning();

      // Create analysis-drop relationships for each included drop
      if (includedDropIds.length > 0) {
        const analysisDropData = includedDropIds.map(dropId => ({
          analysisId: analysis.id,
          dropId: dropId
        }));

        await db.insert(analysisDrops).values(analysisDropData);
      }

      // Update user's last analysis date
      await db
        .update(users)
        .set({ lastAnalysisDate: new Date() })
        .where(eq(users.id, insertAnalysis.userId));

      return analysis;
    } catch (error) {
      console.error('Error creating analysis:', error);
      throw new Error('Failed to create analysis');
    }
  }

  /**
   * Retrieves all analyses for a specific user
   * @param userId - The ID of the user whose analyses to retrieve
   * @param limit - Maximum number of analyses to return (default: 20)
   * @param offset - Number of analyses to skip for pagination (default: 0)
   * @returns Array of analyses ordered by newest first
   */
  async getUserAnalyses(userId: string, limit: number = 20, offset: number = 0): Promise<Analysis[]> {
    try {
      const userAnalyses = await db
        .select()
        .from(analyses)
        .where(eq(analyses.userId, userId))
        .orderBy(desc(analyses.createdAt))
        .limit(limit)
        .offset(offset);

      return userAnalyses;
    } catch (error) {
      console.error('Error fetching user analyses:', error);
      return [];
    }
  }

  /**
   * Retrieves a single analysis by ID
   * @param id - The ID of the analysis to retrieve
   * @returns The analysis or undefined if not found
   */
  async getAnalysis(id: number): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db
        .select()
        .from(analyses)
        .where(eq(analyses.id, id));

      return analysis;
    } catch (error) {
      console.error(`Error fetching analysis with id ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Updates the favorite status of an analysis
   * @param id - The ID of the analysis to update
   * @param isFavorited - Whether the analysis should be favorited
   * @returns The updated analysis or undefined if not found
   */
  async updateAnalysisFavorite(id: number, isFavorited: boolean): Promise<Analysis | undefined> {
    try {
      const [analysis] = await db
        .update(analyses)
        .set({ isFavorited })
        .where(eq(analyses.id, id))
        .returning();

      return analysis;
    } catch (error) {
      console.error(`Error updating analysis favorite status with id ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Checks if a user is eligible for analysis (has 3+ unanalyzed drops)
   * @param userId - The ID of the user to check
   * @returns Object containing eligibility status and count information
   */
  async getAnalysisEligibility(userId: string): Promise<{
    isEligible: boolean;
    unanalyzedCount: number;
    requiredCount: number;
  }> {
    try {
      // Get user's last analysis date
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return { isEligible: false, unanalyzedCount: 0, requiredCount: 3 };
      }

      // Count drops created since last analysis (or all drops if no previous analysis)
      const lastAnalysisDate = user.lastAnalysisDate || new Date(0); // Epoch if never analyzed

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(drops)
        .where(sql`${drops.userId} = ${userId} AND ${drops.createdAt} > ${lastAnalysisDate}`);

      const unanalyzedCount = Number(result.count);
      const requiredCount = 3;

      return {
        isEligible: unanalyzedCount >= requiredCount,
        unanalyzedCount,
        requiredCount
      };
    } catch (error) {
      console.error('Error checking analysis eligibility:', error);
      return { isEligible: false, unanalyzedCount: 0, requiredCount: 3 };
    }
  }

  /**
   * Gets unanalyzed drops for a user (drops created since last analysis)
   * @param userId - The ID of the user whose unanalyzed drops to retrieve  
   * @returns Array of drops that haven't been analyzed yet
   */
  async getUnanalyzedDrops(userId: string): Promise<DropWithQuestion[]> {
    try {
      // Get user's last analysis date
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return [];
      }

      // Get drops created since last analysis (or all drops if no previous analysis)
      const lastAnalysisDate = user.lastAnalysisDate || new Date(0); // Epoch if never analyzed

      const unanalyzedDrops = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          questionText: questionTable.text
        })
        .from(drops)
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .where(sql`${drops.userId} = ${userId} AND ${drops.createdAt} > ${lastAnalysisDate}`)
        .orderBy(drops.createdAt); // Chronological order for analysis

      return unanalyzedDrops as DropWithQuestion[];
    } catch (error) {
      console.error('Error fetching unanalyzed drops:', error);
      return [];
    }
  }

  /**
   * Gets drops that were included in a specific analysis
   * @param analysisId - The ID of the analysis
   * @returns Array of drops that were analyzed
   */
  async getAnalysisDrops(analysisId: number): Promise<DropWithQuestion[]> {
    try {
      const analysisDropsList = await db
        .select({
          id: drops.id,
          questionId: drops.questionId,
          text: drops.text,
          createdAt: drops.createdAt,
          messageCount: drops.messageCount,
          userId: drops.userId,
          questionText: questionTable.text
        })
        .from(analysisDrops)
        .innerJoin(drops, eq(analysisDrops.dropId, drops.id))
        .leftJoin(questionTable, eq(drops.questionId, questionTable.id))
        .where(eq(analysisDrops.analysisId, analysisId))
        .orderBy(drops.createdAt);

      return analysisDropsList as DropWithQuestion[];
    } catch (error) {
      console.error(`Error fetching drops for analysis ${analysisId}:`, error);
      return [];
    }
  }
}