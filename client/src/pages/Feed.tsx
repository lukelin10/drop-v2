import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type FilterType = "all" | "week" | "month" | "favorites";

function Feed() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const { setLoading } = useAppContext();
  const { drops, toggleFavorite } = useDrops();

  const filteredDrops = drops.filter(drop => {
    const matchesSearch = drop.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          drop.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filter === "all") return true;
    if (filter === "favorites" && drop.favorite) return true;
    
    const now = new Date();
    const dropDate = new Date(drop.createdAt);
    
    if (filter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return dropDate >= weekAgo;
    }
    
    if (filter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return dropDate >= monthAgo;
    }
    
    return true;
  });

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
      {/* Search */}
      <div className="px-4 mb-6">
        <div className="relative">
          <Input 
            type="text" 
            className="search-input pl-10"
            placeholder="Search your drops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="ri-search-line absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 px-4">
        <div className="flex overflow-x-auto py-1 space-x-2 no-scrollbar">
          <Button 
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm rounded-full whitespace-nowrap border",
              filter === "all" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-muted-foreground border-border"
            )}
            onClick={() => setFilter("all")}
          >
            All Drops
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm rounded-full whitespace-nowrap border",
              filter === "week" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-muted-foreground border-border"
            )}
            onClick={() => setFilter("week")}
          >
            This Week
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm rounded-full whitespace-nowrap border",
              filter === "month" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-muted-foreground border-border"
            )}
            onClick={() => setFilter("month")}
          >
            This Month
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "px-4 py-2 text-sm rounded-full whitespace-nowrap border",
              filter === "favorites" 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-muted-foreground border-border"
            )}
            onClick={() => setFilter("favorites")}
          >
            Favorites
          </Button>
        </div>
      </div>
      
      {/* Drops List */}
      <div className="px-4 flex-grow">
        {filteredDrops.length > 0 ? (
          <div className="space-y-4">
            {filteredDrops.map(drop => (
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
              <i className="ri-search-line text-4xl"></i>
            </div>
            <p className="text-muted-foreground">No drops found</p>
            {searchQuery && (
              <Button 
                variant="link" 
                className="text-primary mt-2"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;