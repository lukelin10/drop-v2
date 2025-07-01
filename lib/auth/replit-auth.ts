/**
 * Replit Auth Utility Functions
 * 
 * Client-side utility functions for working with Replit Auth integration.
 * These functions provide a clean interface for getting user session data
 * and handling authentication state in the frontend.
 */

import type { UserSessionData } from '../../types/user';

/**
 * Get user session data from the API
 * Fetches the current authenticated user from the backend
 * @returns Promise<UserSessionData | null> - User data if authenticated, null otherwise
 */
export async function getUserSessionData(): Promise<UserSessionData | null> {
  try {
    const response = await fetch('/api/auth/user', {
      method: 'GET',
      credentials: 'include', // Include cookies for session-based auth
    });

    if (!response.ok) {
      // If 401, user is not authenticated
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to fetch user session: ${response.status}`);
    }

    const userData = await response.json();
    
    // Map the user data to our UserSessionData interface
    return {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
    };
  } catch (error) {
    console.error('Error fetching user session data:', error);
    return null;
  }
}

/**
 * Check if the user is currently authenticated
 * @returns Promise<boolean> - True if user is authenticated, false otherwise
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const userData = await getUserSessionData();
  return userData !== null;
}

/**
 * Get user display name from session data
 * Falls back through name hierarchy: name -> firstName lastName -> username -> 'Unknown User'
 * @param sessionData - User session data
 * @returns string - Display name for the user
 */
export function getUserDisplayName(sessionData: UserSessionData): string {
  if (sessionData.firstName && sessionData.lastName) {
    return `${sessionData.firstName} ${sessionData.lastName}`.trim();
  }
  
  if (sessionData.firstName) {
    return sessionData.firstName;
  }
  
  if (sessionData.username) {
    return sessionData.username;
  }
  
  return 'Unknown User';
}

/**
 * Get user initials from session data
 * Used for avatar fallbacks
 * @param sessionData - User session data
 * @returns string - User initials (1-2 characters)
 */
export function getUserInitials(sessionData: UserSessionData): string {
  if (sessionData.firstName && sessionData.lastName) {
    return `${sessionData.firstName[0]}${sessionData.lastName[0]}`.toUpperCase();
  }
  
  if (sessionData.firstName) {
    return sessionData.firstName[0].toUpperCase();
  }
  
  if (sessionData.username) {
    return sessionData.username[0].toUpperCase();
  }
  
  return 'U';
}

/**
 * Initiate logout process
 * Redirects to the backend logout endpoint which handles session cleanup
 * and redirects to Replit's logout endpoint
 */
export function initiateLogout(): void {
  window.location.href = '/api/logout';
}

/**
 * Initiate login process  
 * Redirects to the backend login endpoint which initiates Replit Auth flow
 */
export function initiateLogin(): void {
  window.location.href = '/api/login';
}

/**
 * Validate session and redirect to login if invalid
 * Useful for protected routes that need to ensure authentication
 * @param redirectPath - Optional path to redirect to after login (not implemented in current flow)
 */
export async function validateSessionOrRedirect(redirectPath?: string): Promise<void> {
  const isAuthenticated = await isUserAuthenticated();
  
  if (!isAuthenticated) {
    // In a more advanced implementation, we could store the redirect path
    // and redirect back after successful login
    initiateLogin();
  }
}

/**
 * Get user email from session data
 * @param sessionData - User session data
 * @returns string | null - User email if available
 */
export function getUserEmail(sessionData: UserSessionData): string | null {
  return sessionData.email || null;
}

/**
 * Check if user has a profile image
 * @param sessionData - User session data
 * @returns boolean - True if user has a profile image URL
 */
export function hasProfileImage(sessionData: UserSessionData): boolean {
  return !!(sessionData.profileImageUrl && sessionData.profileImageUrl.trim().length > 0);
} 