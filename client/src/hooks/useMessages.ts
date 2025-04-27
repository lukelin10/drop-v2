import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";

export function useMessages(dropId: number) {
  const [isTyping, setIsTyping] = useState(false);

  // Fetch messages for a specific drop
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/drops/${dropId}/messages`],
    enabled: !!dropId,
  });

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
    sendMessage
  };
}
