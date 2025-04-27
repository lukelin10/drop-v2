import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Drop } from "@shared/schema";

export function useDrops() {
  // Fetch all drops
  const { data: drops = [] } = useQuery<Drop[]>({
    queryKey: ["/api/drops"],
  });

  // Fetch daily question
  const { data: dailyQuestionData } = useQuery<{ question: string }>({
    queryKey: ["/api/daily-question"],
  });

  // Answer daily question - creates a new drop
  const answerMutation = useMutation({
    mutationFn: async (answer: string) => {
      const res = await apiRequest("POST", "/api/drops", {
        question: dailyQuestionData?.question || "What's on your mind today?",
        answer,
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

  const getDrop = (id: number): Drop | undefined => {
    return drops.find(drop => drop.id === id);
  };

  // Get recent previous drops (excluding today's entry)
  const previousDrops = drops.slice(0, 3);

  return {
    drops,
    previousDrops,
    dailyQuestion: dailyQuestionData,
    answerDailyQuestion,
    toggleFavorite,
    getDrop
  };
}
