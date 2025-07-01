/**
 * Database Schema Definition
 * 
 * This file defines the database schema for the entire application using Drizzle ORM.
 * It establishes the data models, relationships, and type definitions that are shared
 * between the frontend and backend.
 * 
 * Key components:
 * - Table definitions with columns and constraints
 * - Schema validation with Zod
 * - Type definitions for TypeScript
 * - Relationship mappings between tables
 */

import { pgTable, text, serial, integer, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

/**
 * Sessions Table
 * Stores user session data for authentication with Replit Auth
 * - sid: Unique session identifier
 * - sess: JSON data containing session information
 * - expire: When the session expires
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/**
 * Users Table
 * Stores user profile information
 * - Uses Replit Auth for authentication
 * - Contains basic profile details
 */
export const users = pgTable("sessions_users", {
  id: varchar("id").primaryKey().notNull(),       // Unique user ID from Replit Auth
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  name: varchar("name"),                          // Display name for settings screen
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastAnalysisDate: timestamp("last_analysis_date"),  // When user last ran an analysis (for eligibility tracking)
}, (table) => [
  index("users_last_analysis_date_idx").on(table.lastAnalysisDate),
  index("users_name_idx").on(table.name),
]);

/**
 * Schema for inserting new users
 * Omits auto-generated fields that shouldn't be manually set
 */
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

/**
 * Questions Table
 * Stores introspective journal prompts that are presented to users
 * - Tracks usage statistics
 * - Categorizes questions
 */
export const questionTable = pgTable("question", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),                           // The question prompt
  isActive: boolean("is_active").default(true).notNull(), // Whether this question is available for use
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),                  // When the question was last served to a user
  usageCount: integer("usage_count").default(0).notNull(),// How many times this question has been used
  category: text("category").default("general"),          // Optional categorization of questions
});

/**
 * Schema for inserting new questions
 * Omits auto-generated fields and statistics
 */
export const insertQuestionSchema = createInsertSchema(questionTable).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  usageCount: true,
});

/**
 * Drops Table (Journal Entries)
 * Stores user responses to daily questions
 * - Each drop is a journal entry responding to a question
 * - Connected to conversation messages
 */
export const drops = pgTable("drops", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questionTable.id),
  // Important: Field is named 'answer' in database, but in our code it's referred to as 'text'
  text: text("answer").notNull(),                         // User's response to the question
  createdAt: timestamp("created_at").defaultNow().notNull(),
  messageCount: integer("message_count").default(0).notNull(), // Count of messages in the conversation
  userId: varchar("user_id").references(() => users.id),  // User who created this entry
});

/**
 * Schema for inserting new drops/journal entries
 * Omits auto-generated fields and adds validation for required fields
 */
export const insertDropSchema = createInsertSchema(drops).omit({
  id: true,
  createdAt: true,
  messageCount: true,
}).refine((data) => data.text && data.text.trim().length > 0, {
  message: "Text field is required and cannot be empty",
  path: ["text"],
});

/**
 * Messages Table
 * Stores conversation messages between the user and AI coach
 * - Each message belongs to a specific drop/journal entry
 * - Tracks whether the message is from the user or AI
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  dropId: integer("drop_id")
    .notNull()
    .references(() => drops.id),          // Which journal entry this message belongs to
  text: text("text").notNull(),           // Message content
  fromUser: boolean("from_user").default(false).notNull(), // Whether message is from user (true) or AI (false)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Schema for inserting new messages
 * Omits auto-generated fields and adds validation for required fields
 */
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
}).refine((data) => data.text && data.text.trim().length > 0, {
  message: "Text field is required and cannot be empty",
  path: ["text"],
}).refine((data) => typeof data.fromUser === 'boolean', {
  message: "fromUser field is required and must be a boolean",
  path: ["fromUser"],
});

/**
 * Analyses Table
 * Stores AI-generated analyses of user journal entries
 * - Each analysis contains insights from 7+ journal entries
 * - Users can favorite analyses that resonate with them
 */
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id), // User who owns this analysis
  content: text("content").notNull(),                              // Full analysis content (3 paragraphs max)
  summary: text("summary").notNull(),                              // One-line summary (15 words or less)
  bulletPoints: text("bullet_points").notNull(),                  // 3-5 key insights as bullet points
  createdAt: timestamp("created_at").defaultNow().notNull(),      // When the analysis was generated
  isFavorited: boolean("is_favorited").default(false).notNull(),  // Whether user has hearted this analysis
}, (table) => [
  index("analyses_user_id_idx").on(table.userId),
  index("analyses_created_at_idx").on(table.createdAt),
  index("analyses_is_favorited_idx").on(table.isFavorited),
]);

/**
 * Schema for inserting new analyses
 * Omits auto-generated fields and adds validation for required fields
 */
export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
}).refine((data) => data.content && data.content.trim().length > 0, {
  message: "Content field is required and cannot be empty",
  path: ["content"],
}).refine((data) => data.summary && data.summary.trim().length > 0, {
  message: "Summary field is required and cannot be empty",
  path: ["summary"],
}).refine((data) => data.bulletPoints && data.bulletPoints.trim().length > 0, {
  message: "Bullet points field is required and cannot be empty",
  path: ["bulletPoints"],
});

/**
 * Analysis Drops Junction Table
 * Tracks which drops/journal entries were included in each analysis
 * - Prevents duplicate drop inclusion in same analysis
 * - Enables tracking analysis scope and recreating analysis context
 */
export const analysisDrops = pgTable("analysis_drops", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").notNull().references(() => analyses.id, { onDelete: "cascade" }), // Analysis this drop belongs to
  dropId: integer("drop_id").notNull().references(() => drops.id, { onDelete: "cascade" }),        // Drop included in the analysis
  createdAt: timestamp("created_at").defaultNow().notNull(),                                        // When this relationship was created
}, (table) => [
  index("analysis_drops_analysis_id_idx").on(table.analysisId),
  index("analysis_drops_drop_id_idx").on(table.dropId),
]);

/**
 * Schema for inserting new analysis-drop relationships
 * Omits auto-generated fields and adds validation for required fields
 */
export const insertAnalysisDropSchema = createInsertSchema(analysisDrops).omit({
  id: true,
  createdAt: true,
}).refine((data) => typeof data.analysisId === 'number' && data.analysisId > 0, {
  message: "Analysis ID is required and must be a positive number",
  path: ["analysisId"],
}).refine((data) => typeof data.dropId === 'number' && data.dropId > 0, {
  message: "Drop ID is required and must be a positive number",
  path: ["dropId"],
});

/**
 * Relationship Definitions
 * 
 * These establish the connections between tables for Drizzle ORM
 * to use when performing queries with joins.
 */

// Question can have many drops/journal entries
export const questionRelations = relations(questionTable, ({ many }) => ({
  drops: many(drops),
}));

// Drop/journal entry relationships
export const dropsRelations = relations(drops, ({ one, many }) => ({
  // Each drop has one question
  question: one(questionTable, {
    fields: [drops.questionId],
    references: [questionTable.id],
  }),
  // Each drop can have many messages
  messages: many(messages),
  // Each drop belongs to one user
  user: one(users, {
    fields: [drops.userId],
    references: [users.id],
  }),
  // Each drop can be included in multiple analyses
  analysisDrops: many(analysisDrops),
}));

// Message relationships
export const messagesRelations = relations(messages, ({ one }) => ({
  // Each message belongs to one drop
  drop: one(drops, {
    fields: [messages.dropId],
    references: [drops.id],
  }),
}));

// User relationships
export const usersRelations = relations(users, ({ many }) => ({
  // Each user can have many drops
  drops: many(drops),
  // Each user can have many analyses
  analyses: many(analyses),
}));

// Analysis relationships
export const analysesRelations = relations(analyses, ({ one, many }) => ({
  // Each analysis belongs to one user
  user: one(users, {
    fields: [analyses.userId],
    references: [users.id],
  }),
  // Each analysis can include many drops
  analysisDrops: many(analysisDrops),
}));

// Analysis drops relationships
export const analysisDropsRelations = relations(analysisDrops, ({ one }) => ({
  // Each analysis-drop relationship belongs to one analysis
  analysis: one(analyses, {
    fields: [analysisDrops.analysisId],
    references: [analyses.id],
  }),
  // Each analysis-drop relationship belongs to one drop
  drop: one(drops, {
    fields: [analysisDrops.dropId],
    references: [drops.id],
  }),
}));

/**
 * Type Definitions
 * 
 * These types are used throughout the application for type safety.
 * - Select types are for reading from database
 * - Insert types are for writing to database
 */
export type Question = typeof questionTable.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Drop = typeof drops.$inferSelect;
export type InsertDrop = z.infer<typeof insertDropSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export type AnalysisDrop = typeof analysisDrops.$inferSelect;
export type InsertAnalysisDrop = z.infer<typeof insertAnalysisDropSchema>;

/**
 * Extended Drop type 
 * Includes the question text for convenience when fetching drops
 * This is typically populated by a join query in the backend
 */
export interface DropWithQuestion extends Drop {
  questionText: string;
}

/**
 * Pre-defined Questions
 * 
 * A list of introspective questions to seed the database
 * These questions encourage self-reflection and personal growth
 */
export const questionsList = [
  "What brought you joy today, even if just for a moment?",
  "What small step did you take toward your goals yesterday?",
  "What made you feel grateful today?",
  "What challenge did you overcome recently?",
  "What's something you learned about yourself this week?",
  "When did you feel most at peace today?",
  "What's one thing you'd like to improve about tomorrow?",
  "Who made a positive impact on your day and why?",
  "What boundaries did you set or maintain today?",
  "What's something you're looking forward to?",
  "How did you show yourself compassion today?",
  "What was a moment when you felt proud of yourself?",
  "What's something you want to remember about today?",
  "How did you take care of your physical health today?",
  "What was the most meaningful conversation you had recently?",
  "What are you currently learning or want to learn?",
  "When did you feel most connected to others today?",
  "What worry can you let go of tonight?",
  "What inspired you today?",
  "How did you find balance today?",
];
