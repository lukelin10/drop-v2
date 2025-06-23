/**
 * Analysis Progress Component
 * 
 * This component displays the user's progress toward being eligible for analysis.
 * It shows a visual progress bar, current count, and a "Run Analysis" button when eligible.
 * 
 * Features:
 * - Visual progress bar using the app's design system
 * - Progress counter (e.g., "4 out of 7")
 * - "Run Analysis" button when eligible
 * - Encouraging messaging based on progress
 * - Matches the existing app's visual language and color scheme
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAnalysisEligibility } from "@/hooks/useAnalysisEligibility";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface AnalysisProgressProps {
  className?: string;
  onAnalysisStart?: () => void;
  onAnalysisComplete?: () => void;
}

export function AnalysisProgress({ 
  className, 
  onAnalysisStart, 
  onAnalysisComplete 
}: AnalysisProgressProps) {
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const { setLoading } = useAppContext();
  const { toast } = useToast();
  const {
    isEligible,
    unanalyzedCount,
    requiredCount,
    getProgressPercentage,
    getProgressText,
    isCloseToEligible,
    isLoading,
    refetch
  } = useAnalysisEligibility();

  const handleRunAnalysis = async () => {
    if (!isEligible || isRunningAnalysis) return;

    setIsRunningAnalysis(true);
    setLoading(true);
    onAnalysisStart?.();

    try {
      // Create the analysis
      const response = await apiRequest("POST", "/api/analyses");
      
      if (!response.ok) {
        throw new Error("Failed to create analysis");
      }

      const analysis = await response.json();

      // Show success message
      toast({
        title: "Analysis Complete!",
        description: "Your new analysis is ready to view in your feed.",
      });

      // Refresh eligibility data to show updated progress
      refetch();
      
      onAnalysisComplete?.();
    } catch (error) {
      console.error("Error creating analysis:", error);
      toast({
        title: "Analysis Failed",
        description: "There was an error generating your analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRunningAnalysis(false);
      setLoading(false);
    }
  };

  const getRemainingDrops = (): number => {
    return Math.max(0, requiredCount - unanalyzedCount);
  };

  const getEncouragingMessage = (): string => {
    const remaining = getRemainingDrops();
    
    if (isEligible) {
      return "You're ready for insights!";
    } else if (remaining === 1) {
      return "Almost there! Just 1 more entry needed.";
    } else if (remaining === 2) {
      return "You're so close! 2 more entries to go.";
    } else if (isCloseToEligible()) {
      return `Keep going! ${remaining} more entries for your analysis.`;
    } else {
      return "Drop deeper with an analysis after 7 entries";
    }
  };

  if (isLoading) {
    return (
      <div className={cn("card p-4", className)}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <i className="ri-loader-4-line text-primary animate-spin"></i>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isEligible 
              ? "bg-secondary/10" 
              : "bg-primary/10"
          )}>
            <i className={cn(
              isEligible 
                ? "ri-check-line text-secondary" 
                : "ri-bar-chart-line text-primary"
            )}></i>
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">
              Analysis Progress
            </h4>
            <p className="text-xs text-muted-foreground">
              {getEncouragingMessage()}
            </p>
          </div>
        </div>
        
        {isEligible && (
          <Button 
            onClick={handleRunAnalysis}
            disabled={isRunningAnalysis}
            size="sm"
            className="shrink-0"
          >
            {isRunningAnalysis ? (
              <>
                <i className="ri-loader-4-line mr-1 animate-spin"></i>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <i className="ri-brain-line mr-1"></i>
                <span>Run Analysis</span>
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-foreground">
            {getProgressText()}
          </span>
          {!isEligible && (
            <span className="text-xs text-muted-foreground">
              {getRemainingDrops()} more needed
            </span>
          )}
        </div>
        
        <Progress 
          value={getProgressPercentage()} 
          className="h-2"
        />
      </div>

      {isEligible && (
        <div className="mt-3 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
          <div className="flex items-center space-x-2">
            <i className="ri-lightbulb-line text-secondary text-sm"></i>
            <p className="text-xs text-secondary font-medium">
              Your analysis will review {unanalyzedCount} recent entries for patterns and insights.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 