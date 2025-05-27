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
  const { drops } = useDrops();

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
                  </div>
                  
                  {/* Question section - larger text like the Today screen, now in olive green */}
                  <div className="px-8 py-5">
                    <h3 className="text-[hsl(var(--deep-olive))] text-xl font-serif font-normal leading-relaxed">
                      {drop.questionText}
                    </h3>
                  </div>
                  
                  {/* Response section - subtle background to separate */}
                  <div className="px-8 pb-5">
                    <p className="text-[hsl(var(--rich-chestnut))] text-sm leading-relaxed">
                      {drop.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-4">No reflections yet</p>
            <Button onClick={() => navigate("/")}>Start Your Journey</Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;