import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-6">
      {/* Page Title */}
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-serif font-medium text-foreground">Your Drops</h1>
      </div>
      
      {/* Drops List */}
      <div className="px-6 flex-grow">
        {drops.length > 0 ? (
          <div className="space-y-6">
            {drops.map((drop) => (
              <div 
                key={drop.id}
                className="rounded-2xl overflow-hidden bg-background border border-border shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => handleOpenChat(drop.id)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs text-muted-foreground font-medium">
                      {formatDate(drop.createdAt)}
                    </span>
                    <button 
                      className={cn(
                        "p-1.5 rounded-full hover:bg-accent/10 transition-colors",
                        drop.favorite ? "text-primary" : "text-muted-foreground"
                      )}
                      onClick={(e) => handleFavoriteClick(e, drop.id)}
                    >
                      <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                    </button>
                  </div>
                  
                  <h3 className="font-serif text-lg text-foreground mb-3 leading-relaxed">{drop.question}</h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-5">{drop.answer}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <i className="ri-chat-1-line mr-1.5"></i>
                        {drop.messageCount} messages
                      </div>
                    </div>
                    <div className="flex items-center text-primary font-medium text-sm">
                      Continue
                      <i className="ri-arrow-right-line ml-1 text-xs"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 py-8">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--light-terracotta))] flex items-center justify-center mb-4">
              <i className="ri-water-drop-line text-primary text-2xl"></i>
            </div>
            <h3 className="font-serif text-lg text-foreground mb-1">Your journey begins</h3>
            <p className="text-muted-foreground text-sm text-center">Complete your first reflection to see it here</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;