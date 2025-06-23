/**
 * Analysis Eligibility Hook
 * 
 * This custom hook manages analysis eligibility checking functionality.
 * It fetches the user's current progress toward being eligible for analysis
 * and provides the data needed for the progress tracking UI.
 * 
 * Features:
 * - Checks if user is eligible for analysis (has 7+ unanalyzed drops)
 * - Returns current progress count and required count
 * - Provides loading states for UI feedback
 */

import { useQuery } from "@tanstack/react-query";

interface AnalysisEligibility {
  isEligible: boolean;
  unanalyzedCount: number;
  requiredCount: number;
}

export function useAnalysisEligibility() {
  /**
   * Query to check if user is eligible for analysis
   * Returns eligibility status and progress information
   */
  const { 
    data: eligibility, 
    isLoading, 
    error,
    refetch 
  } = useQuery<AnalysisEligibility>({
    queryKey: ["/api/analyses/eligibility"],
    // Default values while loading to prevent UI errors
    placeholderData: {
      isEligible: false,
      unanalyzedCount: 0,
      requiredCount: 7
    }
  });

  /**
   * Calculate progress percentage for visual progress bar
   * @returns Percentage of progress toward eligibility (0-100)
   */
  const getProgressPercentage = (): number => {
    if (!eligibility) return 0;
    return Math.min((eligibility.unanalyzedCount / eligibility.requiredCount) * 100, 100);
  };

  /**
   * Get formatted progress text for display
   * @returns String like "4 out of 7" or "Ready!"
   */
  const getProgressText = (): string => {
    if (!eligibility) return "Loading...";
    
    if (eligibility.isEligible) {
      return "Ready for analysis!";
    }
    
    return `${eligibility.unanalyzedCount} out of ${eligibility.requiredCount}`;
  };

  /**
   * Check if user is close to being eligible (within 2 drops)
   * Used for encouraging messaging
   */
  const isCloseToEligible = (): boolean => {
    if (!eligibility) return false;
    const remaining = eligibility.requiredCount - eligibility.unanalyzedCount;
    return remaining <= 2 && remaining > 0;
  };

  return {
    eligibility,
    isLoading,
    error,
    refetch,
    getProgressPercentage,
    getProgressText,
    isCloseToEligible,
    // Convenience accessors
    isEligible: eligibility?.isEligible ?? false,
    unanalyzedCount: eligibility?.unanalyzedCount ?? 0,
    requiredCount: eligibility?.requiredCount ?? 7
  };
} 