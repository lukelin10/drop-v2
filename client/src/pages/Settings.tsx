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

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import dropLogo from "../assets/drop-logo-final.svg";
import type { UserProfile, UserProfileFormData } from "../../../types/user";

function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
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

  /**
   * Fetch user profile data from API
   */
  async function fetchUserProfile() {
    try {
      setIsLoadingProfile(true);
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
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
      toast({
        title: "Profile Load Error",
        description: "Could not load profile data. You can still edit your name.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }

  /**
   * Handle name field changes
   */
  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newName = e.target.value;
    setFormData((prev: UserProfileFormData) => ({ ...prev, name: newName }));
    setHasChanges(true);
    
    // Clear name error when user starts typing
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  }

  /**
   * Validate form data
   */
  function validateForm(): boolean {
    const newErrors: {name?: string; general?: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  /**
   * Handle save changes
   */
  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      setErrors({});

      const response = await fetch('/api/user/update-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: formData.name.trim() }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to save changes' }));
        throw new Error(error.message || 'Failed to save changes');
      }

      setHasChanges(false);
      toast({
        title: "Changes Saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Failed to save changes. Please try again.'
      });
      toast({
        title: "Save Error",
        description: "Could not save your changes. Please try again.",
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
    window.location.href = "/api/logout";
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
      <div className="px-4 py-4 bg-background border-b border-border">
        <div className="max-w-lg mx-auto w-full flex items-center">
          {/* Back button */}
          <button 
            className="flex items-center text-foreground hover:text-primary transition-colors mr-4"
            onClick={handleBack}
            aria-label="Go back"
          >
            <i className="ri-arrow-left-s-line text-2xl"></i>
          </button>
          
          {/* App logo and title */}
          <div className="flex items-center">
            <img src={dropLogo} alt="Drop logo" className="w-6 h-6 mr-3" />
            <h1 className="font-serif text-xl font-medium text-foreground">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
        
        {/* Profile Information Card */}
        <div className="card">
          <CardContent className="p-6">
            <h2 className="font-serif text-lg font-medium text-foreground mb-6">Profile Information</h2>
            
            {isLoadingProfile ? (
              // Skeleton loader for profile data
              <div className="space-y-4">
                <div>
                  <div className="h-4 w-16 bg-muted rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 w-12 bg-muted rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Email Field (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <div className="flex h-10 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {formData.email || 'No email available'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your email is provided by your login provider and cannot be changed here.
                  </p>
                </div>

                {/* Name Field (Editable) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="Enter your name"
                    className={cn(
                      "transition-colors",
                      errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isSaving}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                {/* General Error Message */}
                {errors.general && (
                  <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                    {errors.general}
                  </div>
                )}

                {/* Save Changes Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={cn(
                      "w-full rounded-full py-2.5",
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <i className="ri-loader-4-line mr-2 animate-spin"></i>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Account Actions Card */}
        <div className="card">
          <CardContent className="p-6">
            <h2 className="font-serif text-lg font-medium text-foreground mb-6">Account Actions</h2>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className={cn(
                "w-full rounded-full py-2.5",
                "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
                "transition-colors"
              )}
            >
              <i className="ri-logout-box-line mr-2"></i>
              Log Out
            </Button>
          </CardContent>
        </div>
      </div>
    </section>
  );
}

export default Settings;