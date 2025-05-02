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
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
      {/* Page Title */}
      <div className="px-4 mb-6">
        <h1 className="text-xl font-serif font-medium text-foreground">Your Drops</h1>
      </div>
      
      {/* Drops List */}
      <div className="px-4 flex-grow">
        {drops.length > 0 ? (
          <div className="space-y-4">
            {drops.map((drop) => (
              <div 
                key={drop.id}
                className="card"
                onClick={() => handleOpenChat(drop.id)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-foreground text-sm">{drop.question}</h4>
                    <div className="flex items-center ml-2">
                      <button 
                        className={cn(
                          "p-1",
                          drop.favorite ? "text-primary" : "text-muted-foreground"
                        )}
                        onClick={(e) => handleFavoriteClick(e, drop.id)}
                      >
                        <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                      </button>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatDate(drop.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{drop.answer}</p>
                </div>
                <div className="bg-muted px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary bg-opacity-10 mr-2">
                      <i className="ri-water-drop-fill text-primary text-xs"></i>
                    </div>
                    <span className="text-xs text-muted-foreground">{drop.messageCount} messages</span>
                  </div>
                  <span className="text-xs text-primary font-medium">Continue</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="mb-4 text-muted-foreground">
              <i className="ri-water-drop-line text-4xl"></i>
            </div>
            <p className="text-muted-foreground">No drops yet</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;