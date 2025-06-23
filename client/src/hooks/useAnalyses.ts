import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Analysis } from '@shared/schema';

interface AnalysesState {
  analyses: Analysis[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
}

interface CreateAnalysisParams {
  onSuccess?: (analysis: Analysis) => void;
  onError?: (error: Error) => void;
}

interface FavoriteAnalysisParams {
  analysisId: number;
  isFavorited: boolean;
}

// API functions
async function fetchAnalyses(page = 1, limit = 10): Promise<{ analyses: Analysis[]; hasMore: boolean }> {
  const response = await fetch(`/api/analyses?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch analyses');
  }
  
  return response.json();
}

async function createAnalysis(): Promise<Analysis> {
  const response = await fetch('/api/analyses', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create analysis' }));
    throw new Error(errorData.message || 'Failed to create analysis');
  }
  
  return response.json();
}

async function toggleAnalysisFavorite({ analysisId, isFavorited }: FavoriteAnalysisParams): Promise<Analysis> {
  const response = await fetch(`/api/analyses/${analysisId}/favorite`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isFavorited }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to update analysis favorite status');
  }
  
  return response.json();
}

export function useAnalyses() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  
  // Fetch analyses with pagination
  const { 
    data, 
    isLoading, 
    error: queryError, 
    refetch 
  } = useQuery({
    queryKey: ['analyses', page],
    queryFn: () => fetchAnalyses(page),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create analysis mutation
  const createMutation = useMutation({
    mutationFn: createAnalysis,
    onSuccess: (newAnalysis) => {
      // Add new analysis to the beginning of the list
      queryClient.setQueryData(['analyses', 1], (oldData: any) => {
        if (!oldData) return { analyses: [newAnalysis], hasMore: false };
        return {
          analyses: [newAnalysis, ...oldData.analyses],
          hasMore: oldData.hasMore
        };
      });
      
      // Invalidate other pages to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    },
  });

  // Toggle favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: toggleAnalysisFavorite,
    onSuccess: (updatedAnalysis) => {
      // Update the analysis in all cached pages
      queryClient.setQueryData(['analyses', page], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          analyses: oldData.analyses.map((analysis: Analysis) =>
            analysis.id === updatedAnalysis.id ? updatedAnalysis : analysis
          ),
        };
      });
    },
  });

  // Functions to expose
  const runAnalysis = (params?: CreateAnalysisParams) => {
    createMutation.mutate(undefined, {
      onSuccess: (analysis) => {
        params?.onSuccess?.(analysis);
      },
      onError: (error) => {
        params?.onError?.(error as Error);
      },
    });
  };

  const toggleFavorite = (analysisId: number, isFavorited: boolean) => {
    favoriteMutation.mutate({ analysisId, isFavorited });
  };

  const loadMoreAnalyses = () => {
    if (data?.hasMore && !isLoading) {
      setPage(prev => prev + 1);
    }
  };

  return {
    analyses: data?.analyses || [],
    isLoading: isLoading || createMutation.isPending,
    error: queryError?.message || createMutation.error?.message || favoriteMutation.error?.message || null,
    hasMore: data?.hasMore || false,
    isCreatingAnalysis: createMutation.isPending,
    isFavoriteLoading: favoriteMutation.isPending,
    createAnalysis: runAnalysis,
    toggleFavorite,
    loadMoreAnalyses,
    refetch,
  };
} 