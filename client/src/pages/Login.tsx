import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import dropLogo from "../assets/drop-logo-final.svg";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If already authenticated, redirect to the home page
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-background/90 p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-2">
          <img src={dropLogo} alt="Drop logo" className="h-16 w-16" />
          <h1 className="text-2xl font-bold text-foreground">Welcome to Drop</h1>
          <p className="text-center text-muted-foreground">
            Your personal space for reflection and growth
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Please sign in to continue to your journaling experience
          </p>
          
          <Button 
            onClick={handleLogin} 
            className="w-full"
            size="lg"
          >
            Sign in with Replit
          </Button>
          
          <p className="text-xs text-center text-muted-foreground mt-6">
            Drop helps you reflect on your day with thoughtful prompts and AI-powered guidance
          </p>
        </div>
      </div>
    </div>
  );
}