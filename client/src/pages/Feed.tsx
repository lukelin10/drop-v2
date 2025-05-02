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
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-6 pt-10">
      
      {/* Drops List */}
      <div className="px-6 flex-grow">
        {drops.length > 0 ? (
          <div className="space-y-6">
            {drops.map((drop) => (
              <div 
                key={drop.id}
                className="rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => handleOpenChat(drop.id)}
              >
                {/* Card Header with soft gradient background */}
                <div className="bg-gradient-to-r from-[hsl(var(--medium-terracotta))] to-[hsl(var(--light-terracotta))] px-6 py-3 flex justify-between items-center">
                  <span className="text-xs text-[hsl(var(--rich-chestnut))] font-medium">
                    {formatDate(drop.createdAt)}
                  </span>
                  <button 
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      drop.favorite 
                        ? "text-[hsl(var(--deep-terracotta))] bg-white/30" 
                        : "text-[hsl(var(--rich-chestnut))] hover:bg-white/20"
                    )}
                    onClick={(e) => handleFavoriteClick(e, drop.id)}
                  >
                    <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                  </button>
                </div>
                
                {/* Card Body with white background */}
                <div className="p-6 bg-white">
                  <h3 className="text-lg text-foreground mb-3 leading-relaxed font-medium tracking-tight group-hover:text-[hsl(var(--primary))] transition-colors">{drop.question}</h3>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-5">{drop.answer}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-xs bg-[hsl(var(--light-terracotta))] text-[hsl(var(--deep-terracotta))] px-2 py-1 rounded-full">
                        <i className="ri-chat-1-line mr-1.5"></i>
                        {drop.messageCount} messages
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--light-terracotta))] flex items-center justify-center group-hover:bg-[hsl(var(--soft-terracotta))] transition-colors">
                      <i className="ri-arrow-right-line text-[hsl(var(--deep-terracotta))] text-sm group-hover:text-white"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 py-12 px-6 rounded-2xl bg-gradient-to-b from-[hsl(var(--medium-terracotta))] to-[hsl(var(--light-terracotta))]">
            <div className="w-20 h-20 rounded-full bg-white/70 flex items-center justify-center mb-6 shadow-md">
              <i className="ri-water-drop-fill text-[hsl(var(--deep-terracotta))] text-3xl"></i>
            </div>
            <h3 className="text-xl text-[hsl(var(--rich-chestnut))] mb-2 font-medium tracking-tight">Your journey begins</h3>
            <p className="text-[hsl(var(--rich-chestnut))] text-sm text-center max-w-xs opacity-90">Complete your first reflection to see your previous drops here</p>
            <button 
              onClick={() => navigate('/')} 
              className="mt-6 px-5 py-2.5 bg-white text-[hsl(var(--primary))] rounded-full shadow-sm hover:shadow-md transition-shadow font-medium text-sm flex items-center"
            >
              <i className="ri-add-line mr-1.5"></i>
              Start today's reflection
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;