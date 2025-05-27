/**
 * Messages Hook
 * 
 * This custom hook manages the conversation between users and the AI coach.
 * It handles fetching messages, sending new messages, tracking conversation state,
 * and enforcing conversation limits.
 * 
 * Features:
 * - Fetches all messages for a specific journal entry (drop)
 * - Sends new user messages and handles AI responses
 * - Tracks typing indicators and conversation limits
 * - Automatically polls for new messages
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";

/**
 * Hook for managing conversation messages for a specific journal entry
 * @param dropId - The ID of the journal entry (drop) to fetch messages for
 */
export function useMessages(dropId: number) {
  // Track if the AI is "typing" (generating a response)
  const [isTyping, setIsTyping] = useState(false);
  // Track the number of back-and-forth message exchanges
  const [messageCount, setMessageCount] = useState(0);
  // Track if the conversation limit has been reached
  const [isLimitReached, setIsLimitReached] = useState(false);
  // Maximum number of back-and-forth exchanges allowed in a conversation
  const MESSAGE_LIMIT = 5;

  /**
   * Query to fetch all messages for the specified journal entry
   * Returns an empty array while loading to prevent errors
   * Only enabled when a valid dropId is provided
   */
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/drops/${dropId}/messages`],
    enabled: !!dropId // Only fetch when we have a valid drop ID
  });
  
  /**
   * Effect to calculate conversation metrics
   * - Counts the number of back-and-forth exchanges
   * - Determines if the conversation limit has been reached
   */
  useEffect(() => {
    if (messages.length > 0) {
      // Count the number of role switches (user → AI or AI → user)
      let backAndForthCount = 0;
      let lastRole = '';
      
      messages.forEach((message: Message) => {
        // Determine if the message is from the user or AI
        const currentRole = message.fromUser ? 'user' : 'assistant';
        // Count each time the speaker changes
        if (currentRole !== lastRole) {
          backAndForthCount++;
          lastRole = currentRole;
        }
      });
      
      // Calculate complete exchanges (user message + AI response)
      const exchangeCount = Math.floor(backAndForthCount / 2);
      setMessageCount(exchangeCount);
      // Set flag if conversation limit is reached
      setIsLimitReached(exchangeCount >= MESSAGE_LIMIT);
    }
  }, [messages, MESSAGE_LIMIT]);

  /**
   * Mutation to send a new user message
   * This triggers the AI to generate a response on the backend
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      // Send the user's message to the API
      const res = await apiRequest("POST", "/api/messages", {
        dropId,
        text,
        fromUser: true
      });
      // Set typing indicator while waiting for AI response
      setIsTyping(true);
      return await res.json() as Message;
    },
    onSuccess: () => {
      // Immediately refresh messages to show the user's message
      queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
      
      // Set a timeout to simulate the AI thinking and typing
      // The actual AI response is generated asynchronously on the server
      setTimeout(() => {
        // Refresh again to get the AI's response
        queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
        // Hide typing indicator
        setIsTyping(false);
      }, 3000);
    }
  });

  /**
   * Public method to send a new user message
   * Enforces conversation limits
   * @param text - The message text to send
   */
  const sendMessage = async (text: string): Promise<void> => {
    // Don't send message if conversation limit is reached
    if (isLimitReached) {
      console.log('Message limit reached, cannot send more messages');
      return;
    }
    await sendMessageMutation.mutateAsync(text);
  };

  /**
   * Effect to periodically poll for new messages
   * In a production app, this would be replaced with WebSockets for real-time updates
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll when we have a valid drop ID and the AI is not typing
      if (dropId && !isTyping) {
        queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
      }
    }, 5000); // Poll every 5 seconds

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [dropId, isTyping]);

  // Return all the data and functions that components will use
  return {
    messages,             // All messages in the conversation
    isTyping,             // Whether the AI is "typing" a response
    sendMessage,          // Function to send a new message
    messageCount,         // Number of complete exchanges
    isLimitReached,       // Whether the conversation limit is reached
    MESSAGE_LIMIT         // The maximum number of exchanges allowed
  };
}
