/**
 * Application Layout Component
 * 
 * This component provides the consistent layout structure for the application,
 * including the header, main content area, and bottom navigation.
 * It adapts its appearance based on the current route.
 */

import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useLocation } from "wouter";

/**
 * Props for the Layout component
 * @property children - The main content to render within the layout
 */
interface LayoutProps {
  children: ReactNode;
}

/**
 * The main layout component for the application
 * 
 * Provides a consistent UI structure with:
 * - Header (except in chat views)
 * - Main content area
 * - Bottom navigation bar
 * - Loading screen overlay
 * 
 * @param children - The main content to display
 */
export function Layout({ children }: LayoutProps) {
  // Get current route location to adjust layout
  const [location] = useLocation();
  
  // Special handling for chat pages which have their own header
  const isChat = location.includes("/chat");

  return (
    <div className="max-w-lg mx-auto bg-background min-h-screen relative overflow-hidden">
      {/* Global loading indicator shown during transitions */}
      <LoadingScreen />
      
      {/* Conditional header - hidden in chat views which have their own back button */}
      {!isChat && <Header />}
      
      {/* Main content area with padding for bottom navigation */}
      <main className="pb-24 flex flex-col min-h-screen">
        {children}
      </main>
      
      {/* Fixed bottom navigation bar */}
      <BottomNavigation />
    </div>
  );
}
