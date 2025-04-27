import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDrops } from "@/hooks/useDrops";
import { useAppContext } from "@/context/AppContext";
import { formatDate } from "@/lib/utils";

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
    <section className="px-4 py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 text-foreground">Your Drops</h2>
        <p className="text-sm text-foreground opacity-70">Review all your previous reflections</p>
      </div>
      
      {/* Search and Filter */}
      <div className="mb-6">
        <div className="relative">
          <Input 
            type="text" 
            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary"
            placeholder="Search your drops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground opacity-50"></i>
        </div>
        
        <div className="flex overflow-x-auto py-3 space-x-2 no-scrollbar">
          <Button 
            variant={filter === "all" ? "default" : "outline"}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-white text-foreground"}`}
            onClick={() => setFilter("all")}
          >
            All Drops
          </Button>
          <Button
            variant={filter === "week" ? "default" : "outline"}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${filter === "week" ? "bg-primary text-primary-foreground" : "bg-white text-foreground"}`}
            onClick={() => setFilter("week")}
          >
            This Week
          </Button>
          <Button
            variant={filter === "month" ? "default" : "outline"}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${filter === "month" ? "bg-primary text-primary-foreground" : "bg-white text-foreground"}`}
            onClick={() => setFilter("month")}
          >
            This Month
          </Button>
          <Button
            variant={filter === "favorites" ? "default" : "outline"}
            className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${filter === "favorites" ? "bg-primary text-primary-foreground" : "bg-white text-foreground"}`}
            onClick={() => setFilter("favorites")}
          >
            Favorites
          </Button>
        </div>
      </div>
      
      {/* Drops List */}
      <div className="space-y-4">
        {filteredDrops.map(drop => (
          <div 
            key={drop.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all"
            onClick={() => handleOpenChat(drop.id)}
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-foreground">{drop.question}</h4>
                <div className="flex items-center">
                  <button 
                    className={`p-1 ${drop.favorite ? 'text-primary' : 'text-foreground opacity-50 hover:opacity-100'}`}
                    onClick={(e) => handleFavoriteClick(e, drop.id)}
                  >
                    <i className={drop.favorite ? 'ri-star-fill' : 'ri-star-line'}></i>
                  </button>
                  <span className="text-xs text-foreground opacity-50 ml-2">
                    {formatDate(drop.createdAt)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-foreground opacity-70 line-clamp-3">{drop.answer}</p>
            </div>
            <div className="bg-primary bg-opacity-10 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center">
                <i className="ri-chat-3-line text-primary mr-1 text-sm"></i>
                <span className="text-xs text-foreground">{drop.messageCount} messages</span>
              </div>
              <span className="text-xs text-primary font-medium">Continue</span>
            </div>
          </div>
        ))}
        
        {filteredDrops.length === 0 && (
          <div className="text-center p-8">
            <p className="text-foreground opacity-70">No drops found</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;
