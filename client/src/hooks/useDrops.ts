import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Drop } from "@shared/schema";

// Define the enhanced drop type that includes question text
export interface DropWithQuestion extends Drop {
  questionText: string;
}

export function useDrops() {
  // Fetch all drops with question text
  const { data: drops = [] } = useQuery<DropWithQuestion[]>({
    queryKey: ["/api/drops"],
  });

  // Fetch daily question
  const { data: dailyQuestionData } = useQuery<{ question: string }>({
    queryKey: ["/api/daily-question"],
  });

  // Answer daily question - creates a new drop
  const answerMutation = useMutation({
    mutationFn: async (answer: string) => {
      // Fetch all questions to find the matching one
      const questionsRes = await apiRequest("GET", "/api/questions");
      const questions = await questionsRes.json();
      
      // Find the question ID that matches our daily question text
      const matchingQuestion = questions.find(
        (q: any) => q.text === dailyQuestionData?.question
      );
      
      const questionId = matchingQuestion?.id || 1; // Default to first question if not found
      
      const res = await apiRequest("POST", "/api/drops", {
        questionId: questionId,
        text: answer,
        favorite: false
      });
      return await res.json() as Drop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
    }
  });

  // Toggle favorite status
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      const drop = drops.find(d => d.id === id);
      if (!drop) throw new Error("Drop not found");
      
      const res = await apiRequest("PATCH", `/api/drops/${id}`, {
        favorite: !drop.favorite
      });
      return await res.json() as Drop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drops"] });
    }
  });

  const answerDailyQuestion = async (answer: string): Promise<Drop> => {
    return await answerMutation.mutateAsync(answer);
  };

  const toggleFavorite = async (id: number): Promise<void> => {
    await toggleFavoriteMutation.mutateAsync(id);
  };

  const getDrop = (id: number): DropWithQuestion | undefined => {
    return drops.find(drop => drop.id === id);
  };

  // Get recent previous drops (excluding today's entry)
  const previousDrops = drops.slice(0, 3);

  // Get the latest drop ID (most recently created drop)
  const getLatestDropId = (): number | undefined => {
    if (drops.length === 0) return undefined;
    // Sort by created date (descending) and get the first one
    return [...drops].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0].id;
  };

  return {
    drops,
    previousDrops,
    dailyQuestion: dailyQuestionData?.question || "What's on your mind today?",
    answerDailyQuestion,
    toggleFavorite,
    getDrop,
    getLatestDropId
  };
}
