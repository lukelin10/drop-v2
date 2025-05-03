
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const NavItem = ({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) => (
    <div className={`nav-icon ${active ? 'active' : ''}`} onClick={() => window.location.href = href}>
      <div className="relative">
        <i className={cn(
          icon,
          "text-2xl",
          active ? "text-primary" : "text-muted-foreground"
        )}></i>
      </div>
      <span className={cn(
        "text-xs mt-1",
        active ? "text-foreground" : "text-muted-foreground"
      )}>{label}</span>
    </div>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-20 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around items-center py-3">
        <NavItem 
          href="/" 
          icon="ri-water-drop-line" 
          label="Today" 
          active={isActive("/")} 
        />
        
        <NavItem 
          href="/feed" 
          icon="ri-history-line" 
          label="Feed" 
          active={isActive("/feed")} 
        />
        
        <NavItem 
          href="/analysis" 
          icon="ri-bar-chart-2-line" 
          label="Insights" 
          active={isActive("/analysis")} 
        />
        
        <NavItem 
          href="/settings" 
          icon="ri-user-line" 
          label="Profile" 
          active={isActive("/settings")} 
        />
      </div>
    </nav>
  );
}
