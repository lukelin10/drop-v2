import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Drops (journal entries)
export const drops = pgTable("drops", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  favorite: boolean("favorite").default(false).notNull(),
  messageCount: integer("message_count").default(0).notNull(),
});

export const insertDropSchema = createInsertSchema(drops).omit({
  id: true,
  createdAt: true,
  messageCount: true,
});

// Messages (chat messages in a drop)
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  dropId: integer("drop_id")
    .notNull()
    .references(() => drops.id),
  text: text("text").notNull(),
  fromUser: boolean("from_user").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// User schema for future use
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type Drop = typeof drops.$inferSelect;
export type InsertDrop = z.infer<typeof insertDropSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Daily questions
export const questions = [
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
