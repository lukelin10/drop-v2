/**
 * Storage Interface
 * 
 * This file defines the storage interface for all data operations in the application.
 * It provides an abstraction layer between the application logic and the database,
 * following the Repository pattern to centralize data access logic.
 * 
 * The IStorage interface defines all methods for CRUD operations on the database,
 * organized by entity type. This allows for easy swapping of storage implementations
 * (e.g., memory storage vs database storage) for testing or development purposes.
 */

import { 
  Question, InsertQuestion,
  Drop, InsertDrop, DropWithQuestion,
  Message, InsertMessage, 
  User, InsertUser,
  Analysis, InsertAnalysis
} from "@shared/schema";

/**
 * The storage interface defines all methods for interacting with the application's data
 * All route handlers and business logic should use this interface rather than
 * accessing the database directly, promoting separation of concerns.
 */
export interface IStorage {
  /**
   * User-related methods
   * Handle user profile management and retrieval
   */
  getUser(id: string): Promise<User | undefined>;               // Get user by their ID
  getUserByUsername(username: string): Promise<User | undefined>; // Get user by their username
  upsertUser(user: InsertUser): Promise<User>;                  // Create or update a user record
  
  /**
   * Drop/Journal Entry methods
   * Handle creation, retrieval, and updating of journal entries
   */
  getDrops(): Promise<DropWithQuestion[]>;                      // Get all drops with their associated questions
  getUserDrops(userId: string): Promise<DropWithQuestion[]>;    // Get drops for a specific user
  getDrop(id: number): Promise<DropWithQuestion | undefined>;   // Get a single drop by ID
  createDrop(drop: InsertDrop): Promise<Drop>;                  // Create a new journal entry
  updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined>; // Update an existing drop
  
  /**
   * Message methods
   * Handle chat messages in conversations with the AI coach
   */
  getMessages(dropId: number): Promise<Message[]>;              // Get all messages for a specific drop
  createMessage(message: InsertMessage): Promise<Message>;      // Add a new message to a conversation
  
  /**
   * Daily Question methods
   * Handle the selection and retrieval of daily journal prompts
   */
  getDailyQuestion(): Promise<string>;                          // Get a question for the daily prompt
  
  /**
   * Question management methods
   * Handle the creation and management of journal prompt questions
   */
  getQuestions(): Promise<Question[]>;                          // Get all available questions
  createQuestion(question: InsertQuestion): Promise<Question>;  // Add a new question
  updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined>; // Update question attributes
  
  /**
   * Analysis methods
   * Handle AI-powered analysis creation, retrieval, and management
   */
  createAnalysis(analysis: InsertAnalysis, includedDropIds: number[]): Promise<Analysis>; // Create new analysis with included drops
  getUserAnalyses(userId: string, limit?: number, offset?: number): Promise<Analysis[]>; // Get user's analyses with pagination
  getAnalysis(id: number): Promise<Analysis | undefined>;        // Get a single analysis by ID
  updateAnalysisFavorite(id: number, isFavorited: boolean): Promise<Analysis | undefined>; // Toggle analysis favorite status
  getAnalysisEligibility(userId: string): Promise<{             // Check if user can run analysis
    isEligible: boolean;
    unanalyzedCount: number;
    requiredCount: number;
  }>;
  getUnanalyzedDrops(userId: string): Promise<DropWithQuestion[]>; // Get drops that haven't been analyzed
  getAnalysisDrops(analysisId: number): Promise<DropWithQuestion[]>; // Get drops included in specific analysis
}

/**
 * Storage Implementation
 * 
 * The application uses a Postgres database via the DatabaseStorage implementation.
 * This provides a concrete implementation of the IStorage interface,
 * handling the actual database operations.
 */
import { DatabaseStorage } from './DatabaseStorage';

// Single instance of the storage interface used throughout the application
export const storage = new DatabaseStorage();
