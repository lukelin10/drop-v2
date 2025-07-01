import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import Settings from '../Settings';

// Mock the authentication hook
const mockUseAuth = {
  user: {
    id: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com',
  },
  isLoading: false,
  isAuthenticated: true,
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock the toast hook
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
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

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location for logout
Object.defineProperty(window, 'location', {
  value: {
    href: '',
  },
  writable: true,
});

describe('Settings Page', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    const { hook } = memoryLocation({ path: '/settings', static: true });
    
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <Router hook={hook}>
          {children}
        </Router>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mocks
    Object.assign(mockUseAuth, {
      user: {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
      },
      isLoading: false,
      isAuthenticated: true,
    });
    
    mockNavigate.mockClear();
    mockToast.mockClear();
    (global.fetch as jest.Mock).mockClear();
    
    // Default API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/user/profile')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            id: 'test-user-123',
            email: 'test@example.com',
            name: 'Test User'
          }),
        });
      }
      if (url.includes('/api/user/update-name')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ message: 'Name updated successfully' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });
    });
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<Settings />, { wrapper: createWrapper() });
      expect(container).toBeTruthy();
    });

    it('should render settings page title', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render profile information section', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    it('should render account actions section', () => {
      render(<Settings />, { wrapper: createWrapper() });
      expect(screen.getByText('Account Actions')).toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('should redirect to login when not authenticated', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(<Settings />, { wrapper: createWrapper() });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should show loading state when auth is loading', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: true,
        isAuthenticated: false,
      });

      render(<Settings />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Profile Management', () => {
    it('should fetch user profile on mount', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/profile');
      });
    });

    it('should display email from user profile', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should populate name field with profile data', async () => {
      render(<Settings />, { wrapper: createWrapper() });

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should enable save button when name is changed', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

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

    it('should save name changes successfully', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

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
    });
  });

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      render(<Settings />, { wrapper: createWrapper() });

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it('should redirect to logout API when logout button is clicked', async () => {
      const user = userEvent.setup();
      render(<Settings />, { wrapper: createWrapper() });

      const logoutButton = screen.getByRole('button', { name: /log out/i });
      await user.click(logoutButton);

      expect(window.location.href).toBe('/api/logout');
    });
  });

  describe('Error Handling', () => {
    it('should handle profile fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: jest.fn().mockResolvedValue({}),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({}),
        });
      });

      render(<Settings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile Load Error',
          description: 'Could not load profile data. You can still edit your name.',
          variant: 'destructive',
        });
      });
    });

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/user/profile')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              id: 'test-user-123',
              email: 'test@example.com',
              name: 'Test User'
            }),
          });
        }
        if (url.includes('/api/user/update-name')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: jest.fn().mockResolvedValue({ message: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({}),
        });
      });

      render(<Settings />, { wrapper: createWrapper() });

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
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Save Error',
          description: 'Could not save your changes. Please try again.',
          variant: 'destructive',
        });
      });
    });
  });
}); 