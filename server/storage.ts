import { 
  Drop, InsertDrop, 
  Message, InsertMessage, 
  User, InsertUser, 
  questions
} from "@shared/schema";
import { getRandomInt } from "../client/src/lib/utils";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Drop methods
  getDrops(): Promise<Drop[]>;
  getDrop(id: number): Promise<Drop | undefined>;
  createDrop(drop: InsertDrop): Promise<Drop>;
  updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined>;
  
  // Message methods
  getMessages(dropId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Methods for the daily question
  getDailyQuestion(): Promise<string>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private drops: Map<number, Drop>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentDropId: number;
  private currentMessageId: number;
  private dailyQuestion: string;

  constructor() {
    this.users = new Map();
    this.drops = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentDropId = 1;
    this.currentMessageId = 1;
    
    // Set a random daily question
    this.dailyQuestion = questions[getRandomInt(0, questions.length - 1)];
    
    // Seed with some initial data
    this.seedData();
  }

  private seedData() {
    // Seed a few sample drops
    const sampleDrops: InsertDrop[] = [
      {
        question: "What small step did you take toward your goals yesterday?",
        answer: "I finally started the online course on web development that I've been putting off for weeks. It felt good to take that first step and I ended up spending more time on it than I initially planned because I was enjoying it.",
        favorite: true
      },
      {
        question: "What made you feel grateful today?",
        answer: "The unexpected call from my old friend really brightened my day. We talked for an hour and it reminded me how important connections are.",
        favorite: false
      },
      {
        question: "What challenge did you overcome recently?",
        answer: "I finally had that difficult conversation with my coworker that I'd been avoiding. It was uncomfortable at first, but we ended up understanding each other better.",
        favorite: false
      }
    ];
    
    // Add the sample drops with dates a few days apart
    const now = new Date();
    for (let i = 0; i < sampleDrops.length; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - (i + 1));
      
      const drop: Drop = {
        id: this.currentDropId++,
        ...sampleDrops[i],
        createdAt: date.toISOString(),
        messageCount: i * 2 + 5
      };
      
      this.drops.set(drop.id, drop);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date().toISOString()
    };
    this.users.set(id, user);
    return user;
  }
  
  // Drop methods
  async getDrops(): Promise<Drop[]> {
    return Array.from(this.drops.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getDrop(id: number): Promise<Drop | undefined> {
    return this.drops.get(id);
  }
  
  async createDrop(insertDrop: InsertDrop): Promise<Drop> {
    const id = this.currentDropId++;
    const drop: Drop = {
      ...insertDrop,
      id,
      createdAt: new Date().toISOString(),
      messageCount: 1
    };
    this.drops.set(id, drop);
    
    // Create initial bot response
    await this.createMessage({
      dropId: id,
      text: `Thank you for sharing that. It's interesting to reflect on "${drop.question}" - what made you choose that particular response?`,
      fromUser: false
    });
    
    return drop;
  }
  
  async updateDrop(id: number, updates: Partial<Drop>): Promise<Drop | undefined> {
    const drop = this.drops.get(id);
    if (!drop) return undefined;
    
    const updatedDrop = { ...drop, ...updates };
    this.drops.set(id, updatedDrop);
    return updatedDrop;
  }
  
  // Message methods
  async getMessages(dropId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.dropId === dropId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date().toISOString()
    };
    this.messages.set(id, message);
    
    // Update message count on the drop
    const drop = this.drops.get(insertMessage.dropId);
    if (drop) {
      this.drops.set(insertMessage.dropId, {
        ...drop,
        messageCount: drop.messageCount + 1
      });
    }
    
    return message;
  }
  
  // Daily question
  async getDailyQuestion(): Promise<string> {
    return this.dailyQuestion;
  }
}

export const storage = new MemStorage();
