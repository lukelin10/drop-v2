/**
 * Authentication Hook
 * 
 * This custom hook provides authentication state and user information
 * throughout the application. It uses React Query to fetch the current user
 * from the backend API and determine authentication status.
 * 
 * Usage:
 * const { user, isLoading, isAuthenticated } = useAuth();
 */

import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

/**
 * Hook for accessing authentication state
 * 
 * This hook:
 * - Fetches the current user from the API
 * - Tracks loading state
 * - Determines if the user is authenticated
 * 
 * @returns Authentication state including user data, loading state, and auth status
 */
export function useAuth() {
  // Use React Query to fetch current authenticated user
  // If this fails (401 error), it means the user is not authenticated
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],    // Unique cache key for this query
    retry: false,                    // Don't retry on failure (common for auth endpoints)
  });

  // Return authentication state for use in components
  return {
    user,                           // The user object if authenticated, undefined otherwise
    isLoading,                      // True while the API request is in progress
    isAuthenticated: !!user,        // Boolean flag indicating authentication status
  };
}