/**
 * Minimal Settings test to debug JSX compilation issue
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Settings from '../Settings';

// Mock the authentication hook first
const mockUseAuth = {
  user: { id: 'test', email: 'test@example.com' },
  isLoading: false,
  isAuthenticated: true,
};

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Mock navigation  
jest.mock('wouter', () => ({
  useLocation: () => ['/settings', jest.fn()],
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'test', email: 'test@example.com', name: 'Test' }),
  })
) as jest.Mock;

describe('Settings minimal test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should render', () => {
    render(<Settings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
}); 