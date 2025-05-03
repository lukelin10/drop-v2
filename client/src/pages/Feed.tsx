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
          <div className="space-y-10 pt-4">
            {drops.map((drop) => (
              <div key={drop.id} className="relative mb-2 cursor-pointer group" onClick={() => handleOpenChat(drop.id)}>
                {/* Date positioned outside the card (above) */}
                <div className="absolute -top-3 left-4 z-10">
                  <span className="text-xs text-[hsl(var(--deep-olive))] font-medium bg-white px-2 py-1 rounded-full shadow-sm">
                    {formatDate(drop.createdAt)}
                  </span>
                </div>
                
                {/* Message count outside the card (top right) */}
                <div className="absolute -top-3 right-4 z-10">
                  <div className="flex items-center text-xs bg-white text-[hsl(var(--deep-olive))] px-2 py-1 rounded-full shadow-sm">
                    <i className="ri-chat-1-line mr-1.5"></i>
                    {drop.messageCount || 0}
                  </div>
                </div>
                
                {/* Main card */}
                <div className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Question section with orange gradient background */}
                  <div className="p-5 bg-gradient-to-r from-[hsl(var(--soft-terracotta))] to-[hsl(var(--light-terracotta))]">
                    <p className="text-sm text-white font-medium">{drop.questionText}</p>
                  </div>
                  
                  {/* Response section with white background */}
                  <div className="p-6 bg-white">
                    <p className="text-sm text-foreground line-clamp-3">{drop.text}</p>
                    
                    {/* Favorite button */}
                    <div className="flex justify-end mt-4">
                      <button 
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          drop.favorite 
                            ? "text-[hsl(var(--deep-terracotta))] bg-[hsl(var(--light-terracotta))]" 
                            : "text-[hsl(var(--rich-chestnut))] hover:bg-[hsl(var(--light-terracotta))]"
                        )}
                        onClick={(e) => handleFavoriteClick(e, drop.id)}
                      >
                        <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-96 py-12 px-6 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-card">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--medium-olive))/20] flex items-center justify-center mb-6">
              <i className="ri-seedling-fill text-[hsl(var(--deep-olive))] text-4xl"></i>
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2 tracking-tight">Your journey begins</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs">Complete your first reflection to start building your personal growth timeline</p>
            
            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-48 h-20 mb-6">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[hsl(var(--medium-olive))] rounded-lg"></div>
                <div className="absolute top-2 left-2 w-full h-full opacity-10 bg-[hsl(var(--medium-olive))] rounded-lg"></div>
                <div className="absolute top-4 left-4 w-full h-full bg-[hsl(var(--medium-olive))/30] rounded-lg"></div>
              </div>
              
              <Button 
                onClick={() => navigate('/')} 
                className="px-6 py-2.5 bg-[hsl(var(--deep-olive))] text-white hover:bg-[hsl(var(--deep-olive))/80] rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm flex items-center"
              >
                <i className="ri-add-line mr-1.5"></i>
                Start today's reflection
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;