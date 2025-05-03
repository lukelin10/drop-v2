import { 
  Question, InsertQuestion,
  Drop, InsertDrop, DropWithQuestion,
  Message, InsertMessage, 
  User, InsertUser
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  
  // Drop methods
  getDrops(): Promise<DropWithQuestion[]>;
  getUserDrops(userId: string): Promise<DropWithQuestion[]>;
  getDrop(id: number): Promise<DropWithQuestion | undefined>;
  createDrop(drop: InsertDrop): Promise<Drop>;
  updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined>;
  
  // Message methods
  getMessages(dropId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Methods for the daily question
  getDailyQuestion(): Promise<string>;
  
  // Question management
  getQuestions(): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: number, updates: Partial<Question>): Promise<Question | undefined>;
}

import { DatabaseStorage } from './DatabaseStorage';

export const storage = new DatabaseStorage();
