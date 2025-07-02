/**
 * Analysis LLM Service
 * 
 * This service provides AI-powered analysis generation using Anthropic's Claude.
 * It specializes in psychology, cognitive behavioral therapy, and life coaching insights
 * by analyzing collections of journal entries (drops) and their conversations.
 * 
 * Features:
 * - Structured analysis prompts for consistent output format
 * - Retry logic with exponential backoff
 * - Timeout handling and rate limiting
 * - Comprehensive logging for monitoring
 * - Response parsing for structured output
 */

import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { eq, and, gte } from "drizzle-orm";
import { drops, messages, questionTable, users } from "@shared/schema";
import type { DropWithQuestion, Message } from "@shared/schema";

// Extended type for drops with conversation messages
interface DropWithConversation extends DropWithQuestion {
  conversation: Message[];
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configuration constants
const ANALYSIS_CONFIG = {
  model: "claude-3-7-sonnet-20250219",
  maxTokens: 3000,
  temperature: 0.3, // Lower temperature for more consistent analysis
  maxRetries: 2,
  baseTimeout: 30000, // 30 seconds
  retryMultiplier: 2,
  rateLimitDelay: 1000, // 1 second between requests
};

// Rate limiting state
let lastRequestTime = 0;

/**
 * Structured response interface for analysis output
 */
export interface AnalysisResponse {
  summary: string;      // One-line summary (15 words or less)
  content: string;      // Main analysis content (3 paragraphs max)
  bulletPoints: string; // 3-5 key insights as bullet points
}

/**
 * Analysis request metadata for logging and monitoring
 */
interface AnalysisRequest {
  userId: string;
  dropCount: number;
  totalMessages: number;
  startTime: Date;
}

/**
 * Compile chat histories from unanalyzed drops
 * @param userId - The user whose drops to analyze
 * @returns Array of drop data with full conversation histories
 */
export async function getUnanalyzedDropsWithConversations(userId: string): Promise<DropWithConversation[]> {
  try {
    // Get user's last analysis date to determine which drops are unanalyzed
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Use epoch if never analyzed, otherwise use last analysis date
    const lastAnalysisDate = user.lastAnalysisDate || new Date(0);

    // Get unanalyzed drops with their questions
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
      .where(and(
        eq(drops.userId, userId),
        gte(drops.createdAt, lastAnalysisDate)
      ))
      .orderBy(drops.createdAt); // Chronological order

    // Fetch conversation messages for each drop
    const dropsWithConversations: DropWithConversation[] = [];

    for (const drop of unanalyzedDrops) {
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.dropId, drop.id))
        .orderBy(messages.createdAt);

      // Add conversation to drop data
      const dropWithConversation: DropWithConversation = {
        ...drop,
        questionText: drop.questionText || 'Unknown question',
        conversation: conversationMessages
      };

      dropsWithConversations.push(dropWithConversation);
    }

    console.log(`Retrieved ${dropsWithConversations.length} unanalyzed drops for user ${userId}`);
    return dropsWithConversations;

  } catch (error) {
    console.error('Error fetching unanalyzed drops with conversations:', error);
    throw new Error('Failed to compile drop data for analysis');
  }
}

/**
 * Create the analysis prompt with journal entries and conversations
 * @param drops - Array of drops with their conversation histories
 * @returns Structured prompt for the LLM
 */
function createAnalysisPrompt(drops: DropWithConversation[]): string {
  // Compile all journal entries and conversations into a readable format
  const compiledEntries = drops.map((drop, index) => {
    const entryNumber = index + 1;
    const date = drop.createdAt.toLocaleDateString();

    let entryText = `ENTRY ${entryNumber} (${date}):\n`;
    entryText += `Question: "${drop.questionText}"\n`;
    entryText += `Initial Response: "${drop.text}"\n`;

    // Add conversation if it exists
    if (drop.conversation && drop.conversation.length > 0) {
      entryText += "Conversation:\n";
      drop.conversation.forEach((msg) => {
        const speaker = msg.fromUser ? "User" : "Coach";
        entryText += `${speaker}: "${msg.text}"\n`;
      });
    }

    return entryText;
  }).join('\n---\n\n');

  const systemPrompt = `You are an expert life coach and therapist specializing in cognitive behavioral therapy (CBT), positive psychology, and personal development. You will analyze a series of journal entries and conversations to provide deep, actionable insights.

ANALYSIS TASK:
Analyze the following ${drops.length} journal entries and their conversations to identify patterns, growth opportunities, and insights the person may not recognize about themselves.

REQUIRED OUTPUT FORMAT:
Your response must be structured exactly as follows:

SUMMARY: [One-line insight in 15 words or less - the most important takeaway]

ANALYSIS:
[Paragraph 1: Identify 2-3 key emotional or behavioral patterns you observe across entries]

[Paragraph 2: Highlight growth areas, blind spots, or recurring themes using CBT principles]

[Paragraph 3: Provide specific, actionable recommendations for continued growth]

INSIGHTS:
• [Key insight 1 - specific pattern or recommendation]
• [Key insight 2 - growth opportunity or strength]
• [Key insight 3 - actionable next step or mindset shift]
• [Key insight 4 - behavioral or emotional pattern] (optional)
• [Key insight 5 - deeper psychological insight] (optional)

GUIDELINES:
- Be direct, insightful, and encouraging
- Focus on patterns across multiple entries, not individual responses
- Use CBT frameworks to identify cognitive patterns and suggest reframes
- Highlight both strengths and growth opportunities
- Keep the analysis practical and actionable
- Maintain a supportive, non-judgmental tone
- Limit the analysis to exactly 3 paragraphs
- Provide 3-5 bullet points (3 minimum, 5 maximum)

JOURNAL ENTRIES TO ANALYZE:

${compiledEntries}`;

  return systemPrompt;
}

/**
 * Parse the LLM response into structured components
 * @param rawResponse - Raw text response from the LLM
 * @returns Parsed analysis components
 */
function parseAnalysisResponse(rawResponse: string): AnalysisResponse {
  try {
    // Extract summary
    const summaryMatch = rawResponse.match(/SUMMARY:\s*(.+?)(?:\n|$)/i);
    const summary = summaryMatch?.[1]?.trim() || "Personal growth insights identified";

    // Extract analysis content (the three paragraphs)
    // First, try to match content between ANALYSIS: and any insights section marker
    const analysisMatch = rawResponse.match(/ANALYSIS:\s*([\s\S]*?)(?:\n(?:##\s*)?(?:KEY\s+)?INSIGHTS|$)/i);
    let content = analysisMatch?.[1]?.trim() || "Analysis content unavailable";

    // Remove any insights sections that might have been included in the content
    // Split content by insights markers and take only the part before any insights
    content = content
      .split(/^##\s*(?:KEY\s+)?INSIGHTS.*$/im)[0] // Split at ##INSIGHTS or ##KEY INSIGHTS
      .split(/^#\s*(?:KEY\s+)?INSIGHTS.*$/im)[0]  // Split at #INSIGHTS or #KEY INSIGHTS  
      .split(/^(?:KEY\s+)?INSIGHTS\s*:.*$/im)[0]  // Split at INSIGHTS: or KEY INSIGHTS:
      .split(/^\*\*(?:KEY\s+)?INSIGHTS\*\*.*$/im)[0] // Split at **INSIGHTS** or **KEY INSIGHTS**
      .replace(/\n\n\n+/g, '\n\n') // Clean up excessive line breaks
      .trim();

    // Extract bullet points
    const insightsMatch = rawResponse.match(/INSIGHTS:\s*([\s\S]*?)$/i);
    let bulletPoints = "";

    if (insightsMatch) {
      // Clean up and format bullet points
      const insights = insightsMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => line.trim())
        .slice(0, 5) // Max 5 bullet points
        .join('\n');

      bulletPoints = insights || "• Key insights will be identified in future analyses";
    } else {
      bulletPoints = "• Key insights will be identified in future analyses";
    }

    return {
      summary: summary.substring(0, 100), // Ensure reasonable length
      content,
      bulletPoints
    };

  } catch (error) {
    console.error('Error parsing analysis response:', error);

    // Return fallback structured response
    return {
      summary: "Analysis completed with valuable insights",
      content: "Your journal entries show thoughtful self-reflection and personal growth. The patterns in your responses indicate a developing awareness of your thoughts and emotions, which is a valuable foundation for continued growth.\n\nAcross your entries, there are opportunities to explore deeper connections between your experiences and emotional responses. This awareness can help you build more intentional habits and responses to life's challenges.\n\nContinuing to engage in regular reflection, as you've been doing, will support your ongoing personal development. Consider focusing on identifying specific triggers and developing targeted strategies for growth areas you've identified.",
      bulletPoints: "• Strong foundation in self-reflection and awareness\n• Opportunities for deeper emotional pattern recognition\n• Continued journaling supports personal growth\n• Consider identifying specific triggers and responses\n• Build on existing strengths in self-awareness"
    };
  }
}

/**
 * Implement exponential backoff retry logic
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @returns Promise with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = ANALYSIS_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = 1000 * Math.pow(ANALYSIS_CONFIG.retryMultiplier, attempt);
      console.log(`Analysis attempt ${attempt + 1} failed, retrying in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Implement rate limiting
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < ANALYSIS_CONFIG.rateLimitDelay) {
    const delay = ANALYSIS_CONFIG.rateLimitDelay - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Generate analysis using the LLM with retry logic and error handling
 * @param userId - The user whose drops to analyze
 * @returns Parsed analysis response
 */
export async function generateAnalysis(userId: string): Promise<AnalysisResponse> {
  const requestMetadata: AnalysisRequest = {
    userId,
    dropCount: 0,
    totalMessages: 0,
    startTime: new Date()
  };

  try {
    console.log(`Starting analysis generation for user: ${userId}`);

    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    // Enforce rate limiting
    await enforceRateLimit();

    // Get unanalyzed drops with conversations
    const drops = await getUnanalyzedDropsWithConversations(userId);

    if (drops.length < 7) {
      throw new Error(`Insufficient drops for analysis: ${drops.length} (minimum 7 required)`);
    }

    requestMetadata.dropCount = drops.length;
    requestMetadata.totalMessages = drops.reduce((total, drop) => {
      return total + drop.conversation.length;
    }, 0);

    console.log(`Analyzing ${drops.length} drops with ${requestMetadata.totalMessages} total messages`);

    // Create analysis prompt
    const prompt = createAnalysisPrompt(drops);

    // Generate analysis with retry logic
    const response = await withRetry(async () => {
      const apiResponse = await Promise.race([
        anthropic.messages.create({
          model: ANALYSIS_CONFIG.model,
          max_tokens: ANALYSIS_CONFIG.maxTokens,
          temperature: ANALYSIS_CONFIG.temperature,
          messages: [{ role: "user", content: prompt }],
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analysis request timeout')), ANALYSIS_CONFIG.baseTimeout)
        )
      ]) as any;

      return apiResponse;
    });

    // Extract text content from response
    let rawAnalysis = "";
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === "object" && "text" in content) {
        rawAnalysis = content.text;
      }
    }

    if (!rawAnalysis) {
      throw new Error('Empty response from LLM');
    }

    // Parse structured response
    const parsedAnalysis = parseAnalysisResponse(rawAnalysis);

    // Log successful analysis
    const duration = Date.now() - requestMetadata.startTime.getTime();
    console.log(`Analysis completed successfully for user ${userId} in ${duration}ms`);
    console.log(`Analysis summary: ${parsedAnalysis.summary}`);

    return parsedAnalysis;

  } catch (error) {
    const duration = Date.now() - requestMetadata.startTime.getTime();
    console.error(`Analysis failed for user ${userId} after ${duration}ms:`, error);

    // Log detailed error information
    console.error('Analysis request metadata:', {
      userId: requestMetadata.userId,
      dropCount: requestMetadata.dropCount,
      totalMessages: requestMetadata.totalMessages,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
} 