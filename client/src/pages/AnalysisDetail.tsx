import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDate } from '@/lib/utils';
import type { Analysis } from '@shared/schema';

interface AnalysisDetailProps {
  params: {
    id: string;
  };
}

function AnalysisDetail() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { setLoading } = useAppContext();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  const analysisId = params.id;

  useEffect(() => {
    if (!analysisId) {
      navigate('/analysis');
      return;
    }

    fetchAnalysis();
  }, [analysisId]);

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analyses/${analysisId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Analysis Not Found",
            description: "This analysis could not be found.",
            variant: "destructive",
          });
          navigate('/analysis');
          return;
        }
        throw new Error('Failed to fetch analysis');
      }

      const analysisData = await response.json();
      setAnalysis(analysisData);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast({
        title: "Error",
        description: "Failed to load analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!analysis || isFavoriteLoading) return;

    setIsFavoriteLoading(true);
    setIsHeartAnimating(true);

    try {
      const response = await fetch(`/api/analyses/${analysis.id}/favorite`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorited: !analysis.isFavorited }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      const updatedAnalysis = await response.json();
      setAnalysis(updatedAnalysis);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status.",
        variant: "destructive",
      });
    } finally {
      setIsFavoriteLoading(false);
      setTimeout(() => setIsHeartAnimating(false), 200);
    }
  };

  const handleBack = () => {
    navigate('/analysis');
  };

  // Parse bullet points from string to array
  const parseBulletPoints = (bulletPoints: string): string[] => {
    return bulletPoints
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^[•\-\*]\s*/, '').trim());
  };

  if (isLoading) {
    return (
      <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
        <div className="px-4">
          {/* Loading skeleton */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-muted rounded w-20 animate-pulse"></div>
              <div className="h-10 w-10 bg-muted rounded-full animate-pulse"></div>
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!analysis) {
    return (
      <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
        <div className="px-4 flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mb-4">
            <i className="ri-file-search-line text-2xl text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-2">
            Analysis Not Found
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            This analysis doesn't exist or you don't have access to it.
          </p>
          <Button onClick={handleBack} variant="outline">
            <i className="ri-arrow-left-line mr-2" />
            Back to Analyses
          </Button>
        </div>
      </section>
    );
  }

  const bulletPoints = parseBulletPoints(analysis.bulletPoints);

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
      <div className="px-4">
        {/* Header with back button and favorite */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="p-2 -ml-2"
          >
            <i className="ri-arrow-left-line text-lg" />
          </Button>
          
          <button
            className={cn(
              "p-2 rounded-full transition-all duration-200",
              "hover:bg-muted/50 active:scale-90",
              isHeartAnimating && "scale-110"
            )}
            onClick={handleToggleFavorite}
            disabled={isFavoriteLoading}
            aria-label={analysis.isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <i 
              className={cn(
                "text-xl transition-colors duration-200",
                analysis.isFavorited 
                  ? "ri-heart-fill text-primary" 
                  : "ri-heart-line text-muted-foreground hover:text-primary"
              )}
            />
          </button>
        </div>

        {/* Analysis content */}
        <div className="space-y-6">
          {/* Summary */}
          <div>
            <h1 className="text-xl font-serif font-medium text-foreground leading-relaxed mb-3">
              {analysis.summary}
            </h1>
            <div className="flex items-center text-xs text-muted-foreground">
              <i className="ri-time-line mr-1" />
              <span>{formatDate(analysis.createdAt)}</span>
            </div>
          </div>

          {/* Main content */}
          <div className="prose prose-sm max-w-none">
            {analysis.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-base text-foreground leading-relaxed mb-4 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Key insights */}
          {bulletPoints.length > 0 && (
            <div className="border-t border-border pt-6">
              <h2 className="text-base font-medium text-foreground mb-4 flex items-center">
                <i className="ri-lightbulb-line mr-2 text-primary" />
                Key Insights
              </h2>
              <ul className="space-y-3">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AnalysisDetail; 