/**
 * Drops Hook
 * 
 * This custom hook centralizes all functionality related to journal entries (drops).
 * It provides data fetching, creation, and manipulation of drops throughout the application.
 * 
 * Features:
 * - Fetches all user's journal entries
 * - Fetches the daily reflection question
 * - Creates new journal entries from user responses
 * - Provides utility functions for accessing and filtering entries
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Drop, DropWithQuestion } from "@shared/schema";

export function useDrops() {
  /**
   * Main query to fetch all the user's journal entries (drops)
   * Returns an empty array while loading to prevent errors
   */
  const { data: drops = [] } = useQuery<DropWithQuestion[]>({
    queryKey: ["/api/drops"],
  });

  /**
   * Query to fetch the daily reflection question
   * This question is randomly selected by the backend
   */
  const { data: dailyQuestionData } = useQuery<{ question: string }>({
    queryKey: ["/api/daily-question"],
  });

  /**
   * Mutation to create a new journal entry (drop)
   * 
   * This is triggered when the user submits their response to the daily question.
   * It first finds the corresponding question ID, then creates the drop with the user's answer.
   */
  const answerMutation = useMutation({
    mutationFn: async (answer: string) => {
      // First fetch all questions to find the matching question ID
      const questionsRes = await apiRequest("GET", "/api/questions");
      const questions = await questionsRes.json();
      
      // Find the question ID that matches our daily question text
      const matchingQuestion = questions.find(
        (q: any) => q.text === dailyQuestionData?.question
      );
      
      // Use the matching question ID or default to 1 if not found
      const questionId = matchingQuestion?.id || 1;
      
      // Create the new drop with the user's answer
      const res = await apiRequest("POST", "/api/drops", {
        questionId: questionId,
        text: answer
      });
      return await res.json() as Drop;
    },
    // After successfully creating a drop, update the cache
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
    }
  });

  /**
   * Public method to create a new journal entry with the user's answer
   * @param answer - The user's response to the daily question
   * @returns The newly created drop
   */
  const answerDailyQuestion = async (answer: string): Promise<Drop> => {
    return await answerMutation.mutateAsync(answer);
  };

  /**
   * Utility function to get a specific drop by ID
   * @param id - The ID of the drop to retrieve
   * @returns The drop object or undefined if not found
   */
  const getDrop = (id: number): DropWithQuestion | undefined => {
    return drops.find(drop => drop.id === id);
  };

  /**
   * Get a few recent journal entries
   * Useful for displaying in the dashboard or history views
   */
  const previousDrops = drops.slice(0, 3);

  /**
   * Get the ID of the most recently created journal entry
   * Used for the "Latest Chat" feature that redirects to the most recent entry
   * @returns The ID of the latest drop or undefined if none exist
   */
  const getLatestDropId = (): number | undefined => {
    if (drops.length === 0) return undefined;
    // Sort by created date (descending) and get the first one
    return [...drops].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0].id;
  };

  // Return all the data and functions that components will use
  return {
    drops,                 // All journal entries
    previousDrops,         // Recent entries for display
    dailyQuestion: dailyQuestionData?.question || "What's on your mind today?", // Today's question with fallback
    answerDailyQuestion,   // Function to submit a new entry
    getDrop,               // Function to get a specific entry
    getLatestDropId        // Function to get the latest entry ID
  };
}
