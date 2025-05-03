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
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-6 pt-10">
      
      {/* Page Header */}
      <div className="px-6 mb-6">
        <h1 className="text-2xl font-serif font-medium text-foreground mb-2">Your Reflections</h1>
        <p className="text-sm text-muted-foreground">
          {drops.length > 0 
            ? `${drops.length} reflection${drops.length === 1 ? '' : 's'} on your journey`
            : 'Begin your reflection journey today'
          }
        </p>
      </div>
      
      {/* Drops List */}
      <div className="px-6 flex-grow">
        {drops.length > 0 ? (
          <div className="space-y-6 pt-4">
            {drops.map((drop) => (
              <div key={drop.id} className="cursor-pointer group" onClick={() => handleOpenChat(drop.id)}>
                {/* Matching the design of the question card from the Today screen */}
                <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--light-terracotta))] to-[hsl(var(--warm-cream))] transition-all shadow-sm hover:shadow-md border border-[hsl(var(--soft-terracotta)_/_10%)]">
                  <div className="flex justify-between items-center px-5 py-3">
                    {/* Date in terracotta color */}
                    <span className="text-xs font-medium text-[hsl(var(--rich-chestnut))]">
                      {formatDate(drop.createdAt)}
                    </span>
                    
                    {/* Favorite button */}
                    <button 
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        drop.favorite 
                          ? "text-[hsl(var(--deep-terracotta))]" 
                          : "text-[hsl(var(--rich-chestnut))]"
                      )}
                      onClick={(e) => handleFavoriteClick(e, drop.id)}
                    >
                      <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                    </button>
                  </div>
                  
                  {/* Question section - larger text like the Today screen */}
                  <div className="px-8 py-5">
                    <h3 className="text-[hsl(var(--rich-chestnut))] text-xl font-serif font-normal leading-relaxed">
                      {drop.questionText}
                    </h3>
                  </div>
                  
                  {/* Response section - subtle background to separate */}
                  <div className="px-8 py-4 bg-[rgba(255,255,255,0.4)] rounded-b-3xl">
                    <p className="text-sm text-[hsl(var(--rich-chestnut))] line-clamp-2">{drop.text}</p>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs font-medium text-[hsl(var(--deep-terracotta))] flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue reflection <i className="ri-arrow-right-s-line ml-1"></i>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 py-12 px-8 rounded-3xl bg-gradient-to-br from-[hsl(var(--light-terracotta))] to-[hsl(var(--warm-cream))] shadow-sm border border-[hsl(var(--soft-terracotta)_/_10%)]">
            <div className="w-16 h-16 flex items-center justify-center mb-6 bg-white/40 rounded-full">
              <i className="ri-seedling-fill text-[hsl(var(--deep-terracotta))] text-3xl"></i>
            </div>
            <h3 className="text-[hsl(var(--rich-chestnut))] text-2xl mb-3 font-serif font-normal">Your journey begins</h3>
            <p className="text-[hsl(var(--rich-chestnut))] text-sm text-center max-w-xs mb-8">Complete your first reflection to start building your personal growth timeline</p>
            
            <Button 
              onClick={() => navigate('/')} 
              className="px-6 py-2.5 bg-white/50 text-[hsl(var(--deep-terracotta))] hover:bg-white/70 border border-[hsl(var(--soft-terracotta)_/_30%)] rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i>
              Start today's reflection
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;