import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDropSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { generateResponse } from "./services/anthropic";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.log("Missing ANTHROPIC_API_KEY environment variable.");
  console.log("Please provide an Anthropic API key to use the Claude AI integration.");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up Replit Auth
  await setupAuth(app);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // API routes
  app.get("/api/daily-question", isAuthenticated, async (req, res) => {
    try {
      const question = await storage.getDailyQuestion();
      res.json({ question });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily question" });
    }
  });
  
  app.get("/api/questions", isAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.get("/api/drops", isAuthenticated, async (req, res) => {
    try {
      const drops = await storage.getDrops();
      res.json(drops);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drops" });
    }
  });
  
  // Get the authenticated user's drops
  app.get("/api/user/drops", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drops = await storage.getUserDrops(userId);
      res.json(drops);
    } catch (error) {
      console.error("Error fetching user drops:", error);
      res.status(500).json({ message: "Failed to fetch user drops" });
    }
  });

  app.get("/api/drops/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const drop = await storage.getDrop(id);
      
      if (!drop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      res.json(drop);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drop" });
    }
  });

  app.post("/api/drops", isAuthenticated, async (req: any, res) => {
    try {
      const parseResult = insertDropSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid drop data", errors: parseResult.error.format() });
      }
      
      // Add user ID to the drop data
      const dropData = {
        ...parseResult.data,
        userId: req.user.claims.sub
      };
      
      const drop = await storage.createDrop(dropData);
      res.status(201).json(drop);
    } catch (error) {
      res.status(500).json({ message: "Failed to create drop" });
    }
  });

  app.patch("/api/drops/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updateSchema = z.object({
        favorite: z.boolean().optional()
      });
      
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid update data", errors: parseResult.error.format() });
      }
      
      const updatedDrop = await storage.updateDrop(id, parseResult.data);
      
      if (!updatedDrop) {
        return res.status(404).json({ message: "Drop not found" });
      }
      
      res.json(updatedDrop);
    } catch (error) {
      res.status(500).json({ message: "Failed to update drop" });
    }
  });

  app.get("/api/drops/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const dropId = parseInt(req.params.id, 10);
      const messages = await storage.getMessages(dropId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      const parseResult = insertMessageSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid message data", errors: parseResult.error.format() });
      }
      
      const message = await storage.createMessage(parseResult.data);
      
      // Create an AI response using Claude
      setTimeout(async () => {
        try {
          if (!process.env.ANTHROPIC_API_KEY) {
            // Fallback to a simple response if no API key is available
            const botResponse = "I'm sorry, I can't generate a thoughtful response right now. Please try again later.";
            await storage.createMessage({
              dropId: parseResult.data.dropId,
              text: botResponse,
              fromUser: false
            });
          } else {
            // Use Claude to generate a response
            const botResponse = await generateResponse(
              parseResult.data.text,
              parseResult.data.dropId
            );
            
            await storage.createMessage({
              dropId: parseResult.data.dropId,
              text: botResponse,
              fromUser: false
            });
          }
        } catch (error) {
          console.error("Error generating bot response:", error);
          // Create a fallback response in case of error
          await storage.createMessage({
            dropId: parseResult.data.dropId,
            text: "I apologize, but I'm having trouble processing your message right now. Could you try again?",
            fromUser: false
          });
        }
      }, 1500);
      
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function generateBotResponse(userMessage: string): string {
  // This is a simple function to generate responses
  // In a real app, this would call an AI service
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
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}
