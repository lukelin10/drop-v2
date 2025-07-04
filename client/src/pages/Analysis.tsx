import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useAnalyses } from "@/hooks/useAnalyses";
import { useAnalysisEligibility } from "@/hooks/useAnalysisEligibility";
import { AnalysisProgress } from "@/components/AnalysisProgress";
import { AnalysisCard } from "@/components/AnalysisCard";
import { cn } from "@/lib/utils";

function Analysis() {
  const { setLoading } = useAppContext();
  const { toast } = useToast();
  const {
    analyses,
    isLoading,
    error,
    hasMore,
    isCreatingAnalysis,
    createAnalysis,
    toggleFavorite,
    loadMoreAnalyses
  } = useAnalyses();
  const { isEligible, refetch: refetchEligibility } = useAnalysisEligibility();

  // Handle global loading state
  useEffect(() => {
    setLoading(isCreatingAnalysis);
  }, [isCreatingAnalysis, setLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleCreateAnalysis = () => {
    createAnalysis({
      onSuccess: (analysis) => {
        toast({
          title: "Analysis Complete",
          description: "Your new analysis is ready to explore.",
        });
        // Refresh eligibility after creating analysis
        refetchEligibility();
      },
      onError: (error) => {
        toast({
          title: "Analysis Failed",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      },
    });
  };

  const handleAnalysisComplete = () => {
    // Refresh both analyses and eligibility after analysis completion
    refetchEligibility();
  };

  const handleToggleFavorite = (id: number, isFavorited: boolean) => {
    toggleFavorite(id, isFavorited);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMoreAnalyses();
    }
  };

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
      {/* Analysis Progress Section */}
      <div className="px-4 mb-6">
        <AnalysisProgress
          onAnalysisComplete={handleAnalysisComplete}
        />
      </div>

      {/* Analysis Feed */}
      <div className="px-4 flex-grow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-medium text-foreground">Your Analyses</h3>
          {analyses.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {analyses.length} analysis{analyses.length === 1 ? '' : 'es'}
            </span>
          )}
        </div>

        {/* Loading state for initial load */}
        {isLoading && analyses.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="animate-pulse space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-6 w-6 bg-muted rounded-full"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="h-3 bg-muted rounded w-24"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : analyses.length > 0 ? (
          <div className="space-y-4">
            {/* Analysis Cards */}
            {analyses.map((analysis: any) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="min-w-32"
                >
                  {isLoading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <i className="ri-add-line mr-2" />
                      Load More
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <i className="ri-lightbulb-line text-2xl text-primary" />
            </div>
            <h4 className="text-base font-medium text-foreground mb-2">
              No analyses yet
            </h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {isEligible
                ? "You have enough drops to create your first analysis!"
                : "Keep reflecting! You need 3 drops to generate your first analysis."
              }
            </p>
            {isEligible && (
              <Button
                onClick={handleCreateAnalysis}
                disabled={isCreatingAnalysis}
                className="min-w-32"
              >
                {isCreatingAnalysis ? (
                  <>
                    <i className="ri-loader-4-line animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="ri-lightbulb-line mr-2" />
                    Create Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Analysis;