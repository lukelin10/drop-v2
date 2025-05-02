import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { messages } from '@shared/schema';

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
  return conversationMessages.map(message => ({
    role: message.fromUser ? ('user' as const) : ('assistant' as const),
    content: message.text
  }));
}

export async function generateResponse(userMessage: string, dropId: number): Promise<string> {
  try {
    // If no API key, return a fallback response
    if (!process.env.ANTHROPIC_API_KEY) {
      return "I'm sorry, I need an API key to provide thoughtful responses.";
    }
    
    const history = await getConversationHistory(dropId);
    
    // Call the Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1000,
      messages: [
        ...history,
        { role: 'user' as const, content: userMessage }
      ]
    });
    
    // Extract the text from the response
    if (response.content && response.content.length > 0) {
      const content = response.content[0];
      if (typeof content === 'object' && 'text' in content) {
        return content.text;
      }
    }
    
    // Fallback response if something unexpected happened
    return "I'm not sure how to respond to that.";
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return "I encountered an error while processing your message. Please try again later.";
  }
}