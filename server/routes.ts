/**
 * API Routes Configuration
 * 
 * This file defines all the API endpoints for the application. 
 * It handles routing, authentication, request validation, and response formatting.
 * The routes are organized by resource type (auth, questions, drops, messages).
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDropSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { generateResponse } from "./services/anthropic";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Check for required API key at startup
if (!process.env.ANTHROPIC_API_KEY) {
  console.log("Missing ANTHROPIC_API_KEY environment variable.");
  console.log("Please provide an Anthropic API key to use the Claude AI integration.");
}

/**
 * Main function to register all API routes with the Express application
 * @param app - The Express application instance
 * @returns An HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize authentication (Replit Auth)
  await setupAuth(app);
  
  /**
   * AUTHENTICATION ROUTES
   */
  
  /**
   * Get the current authenticated user
   * GET /api/auth/user
   */
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Extract user ID from the authenticated request
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  /**
   * QUESTION ROUTES
   */
  
  /**
   * Get the daily journal prompt question
   * GET /api/daily-question
   */
  app.get("/api/daily-question", isAuthenticated, async (req, res) => {
    try {
      const question = await storage.getDailyQuestion();
      res.json({ question });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily question" });
    }
  });
  
  /**
   * Get all available questions
   * GET /api/questions
   */
  app.get("/api/questions", isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  /**
   * DROP/JOURNAL ENTRY ROUTES
   */
  
  /**
   * Get all drops for the authenticated user
   * GET /api/drops
   */
  app.get("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drops = await storage.getUserDrops(userId);
      res.json(drops);
    } catch (error) {
      console.error("Error fetching user drops:", error);
      res.status(500).json({ message: "Failed to fetch drops" });
    }
  });

  /**
   * Get a specific drop by ID
   * GET /api/drops/:id
   * Ensures that users can only access their own drops
   */
  app.get("/api/drops/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      const drop = await storage.getDrop(id);
      
      // Handle drop not found
      if (!drop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      // Security check: ensure the drop belongs to the authenticated user
      if (drop.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(drop);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drop" });
    }
  });

  /**
   * Create a new drop/journal entry
   * POST /api/drops
   * Validates the request body against the schema
   */
  app.post("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      // Validate the request data against the schema
      const parseResult = insertDropSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid drop data", errors: parseResult.error.format() });
      }
      
      // Validate that the question exists
      const questions = await storage.getQuestions();
      const questionExists = questions.some(q => q.id === parseResult.data.questionId);
      if (!questionExists) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Add user ID to the drop data
      const dropData = {
        ...parseResult.data,
        userId: req.user.claims.sub
      };
      
      // Create the drop in the database
      const drop = await storage.createDrop(dropData);
      res.status(201).json(drop);
    } catch (error) {
      res.status(500).json({ message: "Failed to create drop" });
    }
  });

  /**
   * Update a drop
   * PATCH /api/drops/:id
   * Validates the request body against a schema
   */
  app.patch("/api/drops/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      
      // Define validation schema for updates
      const updateSchema = z.object({
        text: z.string().optional()
      });
      
      // Check if the drop exists and belongs to the user
      const existingDrop = await storage.getDrop(id);
      if (!existingDrop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      // Security check: ensure the drop belongs to the authenticated user
      if (existingDrop.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate the update data
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid update data", errors: parseResult.error.format() });
      }
      
      // Update the drop in the database
      const updatedDrop = await storage.updateDrop(id, parseResult.data);
      
      res.json(updatedDrop);
    } catch (error) {
      console.error("Error updating drop:", error);
      res.status(500).json({ message: "Failed to update drop" });
    }
  });

  /**
   * MESSAGE ROUTES
   */
  
  /**
   * Get all messages for a specific drop
   * GET /api/drops/:id/messages
   * Ensures users can only access messages for their own drops
   */
  app.get("/api/drops/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const dropId = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      
      // Check if the drop exists and belongs to the user
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      // Security check: ensure the drop belongs to the authenticated user
      if (drop.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get messages for the drop
      const messages = await storage.getMessages(dropId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  /**
   * Create a new message in a conversation
   * POST /api/messages
   * Validates the request body and automatically generates an AI response
   */
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      // Validate the message data
      const parseResult = insertMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid message data", errors: parseResult.error.format() });
      }
      
      const userId = req.user.claims.sub;
      const dropId = parseResult.data.dropId;
      
      // Check if the drop exists and belongs to the user
      const drop = await storage.getDrop(dropId);
      if (!drop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      // Security check: ensure the drop belongs to the authenticated user
      if (drop.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Save the user's message
      const message = await storage.createMessage(parseResult.data);
      
      // Asynchronously generate and save an AI response
      // We use setTimeout to make this non-blocking so we can return the user's message immediately
      setTimeout(async () => {
        try {
          // First check if the drop still exists (in case it was deleted during cleanup)
          const dropExists = await storage.getDrop(parseResult.data.dropId);
          if (!dropExists) {
            console.log(`Drop ${parseResult.data.dropId} no longer exists, skipping AI response generation`);
            return;
          }
          
          if (!process.env.ANTHROPIC_API_KEY) {
            // If no API key is provided, use a fallback response
            const botResponse = "I'm sorry, I can't generate a thoughtful response right now. Please try again later.";
            await storage.createMessage({
              dropId: parseResult.data.dropId,
              text: botResponse,
              fromUser: false
            });
          } else {
            // Use Claude AI to generate a personalized response
            const botResponse = await generateResponse(
              parseResult.data.text,
              parseResult.data.dropId
            );
            
            // Save the AI response to the database
            await storage.createMessage({
              dropId: parseResult.data.dropId,
              text: botResponse,
              fromUser: false
            });
          }
        } catch (error) {
          console.error("Error generating bot response:", error);
          // Only try to create a fallback response if the drop still exists
          try {
            const dropExists = await storage.getDrop(parseResult.data.dropId);
            if (dropExists) {
              await storage.createMessage({
                dropId: parseResult.data.dropId,
                text: "I apologize, but I'm having trouble processing your message right now. Could you try again?",
                fromUser: false
              });
            }
          } catch (fallbackError) {
            console.error("Error creating fallback response:", fallbackError);
          }
        }
      }, 1500); // Small delay to simulate thinking
      
      // Return the user's message immediately
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  /**
   * ANALYSIS ROUTES
   */
  
  /**
   * Check if user is eligible for analysis
   * GET /api/analyses/eligibility
   */
  app.get("/api/analyses/eligibility", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const eligibility = await storage.getAnalysisEligibility(userId);
      res.json(eligibility);
    } catch (error) {
      console.error("Error checking analysis eligibility:", error);
      res.status(500).json({ message: "Failed to check analysis eligibility" });
    }
  });

  /**
   * Create a new analysis
   * POST /api/analyses
   */
  app.post("/api/analyses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Import the analysis service
      const { createAnalysisForUser } = await import('./services/analysisService');
      
      // Create analysis using the orchestration service
      const result = await createAnalysisForUser(userId);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: result.error,
          metadata: result.metadata
        });
      }
      
      res.status(201).json(result.analysis);
    } catch (error) {
      console.error("Error creating analysis:", error);
      res.status(500).json({ message: "Failed to create analysis" });
    }
  });

  /**
   * Get all analyses for the authenticated user
   * GET /api/analyses
   */
  app.get("/api/analyses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const analyses = await storage.getUserAnalyses(userId, limit, offset);
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching user analyses:", error);
      res.status(500).json({ message: "Failed to fetch analyses" });
    }
  });

  /**
   * Get a specific analysis by ID
   * GET /api/analyses/:id
   */
  app.get("/api/analyses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      const analysis = await storage.getAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      // Security check: ensure the analysis belongs to the authenticated user
      if (analysis.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis" });
    }
  });

  /**
   * Toggle favorite status of an analysis
   * PUT /api/analyses/:id/favorite
   */
  app.put("/api/analyses/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      const { isFavorited } = req.body;
      
      if (typeof isFavorited !== 'boolean') {
        return res.status(400).json({ message: "isFavorited must be a boolean" });
      }
      
      // Check if analysis exists and belongs to user
      const existingAnalysis = await storage.getAnalysis(id);
      if (!existingAnalysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      if (existingAnalysis.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Update favorite status
      const updatedAnalysis = await storage.updateAnalysisFavorite(id, isFavorited);
      
      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error updating analysis favorite status:", error);
      res.status(500).json({ message: "Failed to update analysis favorite status" });
    }
  });

  /**
   * Analysis service health check
   * GET /api/analyses/health
   */
  app.get("/api/analyses/health", async (req, res) => {
    try {
      const { healthCheck } = await import('./services/analysisService');
      const health = await healthCheck();
      
      const statusCode = health.healthy ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      console.error("Analysis health check failed:", error);
      res.status(503).json({ 
        healthy: false,
        error: "Health check service unavailable"
      });
    }
  });

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Simple fallback function to generate coaching responses
 * Used when the AI integration is not available
 * @param userMessage - The user's message to respond to
 * @returns A randomly selected coaching response
 */
function generateBotResponse(userMessage: string): string {
  // Array of thoughtful coaching responses
  const responses = [
    "Thank you for sharing that. How did that make you feel?",
    "That's really interesting. Could you tell me more about why you think that way?",
    "I hear you. How does this relate to your previous experiences?",
    "That's a thoughtful perspective. Have you considered how this might affect your future decisions?",
    "I appreciate your openness. What do you think is the most important thing you've learned from this?",
    "It sounds like this is meaningful to you. How might you apply this insight going forward?",
    "That's a valuable reflection. Is there anything else about this that stands out to you?",
    "I'm curious about how this connects to your values and what matters most to you.",
    "Thank you for being vulnerable. How might this understanding change how you approach similar situations?",
    "That's a deep insight. How has your thinking evolved on this topic over time?"
  ];
  
  // Select a random response
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}
