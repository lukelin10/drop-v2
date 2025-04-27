import { useState } from "react";
import { useLocation } from "wouter";

export function Header() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [location] = useLocation();

  let title = "Drop";
  if (location === "/feed") title = "Feed";
  if (location === "/analysis") title = "Analysis";
  if (location === "/settings") title = "Settings";

  return (
    <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-md">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold font-serif">{title}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="p-1 rounded-full hover:bg-primary-600 transition-all"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          >
            <i className="ri-notification-3-line text-xl"></i>
          </button>
          <button 
            className="w-8 h-8 rounded-full bg-accent bg-opacity-20 overflow-hidden flex items-center justify-center"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <i className="ri-user-line text-lg"></i>
          </button>
        </div>
      </div>
    </header>
  );
}
