/**
 * Authentication Protection Component
 * 
 * This component acts as a guard for protected routes, ensuring that users
 * are authenticated before accessing certain parts of the application.
 * 
 * Behavior:
 * - Shows a loading screen during authentication check
 * - Redirects to login page if not authenticated
 * - Renders children only when authenticated
 */

import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter"; // For navigation/redirection
import { useAuth } from "@/hooks/useAuth"; // Custom authentication hook
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Props for the AuthRequired component
 * @property children - The content to render when authenticated
 */
interface AuthRequiredProps {
  children: ReactNode;
}

/**
 * A component that protects routes requiring authentication
 * 
 * Wrapping a component or route with AuthRequired ensures that
 * only authenticated users can access it.
 * 
 * @param children - Content to render when the user is authenticated
 */
export function AuthRequired({ children }: AuthRequiredProps) {
  // Get authentication state from our custom hook
  const { isAuthenticated, isLoading } = useAuth();
  // Get the navigation function from wouter
  const [, setLocation] = useLocation();

  /**
   * Effect to handle redirection
   * 
   * If the user is not authenticated and not in the process of authenticating,
   * redirect them to the login page.
   */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // If not authenticated and not loading, redirect to login page
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Don't render anything while redirecting to login
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}