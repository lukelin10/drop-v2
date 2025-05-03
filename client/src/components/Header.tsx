import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import dropLogoV2 from "../assets/drop-logo-v2.svg";
import dropLogoV3 from "../assets/drop-logo-v3.svg";
import dropLogoV4 from "../assets/drop-logo-v4.svg";
import dropLogoV5 from "../assets/drop-logo-v5.svg";
import dropLogoV6 from "../assets/drop-logo-v6.svg";
import dropLogoV7 from "../assets/drop-logo-v7.svg";
import dropLogoV8 from "../assets/drop-logo-v8.svg";

export function Header() {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [location] = useLocation();
  const [currentLogo, setCurrentLogo] = useState<string>(dropLogoV8); // Default to the latest version

  // Define page titles
  let title = "Drop";
  if (location === "/") title = "Today's Drop";
  if (location === "/feed") title = "Your Drops";
  if (location === "/analysis") title = "Insights";
  if (location === "/settings") title = "Profile";

  // For demonstration - cycle through logo options
  // Remove this in final implementation and just use your preferred logo
  useEffect(() => {
    // Comment out this effect when you decide which logo to use
    const logoOptions = [dropLogoV2, dropLogoV3, dropLogoV4, dropLogoV5, dropLogoV6, dropLogoV7, dropLogoV8];
    const params = new URLSearchParams(window.location.search);
    const logoParam = params.get('logo');
    
    if (logoParam && !isNaN(parseInt(logoParam))) {
      const index = parseInt(logoParam) - 2; // v2 starts at index 0
      if (index >= 0 && index < logoOptions.length) {
        setCurrentLogo(logoOptions[index]);
      }
    }
  }, [location]);

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

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-border pt-4">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2">
          <img src={currentLogo} alt="Drop logo" className="w-6 h-6" />
          <h1 className="text-lg font-medium text-foreground">{title}</h1>
        </div>
        
        <div className="flex items-center">
          {getHeaderActions()}
        </div>
      </div>
    </header>
  );
}
