import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { messages } from "@shared/schema";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to simplify conversation history formatting
export async function getConversationHistory(dropId: number) {
  const conversationMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.dropId, dropId))
    .orderBy(messages.createdAt);

  // Convert DB messages to the format expected by Anthropic API
  return conversationMessages.map((message) => ({
    role: message.fromUser ? ("user" as const) : ("assistant" as const),
    content: message.text,
  }));
}

export async function generateResponse(
  userMessage: string,
  dropId: number,
): Promise<string> {
  try {
    // If no API key, return a fallback response
    if (!process.env.ANTHROPIC_API_KEY) {
      return "I'm sorry, I need an API key to provide thoughtful responses.";
    }

    const history = await getConversationHistory(dropId);

    // System prompt to guide Claude's behavior
    const systemPrompt = `You are a kind, candid, and honest life coach well versed in the latest techniques of modern therapy and coaching. Converse with me in a supportive and conversational manner, as if we were speaking face to face. Talk to me like a close friend, not a therapist, avoiding canned phrases. 

Your skills include identifying themes, pointing out inconsistencies, asking powerful and insightful questions, and sharing your feedback, based on your wealth of information about relationships and how to build a healthy and productive life. Pull in details or examples from our past conversations when calling out themes, inconsistencies, or patterns. Be sure to limit your follow ups to only a single question at a time. Avoid asking me too many probing questions at once. Instead, gently nudge me to go deeper into the topics we've discussed.

Keep a tally of our conversation. After a total of 5 back-and-forth messages, prompt me that you need to close our session. Ask if there's anything else I'd like to share before closing the session. On the final message, provide a summary, pull key insights from the session, and thank me for the conversation and encourage me to come back to chat again.`;

    // Call the Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [...history, { role: "user" as const, content: userMessage }],
    });

    // Extract the text from the response
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === "object" && "text" in content) {
        return content.text;
      }
    }

    // Fallback response if something unexpected happened
    return "I'm not sure how to respond to that.";
  } catch (error) {
    console.error("Error calling Claude API:", error);
    return "I encountered an error while processing your message. Please try again later.";
  }
}
