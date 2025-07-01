/**
 * Settings test using React.createElement instead of JSX
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Settings from '../Settings';

// Mock the authentication hook
const mockUseAuth = {
  user: { id: 'test', email: 'test@example.com' },
  isLoading: false,
  isAuthenticated: true,
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock navigation  
const mockNavigate = jest.fn();
jest.mock('wouter', () => ({
  useLocation: () => ['/settings', mockNavigate],
  Router: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch
global.fetch = jest.fn();

// Mock SVG imports
jest.mock('../assets/drop-logo-final.svg', () => 'mocked-svg');

describe('Settings Page Tests', () => {
  // Create wrapper using React.createElement
  function createWrapper() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    return function TestWrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children
      );
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
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
            id: 'test',
            email: 'test@example.com',
            name: 'Test User'
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });
    });
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );
      expect(container).toBeTruthy();
    });

    it('should render settings page title', async () => {
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );
      
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    it('should render profile information section', async () => {
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );
      
      await waitFor(() => {
        expect(screen.getByText('Profile Information')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should redirect when not authenticated', () => {
      Object.assign(mockUseAuth, {
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });

      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Profile Management', () => {
    it('should fetch user profile on mount', async () => {
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/user/profile');
      });
    });

    it('should display user email', async () => {
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('should populate name input field', async () => {
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Test User');
        expect(nameInput).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should enable save button when name changes', async () => {
      const user = userEvent.setup();
      
      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

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
  });

  describe('Error Handling', () => {
    it('should handle profile fetch errors', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({}),
        });
      });

      render(
        React.createElement(Settings),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Profile Load Error',
          description: 'Could not load profile data. You can still edit your name.',
          variant: 'destructive',
        });
      });
    });
  });
}); 