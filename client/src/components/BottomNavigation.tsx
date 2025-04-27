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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="max-w-lg mx-auto flex justify-around">
        <Link href="/">
          <a className={cn(
            "flex flex-col items-center py-2 px-4", 
            isActive("/") 
              ? "text-primary" 
              : "text-foreground opacity-60"
          )}>
            <i className="ri-drop-line text-xl"></i>
            <span className="text-xs mt-1">Today</span>
          </a>
        </Link>
        
        <Link href="/feed">
          <a className={cn(
            "flex flex-col items-center py-2 px-4", 
            isActive("/feed") 
              ? "text-primary" 
              : "text-foreground opacity-60"
          )}>
            <i className="ri-chat-history-line text-xl"></i>
            <span className="text-xs mt-1">Feed</span>
          </a>
        </Link>
        
        <Link href="/analysis">
          <a className={cn(
            "flex flex-col items-center py-2 px-4", 
            isActive("/analysis") 
              ? "text-primary" 
              : "text-foreground opacity-60"
          )}>
            <i className="ri-bar-chart-2-line text-xl"></i>
            <span className="text-xs mt-1">Insights</span>
          </a>
        </Link>
        
        <Link href="/settings">
          <a className={cn(
            "flex flex-col items-center py-2 px-4", 
            isActive("/settings") 
              ? "text-primary" 
              : "text-foreground opacity-60"
          )}>
            <i className="ri-settings-4-line text-xl"></i>
            <span className="text-xs mt-1">Settings</span>
          </a>
        </Link>
      </div>
    </nav>
  );
}
