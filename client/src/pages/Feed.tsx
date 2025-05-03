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
                {/* Inspired by the minimalist card design in the reference image */}
                <div className="rounded-2xl bg-[#EDF2E9] hover:bg-[#E5EDE0] transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <div className="px-5 py-4 flex justify-between items-center">
                    {/* Date in olive green */}
                    <span className="text-xs font-medium text-[hsl(var(--deep-olive))]">
                      {formatDate(drop.createdAt)}
                    </span>
                    
                    {/* Favorite button */}
                    <button 
                      className={cn(
                        "p-1 rounded-full transition-colors",
                        drop.favorite 
                          ? "text-[hsl(var(--deep-terracotta))]" 
                          : "text-[hsl(var(--muted-foreground))]"
                      )}
                      onClick={(e) => handleFavoriteClick(e, drop.id)}
                    >
                      <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                    </button>
                  </div>
                  
                  {/* Question section */}
                  <div className="px-5 pb-4">
                    <h3 className="text-[#3B2E2A] font-medium text-base">
                      {drop.questionText}
                    </h3>
                  </div>
                  
                  {/* Response section */}
                  <div className="px-5 pb-4 pt-2 border-t border-[#D5E0C9]">
                    <p className="text-sm text-[#5C534F] line-clamp-2">{drop.text}</p>
                    <div className="flex justify-end mt-2">
                      <span className="text-xs text-[hsl(var(--deep-terracotta))] flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue reading <i className="ri-arrow-right-s-line ml-1"></i>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 py-12 px-6 rounded-2xl bg-[#EDF2E9] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="w-16 h-16 flex items-center justify-center mb-6">
              <i className="ri-seedling-fill text-[hsl(var(--deep-olive))] text-3xl"></i>
            </div>
            <h3 className="text-[#3B2E2A] text-xl mb-3 font-medium">Your journey begins</h3>
            <p className="text-[#5C534F] text-sm text-center max-w-xs mb-6">Complete your first reflection to start building your personal growth timeline</p>
            
            <Button 
              onClick={() => navigate('/')} 
              className="px-6 py-2.5 bg-[hsl(var(--deep-terracotta))] text-white hover:bg-[hsl(var(--deep-terracotta))/90] rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm flex items-center"
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