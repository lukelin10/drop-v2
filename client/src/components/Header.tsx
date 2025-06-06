import { useState } from "react";
import { useLocation } from "wouter";
import dropLogo from "../assets/drop-logo-final.svg";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Header() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Always use "Drop" as the app name
  const title = "Drop";

  // Get header actions based on path
  function getHeaderActions() {
    if (location === "/") {
      return (
        <button 
          className="flex items-center justify-center w-9 h-9 rounded-full text-foreground"
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
        >
          <i className="ri-notification-3-line text-xl"></i>
        </button>
      );
    }
    
    if (location === "/feed") {
      return (
        <div className="flex space-x-1">
          <button 
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground"
          >
            <i className="ri-search-line text-xl"></i>
          </button>
          <button 
            className="flex items-center justify-center w-9 h-9 rounded-full text-foreground"
          >
            <i className="ri-add-line text-xl"></i>
          </button>
        </div>
      );
    }
    
    return null;
  }

  function renderAuthButton() {
    if (isLoading) {
      return <Button size="sm" variant="ghost" disabled>Loading...</Button>;
    }

    if (isAuthenticated) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm hidden md:inline-block">
            {user?.username}
          </span>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => window.location.href = "/api/logout"}
          >
            Log out
          </Button>
        </div>
      );
    }

    return (
      <Button 
        size="sm" 
        variant="default"
        onClick={() => window.location.href = "/api/login"}
      >
        Log in
      </Button>
    );
  }

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border pt-4">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={dropLogo} alt="Drop logo" className="w-6 h-6" />
          <h1 className="text-lg font-medium text-foreground">{title}</h1>
        </div>
        
        <div className="flex items-center">
          {renderAuthButton()}
          {getHeaderActions()}
        </div>
      </div>
    </header>
  );
}
