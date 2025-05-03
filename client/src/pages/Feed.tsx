import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useDrops, type DropWithQuestion } from "@/hooks/useDrops";
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
                  {/* Show question first */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center">
                      <div className="w-5 h-5 rounded-full bg-[hsl(var(--light-terracotta))] flex items-center justify-center mr-2">
                        <i className="ri-question-line text-[hsl(var(--deep-terracotta))] text-xs"></i>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Your prompt</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mb-3">{drop.questionText}</p>
                  </div>
                  
                  {/* Show reflection text */}
                  <div className="mb-5">
                    <div className="mb-2 flex items-center">
                      <div className="w-5 h-5 rounded-full bg-[hsl(var(--light-terracotta))] flex items-center justify-center mr-2">
                        <i className="ri-quill-pen-line text-[hsl(var(--deep-terracotta))] text-xs"></i>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Your reflection</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3">{drop.text}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center text-xs bg-[hsl(var(--light-terracotta))] text-[hsl(var(--deep-terracotta))] px-2 py-1 rounded-full">
                        <i className="ri-chat-1-line mr-1.5"></i>
                        {drop.messageCount || 0} messages
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
          <div className="flex flex-col items-center justify-center h-96 py-12 px-6 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] bg-card">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--light-terracotta))/20] flex items-center justify-center mb-6">
              <i className="ri-water-drop-fill text-[hsl(var(--deep-terracotta))] text-4xl"></i>
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2 tracking-tight">Your journey begins</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs">Complete your first reflection to start building your personal growth timeline</p>
            
            <div className="mt-8 flex flex-col items-center">
              <div className="relative w-48 h-20 mb-6">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[hsl(var(--medium-terracotta))] rounded-lg"></div>
                <div className="absolute top-2 left-2 w-full h-full opacity-10 bg-[hsl(var(--medium-terracotta))] rounded-lg"></div>
                <div className="absolute top-4 left-4 w-full h-full bg-[hsl(var(--medium-terracotta))/30] rounded-lg"></div>
              </div>
              
              <Button 
                onClick={() => navigate('/')} 
                className="px-6 py-2.5 bg-[hsl(var(--soft-terracotta))] text-white hover:bg-[hsl(var(--deep-terracotta))] rounded-full shadow-sm hover:shadow-md transition-all font-medium text-sm flex items-center"
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