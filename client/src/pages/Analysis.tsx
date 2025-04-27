import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { useDrops } from "@/hooks/useDrops";
import { cn } from "@/lib/utils";

interface Analysis {
  id: number;
  title: string;
  description: string;
  createdAt: string;
  status: "completed" | "in_progress";
  progress: number;
}

interface Theme {
  id: number;
  name: string;
  icon: string;
  color: string;
  percentage: number;
}

function Analysis() {
  const { setLoading } = useAppContext();
  const { toast } = useToast();
  const { drops } = useDrops();
  
  // Mock data for analysis
  const analyses: Analysis[] = [
    {
      id: 1,
      title: "Monthly Reflection Patterns",
      description: "Analysis of your reflection patterns over the last 30 days, highlighting your most common themes and emotional trends.",
      createdAt: "2023-10-18T12:00:00Z",
      status: "completed",
      progress: 100
    },
    {
      id: 2,
      title: "Growth Analysis",
      description: "Tracking your personal development goals and identifying areas of progress and opportunities for future growth.",
      createdAt: "2023-10-10T12:00:00Z",
      status: "in_progress",
      progress: 75
    }
  ];
  
  const themes: Theme[] = [
    {
      id: 1,
      name: "Relationships",
      icon: "ri-heart-line",
      color: "primary",
      percentage: 68
    },
    {
      id: 2,
      name: "Learning",
      icon: "ri-book-open-line",
      color: "secondary",
      percentage: 52
    },
    {
      id: 3,
      name: "Wellbeing",
      icon: "ri-mental-health-line",
      color: "primary",
      percentage: 45
    },
    {
      id: 4,
      name: "Goals",
      icon: "ri-focus-3-line",
      color: "secondary",
      percentage: 40
    }
  ];

  function handleCreateNewAnalysis() {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Analysis Started",
        description: "Your new analysis is being generated and will be ready soon.",
      });
    }, 1000);
  }

  function handleViewAnalysisDetails(id: number) {
    setLoading(true);
    
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Analysis Details",
        description: "This feature is coming soon.",
      });
    }, 500);
  }

  return (
    <section className="flex flex-col min-h-[calc(100vh-120px)] py-4">
      {/* Overview */}
      <div className="px-4 mb-6">
        <div className="card p-5">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-medium text-foreground">Overview</h3>
            <Button 
              variant="link" 
              className="text-sm text-primary flex items-center p-0"
              onClick={handleCreateNewAnalysis}
            >
              <i className="ri-add-line mr-1"></i>
              <span>New Analysis</span>
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <i className="ri-water-drop-fill text-primary"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{drops.length} total drops</p>
                <p className="text-xs text-muted-foreground">Since joining Sep 2023</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-secondary bg-opacity-10 flex items-center justify-center">
                <i className="ri-calendar-check-line text-secondary"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">28 day streak</p>
                <p className="text-xs text-muted-foreground">You're on a roll!</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
                <i className="ri-emotion-happy-line text-primary"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">Mood trend: Positive</p>
                <p className="text-xs text-muted-foreground">75% positive entries this month</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Analyses */}
      <div className="px-4 mb-8">
        <h3 className="text-base font-medium text-foreground mb-3">Recent Analyses</h3>
        
        <div className="space-y-3">
          {analyses.map(analysis => (
            <div 
              key={analysis.id}
              className="card cursor-pointer"
              onClick={() => handleViewAnalysisDetails(analysis.id)}
            >
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-foreground text-sm">{analysis.title}</h4>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full ml-2",
                    analysis.status === "completed" 
                      ? "bg-secondary bg-opacity-10 text-secondary" 
                      : "bg-primary bg-opacity-10 text-primary"
                  )}>
                    {analysis.status === "completed" ? "Completed" : "In Progress"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{analysis.description}</p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <i className="ri-time-line mr-1"></i>
                  <span>Created {new Date(analysis.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              <div className="h-1 w-full bg-muted">
                <div className={cn(
                  "h-1", 
                  analysis.status === "completed" ? "bg-secondary" : "bg-primary"
                )} style={{ width: `${analysis.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Topics & Themes */}
      <div className="px-4">
        <h3 className="text-base font-medium text-foreground mb-3">Common Themes</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {themes.map(theme => (
            <div key={theme.id} className="card p-3">
              <div className="flex items-center mb-2">
                <div className={cn(
                  "w-8 h-8 rounded-full bg-opacity-10 flex items-center justify-center",
                  theme.color === "primary" ? "bg-primary" : "bg-secondary"
                )}>
                  <i className={cn(
                    theme.icon,
                    theme.color === "primary" ? "text-primary" : "text-secondary"
                  )}></i>
                </div>
                <h4 className="ml-2 font-medium text-foreground text-sm">{theme.name}</h4>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full">
                <div className={cn(
                  "h-1.5 rounded-full",
                  theme.color === "primary" ? "bg-primary" : "bg-secondary"
                )} style={{ width: `${theme.percentage}%` }}></div>
              </div>
              <p className="text-xs text-right mt-1 text-muted-foreground">{theme.percentage}%</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Analysis;