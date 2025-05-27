
/**
 * Bottom Navigation Component
 * 
 * This component provides a mobile-friendly bottom navigation bar
 * that allows users to navigate between the main sections of the app.
 * It highlights the active section and provides clear visual feedback.
 */

import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

/**
 * The main bottom navigation component
 * 
 * Features:
 * - Fixed position at the bottom of the screen
 * - Visual indication of the current active section
 * - Mobile-friendly touch targets
 * - Consistent access to main app sections
 */
export function BottomNavigation() {
  // Get current route to determine which nav item is active
  const [location] = useLocation();
  
  /**
   * Determines if a navigation item should be highlighted as active
   * 
   * Rules:
   * - Exact match for home route
   * - Prefix match for other routes (to handle nested routes)
   * 
   * @param path - The navigation item's path
   * @returns Whether the item should be highlighted as active
   */
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  /**
   * Individual navigation item component
   * 
   * @param href - The destination URL
   * @param icon - The icon class (using Remix Icon)
   * @param label - The text label for the navigation item
   * @param active - Whether this item is currently active
   */
  const NavItem = ({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) => (
    <div className={`nav-icon ${active ? 'active' : ''}`} onClick={() => window.location.href = href}>
      <div className="relative">
        <i className={cn(
          icon,
          "text-2xl",
          active ? "text-primary" : "text-muted-foreground" // Active items use primary color
        )}></i>
      </div>
      <span className={cn(
        "text-xs mt-1",
        active ? "text-foreground" : "text-muted-foreground" // Active items have more prominent text
      )}>{label}</span>
    </div>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-20 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around items-center py-3">
        {/* Daily journal prompt */}
        <NavItem 
          href="/" 
          icon="ri-water-drop-line" // Water drop icon represents daily journaling
          label="Today" 
          active={isActive("/")} 
        />
        
        {/* Journal entry history */}
        <NavItem 
          href="/feed" 
          icon="ri-history-line" // History icon for past entries
          label="Feed" 
          active={isActive("/feed")} 
        />
        
        {/* Analytics and insights */}
        <NavItem 
          href="/analysis" 
          icon="ri-bar-chart-2-line" // Chart icon for analytics
          label="Insights" 
          active={isActive("/analysis")} 
        />
        
        {/* User profile and settings */}
        <NavItem 
          href="/settings" 
          icon="ri-user-line" // User icon for profile
          label="Profile" 
          active={isActive("/settings")} 
        />
      </div>
    </nav>
  );
}
