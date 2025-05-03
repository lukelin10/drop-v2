import express, { Express } from 'express';
import { registerRoutes } from '../server/routes';

// Mock authentication middleware for testing
jest.mock('../server/replitAuth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    req.user = { 
      claims: { sub: 'test-user-id' },
      expires_at: Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
    };
    req.isAuthenticated = () => true;
    next();
  },
  setupAuth: jest.fn(async () => {
    // Mock implementation that does nothing
    return;
  })
}));

// Mock Claude API for testing
jest.mock('../server/services/anthropic', () => ({
  generateResponse: jest.fn().mockImplementation(async (userMessage, dropId) => {
    return `Test AI response to: ${userMessage}`;
  }),
  getConversationHistory: jest.fn().mockResolvedValue([])
}));

// Set up a test express app
export async function setupTestApp(): Promise<Express> {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Register all routes (but don't actually start the server)
  await registerRoutes(app);
  
  return app;
}

// Export a singleton instance for tests to use
let testAppInstance: Express | null = null;
export async function getTestApp(): Promise<Express> {
  if (!testAppInstance) {
    testAppInstance = await setupTestApp();
  }
  return testAppInstance;
}