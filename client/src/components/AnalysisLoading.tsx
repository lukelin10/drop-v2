/**
 * Analysis Loading Component
 * 
 * A specialized loading component for analysis generation that provides:
 * - Modal overlay with backdrop blur
 * - Analysis-specific messaging and progress indicators
 * - Consistent styling with existing app patterns
 * - Cancellation support for long-running analyses
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AnalysisLoadingProps {
  isVisible: boolean;
  onCancel?: () => void;
  className?: string;
}

/**
 * Messages shown during analysis generation to keep users engaged
 */
const ANALYSIS_MESSAGES = [
  "Analyzing your journal entries...",
  "Identifying patterns and insights...",
  "Generating personalized analysis...",
  "Almost there! Creating your summary...",
];

export function AnalysisLoading({ 
  isVisible, 
  onCancel, 
  className 
}: AnalysisLoadingProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cycle through messages and update progress
  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0);
      setProgress(0);
      return;
    }

    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ANALYSIS_MESSAGES.length);
    }, 3000); // Change message every 3 seconds

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // Don't complete progress until analysis is done
        return Math.min(prev + Math.random() * 10 + 5, 90);
      });
    }, 1000); // Update progress every second

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300",
      className
    )}>
      <div className="card w-full max-w-sm mx-4 p-6 shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <i className="ri-brain-line text-2xl text-primary animate-pulse"></i>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Creating Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            This may take a moment while we process your entries
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-foreground">
              Progress
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground animate-pulse">
            {ANALYSIS_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Loading Spinner */}
        <div className="flex justify-center mb-6">
          <div className="animate-spin">
            <i className="ri-loader-4-line text-2xl text-primary"></i>
          </div>
        </div>

        {/* Cancel Button (if cancellation is supported) */}
        {onCancel && (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 