/**
 * Settings Page Component Unit Tests
 * 
 * Tests the Settings page React component business logic and user interactions.
 * Uses mocked APIs and hooks to ensure no database connections and fast test execution.
 * Follows the mock-first testing strategy with comprehensive scenario coverage.
 */

// Setup React testing environment
import '../setup-react';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Settings from '../../client/src/pages/Settings';
import type { UserProfile } from '../../types/user';
import { createMockUser } from '../factories/testData';

// ====================================================================
// MOCK SETUP
// ====================================================================

// Mock the authentication hook
const mockUseAuth = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
};

jest.mock('../../client/src/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('wouter', () => ({
  ...jest.requireActual('wouter'),
  useLocation: () => ['/settings', mockNavigate],
}));

// Mock fetch globally for API calls
global.fetch = jest.fn();

// Mock window.location.href for logout
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

// ====================================================================
// TEST DATA FACTORIES
// ====================================================================

const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  ...overrides,
});

const createMockApiResponse = (data: any, status: number = 200, ok: boolean = true) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
});

// ====================================================================
// TEST WRAPPER
// ====================================================================

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Settings Page Component Unit Tests', () => {
  const testUser = createMockUser({ id: 'test-user-123', email: 'test@example.com' });
  const testProfile = createMockUserProfile();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks to default state
    Object.assign(mockUseAuth, {
      user: testUser,
      isLoading: false,
      isAuthenticated: true,
    });
    
    mockNavigate.mockClear();
    mockToast.mockClear();
    (global.fetch as jest.Mock).mockClear();
    
    // Default successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes('/api/user/profile')) {
        return Promise.resolve(createMockApiResponse(testProfile));
      }
      if (url.includes('/api/user/update-name')) {
        return Promise.resolve(createMockApiResponse({ message: 'Name updated successfully' }));
      }
      return Promise.resolve(createMockApiResponse({}));
    });
  });

  describe('Authentication and Loading States', () => {
    it('should show loading state when auth is loading', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /loading/i })).toHaveClass('animate-spin');
    });

    it('should redirect to login when not authenticated', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should not render content when not authenticated', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      const { container } = render(<Settings />, { wrapper: createTestWrapper() });

      expect(container.firstChild).toBeNull();
    });

    it('should render settings page when authenticated', () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
      expect(screen.getByText('Account Actions')).toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render header with back button and title', () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      const backButton = screen.getByRole('button', { name: /go back/i });
      const title = screen.getByText('Settings');
      const logo = screen.getByAltText('Drop logo');

      expect(backButton).toBeInTheDocument();
      expect(title).toBeInTheDocument();
      expect(logo).toBeInTheDocument();
    });

    it('should navigate back when back button is clicked', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      const backButton = screen.getByRole('button', { name: /go back/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Profile Information Loading', () => {
    it('should show skeleton loaders while fetching profile', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      // Should show skeletons initially
      const skeletons = screen.getAllByText('', { selector: '.animate-pulse' });
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should fetch user profile on mount', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/profile');
      });
    });

    it('should populate form with fetched profile data', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const emailDisplay = screen.getByText('test@example.com');
        const nameInput = screen.getByDisplayValue('Test User');
        
        expect(emailDisplay).toBeInTheDocument();
        expect(nameInput).toBeInTheDocument();
      });
    });

    it('should use fallback data when profile fetch fails', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve(createMockApiResponse({}, 500, false));
        }
        return Promise.resolve(createMockApiResponse({}));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile Load Error',
          description: 'Could not load profile data. You can still edit your name.',
          variant: 'destructive'
        });
      });

      await waitFor(() => {
        const emailDisplay = screen.getByText('test@example.com'); // From auth user
        expect(emailDisplay).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('should enable save button when name is changed', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      expect(saveButton).not.toBeDisabled();
    });

    it('should disable save button when no changes made', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save changes/i });
        expect(saveButton).toBeDisabled();
      });
    });

    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      // Clear name to trigger validation error
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      // Start typing to clear error
      await user.type(nameInput, 'N');

      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty name', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });

      // Should not call API
      expect(global.fetch).not.toHaveBeenCalledWith('/api/user/update-name', expect.any(Object));
    });

    it('should show validation error for whitespace-only name', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, '   ');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    it('should highlight name input with error styling when validation fails', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(nameInput).toHaveClass('border-destructive');
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save name changes successfully', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/update-name', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Updated Name' }),
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Changes Saved',
          description: 'Your profile has been updated successfully.',
        });
      });

      // Save button should be disabled again after successful save
      expect(saveButton).toBeDisabled();
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/update-name')) {
          return new Promise(resolve => 
            setTimeout(() => resolve(createMockApiResponse({ message: 'Success' })), 100)
          );
        }
        return Promise.resolve(createMockApiResponse(testProfile));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByRole('generic', { name: /loading/i })).toHaveClass('animate-spin');

      // Name input should be disabled while saving
      expect(nameInput).toBeDisabled();
    });

    it('should trim whitespace from name before saving', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, '  Trimmed Name  ');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/update-name', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'Trimmed Name' }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors during save', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/update-name')) {
          return Promise.resolve(createMockApiResponse({ message: 'Server error' }, 500, false));
        }
        return Promise.resolve(createMockApiResponse(testProfile));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save Error',
          description: 'Could not save your changes. Please try again.',
          variant: 'destructive'
        });
      });
    });

    it('should handle network errors during save', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/update-name')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(createMockApiResponse(testProfile));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle malformed API response during save', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/update-name')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.reject(new Error('Invalid JSON')),
          });
        }
        return Promise.resolve(createMockApiResponse(testProfile));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to save changes. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveTextContent('Log Out');
    });

    it('should redirect to logout API when logout button is clicked', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      await user.click(logoutButton);

      expect(window.location.href).toBe('/api/logout');
    });

    it('should style logout button as destructive', () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      expect(logoutButton).toHaveClass('border-destructive', 'text-destructive');
    });
  });

  describe('Email Display', () => {
    it('should display email as read-only', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const emailLabel = screen.getByText('Email');
        const emailDisplay = screen.getByText('test@example.com');
        const emailHelpText = screen.getByText(/your email is provided by your login provider/i);

        expect(emailLabel).toBeInTheDocument();
        expect(emailDisplay).toBeInTheDocument();
        expect(emailHelpText).toBeInTheDocument();
      });
    });

    it('should show fallback text when no email is available', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve(createMockApiResponse({ ...testProfile, email: null }));
        }
        return Promise.resolve(createMockApiResponse({}));
      });

      Object.assign(mockUseAuth, {
        user: { ...testUser, email: undefined },
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No email available')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      const backButton = screen.getByRole('button', { name: /go back/i });
      expect(backButton).toHaveAttribute('aria-label', 'Go back');
    });

    it('should have proper form labels', async () => {
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const emailLabel = screen.getByLabelText('Email');
        const nameLabel = screen.getByLabelText('Name');

        expect(emailLabel).toBeInTheDocument();
        expect(nameLabel).toBeInTheDocument();
      });
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Name is required');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-destructive');
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply max-width constraint', () => {
      const { container } = render(<Settings />, { wrapper: createTestWrapper() });
      
      const mainContent = container.querySelector('.max-w-lg');
      expect(mainContent).toBeInTheDocument();
    });

    it('should center content horizontally', () => {
      const { container } = render(<Settings />, { wrapper: createTestWrapper() });
      
      const centeredContent = container.querySelector('.mx-auto');
      expect(centeredContent).toBeInTheDocument();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete user flow: load, edit, save, success', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createTestWrapper() });

      // 1. Load profile data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/profile');
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // 2. Edit name
      const nameInput = screen.getByDisplayValue('Test User');
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');

      // 3. Save changes
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
      await user.click(saveButton);

      // 4. Verify API call and success state
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/update-name', expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'New Name' }),
        }));
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Changes Saved',
          description: 'Your profile has been updated successfully.',
        });
      });

      expect(saveButton).toBeDisabled();
    });

    it('should handle user flow with profile load error and recovery', async () => {
      const user = userEvent.setup();
      
      // Mock profile fetch failure, but allow name update to succeed
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve(createMockApiResponse({}, 500, false));
        }
        if (url.includes('/api/user/update-name')) {
          return Promise.resolve(createMockApiResponse({ message: 'Success' }));
        }
        return Promise.resolve(createMockApiResponse({}));
      });

      render(<Settings />, { wrapper: createTestWrapper() });

      // 1. Profile load fails, shows error, uses fallback data
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile Load Error',
          description: 'Could not load profile data. You can still edit your name.',
          variant: 'destructive'
        });
      });

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // 2. User can still edit name (starts with empty string due to load failure)
      const nameInput = screen.getByPlaceholderText('Enter your name');
      await user.type(nameInput, 'Recovery Name');

      // 3. Save works despite profile load failure
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/update-name', expect.objectContaining({
          body: JSON.stringify({ name: 'Recovery Name' }),
        }));
      });
    });
  });
}); 