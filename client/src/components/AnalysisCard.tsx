import { useState } from 'react';
import { useLocation } from 'wouter';
import { cn, formatDate } from '@/lib/utils';
import type { Analysis } from '@shared/schema';

interface AnalysisCardProps {
  analysis: Analysis;
  onToggleFavorite: (id: number, isFavorited: boolean) => void;
  isFavoriteLoading?: boolean;
}

export function AnalysisCard({ analysis, onToggleFavorite, isFavoriteLoading }: AnalysisCardProps) {
  const [, navigate] = useLocation();
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the heart button
    if ((e.target as Element).closest('.heart-button')) {
      return;
    }
    navigate(`/analysis/${analysis.id}`);
  };

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavoriteLoading) return;
    
    setIsHeartAnimating(true);
    onToggleFavorite(analysis.id, !analysis.isFavorited);
    
    setTimeout(() => setIsHeartAnimating(false), 200);
  };

  // Extract first paragraph for preview (limit to ~150 characters)
  const previewText = analysis.content.split('\n\n')[0];
  const truncatedPreview = previewText.length > 150 
    ? previewText.substring(0, 150) + '...' 
    : previewText;

  return (
    <div 
      className="card cursor-pointer group transition-all hover:shadow-md"
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Header with summary and heart */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-base font-medium text-foreground leading-snug flex-1 mr-3">
            {analysis.summary}
          </h3>
          <button
            className={cn(
              "heart-button flex-shrink-0 p-1 rounded-full transition-all duration-200",
              "hover:bg-muted/50 active:scale-90",
              isHeartAnimating && "scale-110"
            )}
            onClick={handleHeartClick}
            disabled={isFavoriteLoading}
            aria-label={analysis.isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <i 
              className={cn(
                "text-lg transition-colors duration-200",
                analysis.isFavorited 
                  ? "ri-heart-fill text-primary" 
                  : "ri-heart-line text-muted-foreground hover:text-primary"
              )}
            />
          </button>
        </div>

        {/* Content preview */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {truncatedPreview}
        </p>

        {/* Footer with date and read more indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-muted-foreground">
            <i className="ri-time-line mr-1" />
            <span>
              {formatDate(analysis.createdAt)}
            </span>
          </div>
          
          <div className="flex items-center text-xs text-primary group-hover:text-primary/80">
            <span className="mr-1">Read more</span>
            <i className="ri-arrow-right-line transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
} 