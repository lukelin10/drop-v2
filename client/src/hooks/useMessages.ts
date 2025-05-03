import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";

export function useMessages(dropId: number) {
  const [isTyping, setIsTyping] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const MESSAGE_LIMIT = 5; // Maximum number of back and forth messages

  // Fetch messages for a specific drop
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/drops/${dropId}/messages`],
    enabled: !!dropId
  });
  
  // Calculate message count and check if limit reached
  useEffect(() => {
    if (messages.length > 0) {
      // Group messages by user/assistant to count "back and forth" exchanges
      let backAndForthCount = 0;
      let lastRole = '';
      
      messages.forEach((message: Message) => {
        const currentRole = message.fromUser ? 'user' : 'assistant';
        if (currentRole !== lastRole) {
          backAndForthCount++;
          lastRole = currentRole;
        }
      });
      
      // Divide by 2 to get complete exchanges (a user message + an assistant response)
      const exchangeCount = Math.floor(backAndForthCount / 2);
      setMessageCount(exchangeCount);
      setIsLimitReached(exchangeCount >= MESSAGE_LIMIT);
    }
  }, [messages, MESSAGE_LIMIT]);

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/messages", {
        dropId,
        text,
        fromUser: true
      });
      setIsTyping(true);
      return await res.json() as Message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
      
      // Set a timeout to simulate the bot thinking and typing
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
        setIsTyping(false);
      }, 3000);
    }
  });

  const sendMessage = async (text: string): Promise<void> => {
    // Don't send message if limit is reached
    if (isLimitReached) {
      console.log('Message limit reached, cannot send more messages');
      return;
    }
    await sendMessageMutation.mutateAsync(text);
  };

  // Poll for new messages (in a real app, this would be replaced with WebSockets)
  useEffect(() => {
    const interval = setInterval(() => {
      if (dropId && !isTyping) {
        queryClient.invalidateQueries({ queryKey: [`/api/drops/${dropId}/messages`] });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dropId, isTyping]);

  return {
    messages,
    isTyping,
    sendMessage,
    messageCount,
    isLimitReached,
    MESSAGE_LIMIT
  };
}
