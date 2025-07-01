/**
 * Settings Page Component
 * 
 * Account management settings screen following the PRD requirements.
 * Features:
 * - Profile Information Card with email display and editable name field
 * - Account Actions Card with logout functionality
 * - Header with back navigation
 * - Form state management with validation
 * - Loading states and error handling
 */

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import dropLogo from "../assets/drop-logo-final.svg";
import type { UserProfile, UserProfileFormData } from "../../../types/user";
import { initiateLogout } from "../../../lib/auth/replit-auth";

function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  
  // Form state
  const [formData, setFormData] = useState<UserProfileFormData>({
    name: '',
    email: ''
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<{name?: string; general?: string}>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch user profile data
  useEffect(() => {
    if (user && isAuthenticated) {
      fetchUserProfile();
    }
  }, [user, isAuthenticated]);

  // Focus management - focus name input after loading
  useEffect(() => {
    if (!isLoadingProfile && nameInputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isLoadingProfile]);

  // Keyboard event handler for form submission
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow form submission with Ctrl/Cmd + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving]);

  /**
   * Fetch user profile data from API with enhanced error handling
   */
  async function fetchUserProfile() {
    try {
      setIsLoadingProfile(true);
      setErrors({}); // Clear any previous errors
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('/api/user/profile', {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Handle different HTTP error statuses
        if (response.status === 401) {
          // Session expired, redirect to login
          navigate('/login');
          return;
        } else if (response.status === 404) {
          throw new Error('Profile not found. Please try refreshing the page.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again in a few moments.');
        } else {
          throw new Error(`Failed to load profile (${response.status}). Please try again.`);
        }
      }
      
      const profile: UserProfile = await response.json();
      
      setFormData({
        name: profile.name || '',
        email: profile.email || user?.email || ''
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      // Use user data from auth as fallback
      setFormData({
        name: '',
        email: user?.email || ''
      });
      
      // Categorize and handle different types of errors
      let errorMessage = "Could not load profile data. You can still edit your name.";
      let errorTitle = "Profile Load Error";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorTitle = "Connection Timeout";
          errorMessage = "The request took too long. Please check your connection and try again.";
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorTitle = "Connection Error";
          errorMessage = "Please check your internet connection and try again.";
        } else if (error.message.length > 0) {
          errorMessage = error.message;
        }
      }
      
      // Set error state for UI feedback
      setErrors({
        general: errorMessage
      });
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }

  /**
   * Handle name field changes with real-time validation
   */
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value;
    setFormData((prev: UserProfileFormData) => ({ ...prev, name: newName }));
    setHasChanges(true);
    
    // Perform real-time validation
    const validationError = validateNameField(newName);
    setErrors(prev => ({ 
      ...prev, 
      name: validationError,
      // Clear general error when user is actively editing
      general: undefined 
    }));
  }

  /**
   * Validate form data with comprehensive field-level validation
   */
  function validateForm(): boolean {
    const newErrors: {name?: string; general?: string} = {};
    
    // Name validation with multiple rules
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      newErrors.name = 'Name is required';
    } else if (trimmedName.length < 1) {
      newErrors.name = 'Name cannot be empty';
    } else if (trimmedName.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    } else if (/^\s|\s$/.test(formData.name)) {
      newErrors.name = 'Name cannot start or end with spaces';
    } else if (/\s{2,}/.test(trimmedName)) {
      newErrors.name = 'Name cannot contain multiple consecutive spaces';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /**
   * Validate name field in real-time as user types
   */
  function validateNameField(name: string): string | undefined {
    const trimmedName = name.trim();
    
    // Don't show validation errors for empty field while typing
    if (!name) {
      return undefined;
    }
    
    if (name.length > 100) {
      return 'Name must be 100 characters or less';
    }
    
    if (trimmedName.length > 0 && trimmedName.length < 2) {
      return 'Name must be at least 2 characters long';
    }
    
    if (trimmedName && !/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
      return 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    
    if (/^\s|\s$/.test(name)) {
      return 'Name cannot start or end with spaces';
    }
    
    if (/\s{2,}/.test(name)) {
      return 'Name cannot contain multiple consecutive spaces';
    }
    
    return undefined;
  }

  /**
   * Handle save changes with enhanced error handling and retry logic
   */
  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    let retryCount = 0;
    const maxRetries = 2;

    const attemptSave = async (): Promise<void> => {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for save operations
      
      try {
        const response = await fetch('/api/user/update-name', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: formData.name.trim() }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Handle different HTTP error statuses
          if (response.status === 401) {
            // Session expired, redirect to login
            toast({
              title: "Session Expired",
              description: "Please log in again to save your changes.",
              variant: "destructive"
            });
            navigate('/login');
            return;
          } else if (response.status === 400) {
            // Validation error from server
            const errorData = await response.json().catch(() => ({ message: 'Invalid input data' }));
            throw new Error(errorData.message || 'Invalid input. Please check your name and try again.');
          } else if (response.status === 404) {
            throw new Error('User not found. Please refresh the page and try again.');
          } else if (response.status >= 500) {
            // Server error - might be retryable
            throw new Error('Server error. Please try again in a few moments.');
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Failed to save changes' }));
            throw new Error(errorData.message || `Save failed (${response.status}). Please try again.`);
          }
        }

        // Success - update UI state
        setHasChanges(false);
        setErrors({}); // Clear any previous errors
        toast({
          title: "Changes Saved",
          description: "Your profile has been updated successfully.",
        });
        
        // Focus back to name input for better UX
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle network and timeout errors with retry logic
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            if (retryCount < maxRetries) {
              retryCount++;
              toast({
                title: "Connection Timeout",
                description: `Retrying... (${retryCount}/${maxRetries})`,
                variant: "default"
              });
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              return attemptSave();
            } else {
              throw new Error("The save operation timed out. Please check your connection and try again.");
            }
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            if (retryCount < maxRetries) {
              retryCount++;
              toast({
                title: "Connection Error",
                description: `Retrying... (${retryCount}/${maxRetries})`,
                variant: "default"
              });
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
              return attemptSave();
            } else {
              throw new Error("Network error. Please check your internet connection and try again.");
            }
          }
        }
        
        // Re-throw the error if it's not retryable or max retries exceeded
        throw error;
      }
    };

    try {
      setIsSaving(true);
      setErrors({});
      await attemptSave();
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // Categorize error for better user feedback
      let errorMessage = 'Failed to save changes. Please try again.';
      let errorTitle = 'Save Error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        if (error.message.includes('timeout') || error.message.includes('connection')) {
          errorTitle = 'Connection Problem';
        } else if (error.message.includes('Server error')) {
          errorTitle = 'Server Error';
        } else if (error.message.includes('Invalid')) {
          errorTitle = 'Validation Error';
        }
      }
      
      setErrors({
        general: errorMessage
      });
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Handle logout
   */
  function handleLogout() {
    // Use the auth utility function for consistent logout handling
    initiateLogout();
  }

  /**
   * Handle back navigation
   */
  function handleBack() {
    navigate("/");
  }

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-foreground">
        <div className="text-center">
          <i className="ri-loader-4-line text-2xl animate-spin mb-2"></i>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <section className="flex flex-col min-h-screen bg-background">
      {/* Header with Back Button and Title */}
      <div className="px-4 py-3 sm:py-4 bg-background border-b border-border">
        <div className="max-w-lg mx-auto w-full flex items-center">
          {/* Back button */}
          <button 
            className="flex items-center text-foreground hover:text-primary transition-colors mr-3 sm:mr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md p-1 -ml-1"
            onClick={handleBack}
            aria-label="Go back to home page"
            type="button"
          >
            <i className="ri-arrow-left-s-line text-xl sm:text-2xl" aria-hidden="true"></i>
          </button>
          
          {/* App logo and title */}
          <div className="flex items-center min-w-0 flex-1">
            <img src={dropLogo} alt="Drop logo" className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0" />
            <h1 className="font-serif text-lg sm:text-xl font-medium text-foreground truncate">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Profile Information Card */}
        <div className="card" role="region" aria-labelledby="profile-heading">
          <CardContent className="p-4 sm:p-6">
            <h2 id="profile-heading" className="font-serif text-base sm:text-lg font-medium text-foreground mb-4 sm:mb-6">Profile Information</h2>
            
            {isLoadingProfile ? (
              // Skeleton loader for profile data
              <div className="space-y-4">
                <div>
                  <div className="h-3 sm:h-4 w-12 sm:w-16 bg-muted rounded mb-2 animate-pulse"></div>
                  <div className="h-9 sm:h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-3 sm:h-4 w-10 sm:w-12 bg-muted rounded mb-2 animate-pulse"></div>
                  <div className="h-9 sm:h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
                {/* Email Field (Read-only) */}
                <div>
                  <label 
                    htmlFor="email-display" 
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Email
                  </label>
                  <div 
                    id="email-display"
                    className="flex h-9 sm:h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground break-all sm:break-normal"
                    role="textbox"
                    aria-readonly="true"
                    aria-describedby="email-description"
                  >
                    {formData.email || 'No email available'}
                  </div>
                  <p id="email-description" className="text-xs text-muted-foreground mt-1">
                    Your email is provided by your login provider and cannot be changed here.
                  </p>
                </div>

                {/* Name Field (Editable) */}
                <div>
                  <label 
                    htmlFor="name-input" 
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Name
                  </label>
                  <Input
                    ref={nameInputRef}
                    id="name-input"
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Enter your name"
                    className={cn(
                      "h-9 sm:h-10 transition-colors focus:ring-2 focus:ring-primary",
                      errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isSaving}
                    aria-describedby={errors.name ? "name-error" : "name-description"}
                    aria-invalid={!!errors.name}
                    maxLength={100}
                    autoComplete="name"
                    onKeyDown={(e) => {
                      // Allow Enter key to save when there are changes
                      if (e.key === 'Enter' && hasChanges && !isSaving) {
                        handleSave();
                      }
                    }}
                  />
                  {errors.name && (
                    <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
                      {errors.name}
                    </p>
                  )}
                  {!errors.name && (
                    <p id="name-description" className="text-xs text-muted-foreground mt-1">
                      Enter your display name (2-100 characters)
                    </p>
                  )}
                </div>

                {/* General Error Message with Enhanced Error States */}
                {errors.general && (
                  <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                    <div className="flex items-start space-x-2">
                      <i className="ri-error-warning-line text-destructive mt-0.5 flex-shrink-0"></i>
                      <div>
                        <p className="font-medium">Error</p>
                        <p className="text-sm opacity-90">{errors.general}</p>
                        {errors.general.includes('Server error') && (
                          <p className="text-xs mt-1 opacity-75">
                            This is usually temporary. Please try again in a few moments.
                          </p>
                        )}
                        {errors.general.includes('connection') && (
                          <p className="text-xs mt-1 opacity-75">
                            Please check your internet connection and try again.
                          </p>
                        )}
                        {errors.general.includes('timeout') && (
                          <p className="text-xs mt-1 opacity-75">
                            The operation took too long. Please try again with a better connection.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Changes Button */}
                <div className="pt-2 sm:pt-3">
                  <Button
                    ref={saveButtonRef}
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={cn(
                      "w-full rounded-full py-2.5 sm:py-3 text-sm sm:text-base",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      "touch-manipulation" // Better touch targets on mobile
                    )}
                    type="button"
                    aria-describedby="save-button-description"
                  >
                    {isSaving ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin text-base sm:text-lg" aria-hidden="true"></i>
                        <span>Saving...</span>
                        <span className="sr-only">Saving your changes, please wait</span>
                      </>
                    ) : (
                      <>
                        <span>Save Changes</span>
                        {!hasChanges && (
                          <span className="sr-only">No changes to save</span>
                        )}
                      </>
                    )}
                  </Button>
                  {!hasChanges && !isSaving && (
                    <p id="save-button-description" className="text-xs text-muted-foreground mt-1 text-center">
                      Make changes to your name to enable saving
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Account Actions Card */}
        <div className="card" role="region" aria-labelledby="account-actions-heading">
          <CardContent className="p-4 sm:p-6">
            <h2 id="account-actions-heading" className="font-serif text-base sm:text-lg font-medium text-foreground mb-4 sm:mb-6">Account Actions</h2>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className={cn(
                "w-full rounded-full py-2.5 sm:py-3 text-sm sm:text-base",
                "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
                "transition-colors focus:ring-2 focus:ring-destructive focus:ring-offset-2",
                "touch-manipulation" // Better touch targets on mobile
              )}
              type="button"
              aria-describedby="logout-description"
            >
              <i className="ri-logout-box-line mr-2 text-base sm:text-lg" aria-hidden="true"></i>
              <span>Log Out</span>
            </Button>
            <p id="logout-description" className="text-xs text-muted-foreground mt-2 text-center">
              This will end your current session and redirect you to the login page
            </p>
          </CardContent>
        </div>
      </div>
    </section>
  );
}

export default Settings;