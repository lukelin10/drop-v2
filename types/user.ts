/**
 * User Profile Type Definitions
 * 
 * TypeScript interfaces and types for user profile data structures
 * used throughout the settings screen and user management features.
 */

import type { User } from '../shared/schema';

/**
 * User Profile Data for Settings Screen
 * Represents the user profile information displayed and editable in settings
 */
export interface UserProfile {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * User Profile Update Request
 * Data structure for updating user profile information
 */
export interface UserProfileUpdateRequest {
  name: string;
}

/**
 * User Profile Update Response
 * Response structure when updating user profile
 */
export interface UserProfileUpdateResponse {
  message: string;
  user: UserProfile;
}

/**
 * User Profile Form Data
 * Form state structure for settings screen form management
 */
export interface UserProfileFormData {
  name: string;
  email: string; // Read-only from Replit Auth
}

/**
 * User Profile Form State
 * Extended form state with validation and UI state
 */
export interface UserProfileFormState extends UserProfileFormData {
  isLoading: boolean;
  isSubmitting: boolean;
  hasChanges: boolean;
  errors: UserProfileFormErrors;
}

/**
 * User Profile Form Validation Errors
 * Error state structure for form validation
 */
export interface UserProfileFormErrors {
  name?: string;
  general?: string;
}

/**
 * User Session Data
 * User information from Replit Auth session
 */
export interface UserSessionData {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

/**
 * API Response Types
 */

/**
 * User Profile API Response
 * Response structure from GET /api/user/profile
 */
export interface UserProfileApiResponse extends UserProfile {}

/**
 * User Profile Update API Response
 * Response structure from PUT /api/user/update-name
 */
export interface UserProfileUpdateApiResponse extends UserProfileUpdateResponse {}

/**
 * API Error Response
 * Standard error response structure
 */
export interface ApiErrorResponse {
  message: string;
  errors?: Record<string, any>;
}

/**
 * Type Guards
 */

/**
 * Type guard to check if a value is a valid UserProfile
 */
export function isUserProfile(value: unknown): value is UserProfile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UserProfile).id === 'string' &&
    typeof (value as UserProfile).username === 'string'
  );
}

/**
 * Type guard to check if a value is a valid UserProfileUpdateRequest
 */
export function isUserProfileUpdateRequest(value: unknown): value is UserProfileUpdateRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as UserProfileUpdateRequest).name === 'string' &&
    (value as UserProfileUpdateRequest).name.trim().length > 0
  );
}

/**
 * Utility Types
 */

/**
 * User Profile Display Name
 * Utility to get display name from user profile
 */
export type UserDisplayName = string;

/**
 * User Profile Editable Fields
 * Fields that can be edited in the settings screen
 */
export type UserProfileEditableFields = Pick<UserProfile, 'name'>;

/**
 * User Profile Read-Only Fields
 * Fields that are read-only in the settings screen
 */
export type UserProfileReadOnlyFields = Pick<UserProfile, 'email' | 'username' | 'createdAt'>;

/**
 * Utility Functions
 */

/**
 * Get display name from user profile
 * Returns name if available, otherwise falls back to username
 */
export function getUserDisplayName(profile: UserProfile): UserDisplayName {
  return profile.name || profile.username || 'Unknown User';
}

/**
 * Check if user profile has changes
 * Compares current form data with original profile data
 */
export function hasProfileChanges(
  original: UserProfile,
  current: UserProfileFormData
): boolean {
  return original.name !== current.name;
}

/**
 * Create form data from user profile
 * Converts UserProfile to UserProfileFormData for form initialization
 */
export function createFormDataFromProfile(profile: UserProfile): UserProfileFormData {
  return {
    name: profile.name || '',
    email: profile.email || '',
  };
}

/**
 * Create initial form state
 * Creates initial UserProfileFormState for form initialization
 */
export function createInitialFormState(profile: UserProfile): UserProfileFormState {
  const formData = createFormDataFromProfile(profile);
  
  return {
    ...formData,
    isLoading: false,
    isSubmitting: false,
    hasChanges: false,
    errors: {},
  };
} 