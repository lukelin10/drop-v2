import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNetworkAwareRequest } from './useNetworkStatus';
import { useToast } from './use-toast';
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

// Enhanced error messages
const ERROR_MESSAGES = {
  FETCH_FAILED: 'Unable to load your analyses. Please try again.',
  CREATE_FAILED: 'Failed to create analysis. Please try again.',
  FAVORITE_FAILED: 'Unable to update favorite status. Please try again.',
  NETWORK_ERROR: 'No internet connection. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request took too long. Please try again.',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment before trying again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.'
};

// API functions with enhanced error handling
async function fetchAnalyses(page = 1, limit = 10): Promise<{ analyses: Analysis[]; hasMore: boolean }> {
  const response = await fetch(`/api/analyses?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    // Enhanced error handling based on status codes
    if (response.status === 401) {
      throw new Error('Please log in again to view your analyses.');
    } else if (response.status === 403) {
      throw new Error('You don\'t have permission to view these analyses.');
    } else if (response.status === 404) {
      throw new Error('Analyses not found. Please try refreshing the page.');
    } else if (response.status === 429) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT_ERROR);
    } else if (response.status >= 500) {
      throw new Error(ERROR_MESSAGES.SERVER_ERROR);
    } else {
      throw new Error(ERROR_MESSAGES.FETCH_FAILED);
    }
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Unable to process server response. Please try again.');
  }
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
    let errorMessage = ERROR_MESSAGES.CREATE_FAILED;
    
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (parseError) {
      // Use default error message if can't parse response
    }

    // Enhanced error handling based on status codes
    if (response.status === 400) {
      // Bad request - likely validation error
      throw new Error(errorMessage);
    } else if (response.status === 401) {
      throw new Error('Please log in again to create an analysis.');
    } else if (response.status === 403) {
      throw new Error('You don\'t have permission to create analyses.');
    } else if (response.status === 409) {
      throw new Error('An analysis is already being processed. Please wait for it to complete.');
    } else if (response.status === 429) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT_ERROR);
    } else if (response.status >= 500) {
      throw new Error(ERROR_MESSAGES.SERVER_ERROR);
    } else {
      throw new Error(errorMessage);
    }
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Analysis created but unable to process response. Please refresh the page.');
  }
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
    if (response.status === 401) {
      throw new Error('Please log in again to update favorites.');
    } else if (response.status === 403) {
      throw new Error('You don\'t have permission to modify this analysis.');
    } else if (response.status === 404) {
      throw new Error('Analysis not found. It may have been deleted.');
    } else if (response.status === 429) {
      throw new Error(ERROR_MESSAGES.RATE_LIMIT_ERROR);
    } else if (response.status >= 500) {
      throw new Error(ERROR_MESSAGES.SERVER_ERROR);
    } else {
      throw new Error(ERROR_MESSAGES.FAVORITE_FAILED);
    }
  }
  
  try {
    return await response.json();
  } catch (error) {
    throw new Error('Favorite updated but unable to process response. Please refresh the page.');
  }
}

export function useAnalyses() {
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const queryClient = useQueryClient();
  const { makeRequest, isOnline, isSlowConnection } = useNetworkAwareRequest();
  const { toast } = useToast();

  // Show network status to user
  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Some features may not work properly while you're offline.",
        variant: "destructive",
      });
    } else if (isSlowConnection) {
      toast({
        title: "Slow Connection",
        description: "Your connection is slow. Some actions may take longer.",
        variant: "default",
      });
    }
  }, [isOnline, isSlowConnection, toast]);
  
  // Fetch analyses with network awareness
  const { 
    data, 
    isLoading, 
    error: queryError, 
    refetch 
  } = useQuery({
    queryKey: ['analyses', page],
    queryFn: () => makeRequest(
      () => fetchAnalyses(page),
      {
        retries: 2,
        retryDelay: 1000,
        timeoutMs: 30000,
        onNetworkError: (error) => {
          toast({
            title: "Connection Issue",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('log in again')) {
        return false;
      }
      // Don't retry on permission errors
      if (error.message.includes('permission')) {
        return false;
      }
      // Retry network errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Update accumulated analyses when new data arrives
  useEffect(() => {
    if (data) {
      if (page === 1) {
        // First page - replace all analyses
        setAllAnalyses(data.analyses);
      } else {
        // Subsequent pages - append to existing analyses
        setAllAnalyses(prev => [...prev, ...data.analyses]);
      }
      setHasMore(data.hasMore);
    }
  }, [data, page]);

  // Create analysis mutation with network awareness
  const createMutation = useMutation({
    mutationFn: () => makeRequest(
      createAnalysis,
      {
        retries: 1, // Only retry once for creation
        retryDelay: 2000,
        timeoutMs: 60000, // Longer timeout for analysis creation
        onNetworkError: (error) => {
          toast({
            title: "Connection Issue",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    ),
    onSuccess: (newAnalysis) => {
      // Add new analysis to the beginning of the accumulated list
      setAllAnalyses(prev => [newAnalysis, ...prev]);
      
      // Invalidate all cached pages to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      
      // Reset to page 1 to show the new analysis
      setPage(1);
      
      toast({
        title: "Analysis Complete",
        description: "Your new analysis is ready to explore.",
      });
    },
    onError: (error: Error) => {
      console.error('Analysis creation failed:', error);
      
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Toggle favorite mutation with network awareness
  const favoriteMutation = useMutation({
    mutationFn: (params: FavoriteAnalysisParams) => makeRequest(
      () => toggleAnalysisFavorite(params),
      {
        retries: 2,
        retryDelay: 1000,
        timeoutMs: 10000,
        onNetworkError: (error) => {
          toast({
            title: "Connection Issue",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    ),
    onSuccess: (updatedAnalysis) => {
      // Update the analysis in the accumulated list
      setAllAnalyses(prev => prev.map(analysis => 
        analysis.id === updatedAnalysis.id ? updatedAnalysis : analysis
      ));
    },
    onError: (error: Error) => {
      console.error('Favorite toggle failed:', error);
      
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Functions to expose
  const runAnalysis = (params?: CreateAnalysisParams) => {
    // Check network status before creating analysis
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      params?.onError?.(new Error(ERROR_MESSAGES.NETWORK_ERROR));
      return;
    }

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
    // Check network status before updating favorite
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
      return;
    }

    favoriteMutation.mutate({ analysisId, isFavorited });
  };

  const loadMoreAnalyses = () => {
    if (hasMore && !isLoading && isOnline) {
      setPage(prev => prev + 1);
    } else if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection to load more analyses.",
        variant: "destructive",
      });
    }
  };

  // Enhanced retry function
  const retryWithNetworkCheck = async () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your connection before retrying.",
        variant: "destructive",
      });
      return;
    }

    try {
      await refetch();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  return {
    analyses: allAnalyses,
    isLoading: isLoading || createMutation.isPending,
    error: queryError?.message || createMutation.error?.message || favoriteMutation.error?.message || null,
    hasMore: hasMore,
    isCreatingAnalysis: createMutation.isPending,
    isFavoriteLoading: favoriteMutation.isPending,
    createAnalysis: runAnalysis,
    toggleFavorite,
    loadMoreAnalyses,
    refetch: retryWithNetworkCheck,
    // Network status
    isOnline,
    isSlowConnection,
    canRetry: isOnline,
  };
} 