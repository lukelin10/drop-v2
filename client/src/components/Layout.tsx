import { ReactNode } from "react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useLocation } from "wouter";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isChat = location.includes("/chat");

  return (
    <div className="max-w-lg mx-auto bg-accent min-h-screen relative pb-16 overflow-x-hidden">
      <LoadingScreen />
      
      {/* Only show header when not in chat */}
      {!isChat && <Header />}
      
      <main className="pb-20">
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
