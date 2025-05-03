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
          <div className="space-y-14 pt-8">
            {drops.map((drop) => (
              <div key={drop.id} className="relative mt-4 cursor-pointer group" onClick={() => handleOpenChat(drop.id)}>
                {/* Date positioned completely outside the card (above) */}
                <div className="absolute -top-7 left-3 z-10">
                  <span className="text-xs text-[hsl(var(--deep-olive))] font-medium bg-white px-3 py-1.5 rounded-full shadow border border-[hsl(var(--border))]">
                    {formatDate(drop.createdAt)}
                  </span>
                </div>
                
                {/* Main card */}
                <div className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Question section with metallic orange gradient background just for the text area */}
                  <div className="p-5 bg-white">
                    <div className="p-3 rounded-lg relative overflow-hidden" 
                         style={{
                           backgroundImage: "linear-gradient(135deg, #D27D52, #E8A87C, #D27D52)",
                           backgroundSize: "200% 200%",
                           boxShadow: "inset 0 1px 3px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(0,0,0,0.2)"
                         }}>
                         <div 
                           className="absolute inset-0 opacity-20" 
                           style={{
                             background: "linear-gradient(to bottom, rgba(255,255,255,0.5) 0%, transparent 50%, transparent 100%)"
                           }}
                         ></div>
                      <p className="text-sm text-white font-medium relative z-10" style={{ textShadow: "0px 1px 1px rgba(0,0,0,0.15)" }}>{drop.questionText}</p>
                    </div>
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