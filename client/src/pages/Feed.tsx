import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { type DropWithQuestion } from "@shared/schema";

function Feed() {
  const [, navigate] = useLocation();
  const { setLoading } = useAppContext();
  const { drops, toggleFavorite } = useDrops();

  function handleFavoriteClick(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    toggleFavorite(id);
  }

  function handleOpenChat(id: number) {
    setLoading(true);
    setTimeout(() => {
      navigate(`/chat/${id}`);
      setLoading(false);
    }, 300);
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-8">
      
      {/* Enhanced Page Header */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--soft-terracotta))/10] flex items-center justify-center">
            <i className="ri-book-mark-line text-[hsl(var(--soft-terracotta))]"></i>
          </div>
          <h1 className="text-2xl font-serif font-medium text-foreground">Your Reflections</h1>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {drops.length > 0 
              ? <span>
                  <span className="font-medium text-[hsl(var(--deep-olive))]">{drops.length}</span> reflection{drops.length === 1 ? '' : 's'} on your journey
                </span>
              : 'Begin your reflection journey today'
            }
          </p>
          {drops.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medium text-[hsl(var(--soft-terracotta))] hover:text-[hsl(var(--deep-terracotta))] hover:bg-[hsl(var(--soft-terracotta))/5]"
            >
              <i className="ri-filter-3-line mr-1"></i>
              Filter
            </Button>
          )}
        </div>
      </div>
      
      {/* Drops List */}
      <div className="px-6 flex-grow">
        {drops.length > 0 ? (
          <div className="space-y-6">
            {drops.map((drop) => (
              <div 
                key={drop.id}
                className="rounded-2xl overflow-hidden border border-[#E8E1D9] shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group bg-white"
                onClick={() => handleOpenChat(drop.id)}
              >
                {/* Card Header - Simplified and elegant */}
                <div className="px-6 pt-6 pb-2 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[hsl(var(--soft-terracotta))/10] flex items-center justify-center">
                      <i className="ri-questionnaire-line text-[hsl(var(--soft-terracotta))]"></i>
                    </div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                      {formatDate(drop.createdAt)}
                    </span>
                  </div>
                  <button 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                      drop.favorite 
                        ? "text-[hsl(var(--soft-terracotta))] bg-[hsl(var(--soft-terracotta))/10]" 
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--soft-terracotta))/5]"
                    )}
                    onClick={(e) => handleFavoriteClick(e, drop.id)}
                    aria-label={drop.favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                  </button>
                </div>
                
                {/* Question - Clear visual hierarchy with better typography */}
                <div className="px-6 pb-4">
                  <h3 className="text-sm font-medium text-[hsl(var(--foreground))] mb-3">
                    {drop.questionText}
                  </h3>
                  
                  {/* Divider */}
                  <div className="h-px w-12 bg-[hsl(var(--soft-terracotta))/30] mb-3"></div>
                  
                  {/* Response - Clean presentation with better spacing */}
                  <p className="text-sm text-[hsl(var(--foreground))/90] line-clamp-3 leading-relaxed">
                    {drop.text}
                  </p>
                </div>
                
                {/* Card Footer - Cleaner design */}
                <div className="px-6 py-4 border-t border-[#F5EFE6] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-xs font-medium text-[hsl(var(--muted-foreground))]">
                      <i className="ri-chat-1-line mr-1.5 text-[hsl(var(--soft-terracotta))]"></i>
                      {drop.messageCount || 0} message{drop.messageCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="flex items-center text-xs font-medium text-[hsl(var(--soft-terracotta))] group-hover:text-[hsl(var(--deep-olive))] transition-colors">
                    Continue reflection
                    <i className="ri-arrow-right-line ml-1.5 transition-transform group-hover:translate-x-0.5"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 rounded-2xl border border-[#E8E1D9] bg-white">
            {/* Improved illustration for empty state */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full bg-[hsl(var(--soft-terracotta))/10] flex items-center justify-center">
                <i className="ri-questionnaire-line text-[hsl(var(--soft-terracotta))] text-3xl"></i>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-[hsl(var(--deep-olive))/10] flex items-center justify-center">
                <i className="ri-quill-pen-line text-[hsl(var(--deep-olive))] text-lg"></i>
              </div>
              <div className="absolute -bottom-2 -left-2 w-12 h-12 rounded-full bg-[hsl(var(--warm-cream))] flex items-center justify-center border border-[#E8E1D9]">
                <i className="ri-sun-line text-[hsl(var(--soft-terracotta))] text-xl"></i>
              </div>
            </div>
            
            <h3 className="font-serif text-xl text-foreground mb-3 tracking-tight">Your journey begins</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs mb-8">Take a moment each day to reflect and grow through thoughtful prompts and guided journaling</p>
            
            <Button 
              onClick={() => navigate('/')} 
              className="px-8 py-3 bg-[hsl(var(--soft-terracotta))] text-white hover:bg-[hsl(var(--deep-terracotta))] rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm flex items-center"
            >
              <i className="ri-add-line mr-2"></i>
              Start today's reflection
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;