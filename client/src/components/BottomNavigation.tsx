import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-20 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around items-center py-3">
        <Link href="/">
          <a className="nav-icon">
            <div className="relative">
              <i className={cn(
                "ri-water-drop-line text-2xl",
                isActive("/") ? "text-primary" : "text-muted-foreground"
              )}></i>
              {isActive("/") && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
            </div>
            <span className={cn(
              "text-xs mt-1",
              isActive("/") ? "text-foreground" : "text-muted-foreground"
            )}>Today</span>
          </a>
        </Link>
        
        <Link href="/feed">
          <a className="nav-icon">
            <div className="relative">
              <i className={cn(
                "ri-history-line text-2xl",
                isActive("/feed") ? "text-primary" : "text-muted-foreground"
              )}></i>
              {isActive("/feed") && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
            </div>
            <span className={cn(
              "text-xs mt-1",
              isActive("/feed") ? "text-foreground" : "text-muted-foreground"
            )}>Feed</span>
          </a>
        </Link>
        
        <Link href="/analysis">
          <a className="nav-icon">
            <div className="relative">
              <i className={cn(
                "ri-bar-chart-2-line text-2xl",
                isActive("/analysis") ? "text-primary" : "text-muted-foreground"
              )}></i>
              {isActive("/analysis") && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
            </div>
            <span className={cn(
              "text-xs mt-1",
              isActive("/analysis") ? "text-foreground" : "text-muted-foreground"
            )}>Insights</span>
          </a>
        </Link>
        
        <Link href="/settings">
          <a className="nav-icon">
            <div className="relative">
              <i className={cn(
                "ri-user-line text-2xl",
                isActive("/settings") ? "text-primary" : "text-muted-foreground"
              )}></i>
              {isActive("/settings") && <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>}
            </div>
            <span className={cn(
              "text-xs mt-1",
              isActive("/settings") ? "text-foreground" : "text-muted-foreground"
            )}>Profile</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
