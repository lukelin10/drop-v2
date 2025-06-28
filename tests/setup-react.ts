/**
 * React Testing Setup
 * 
 * This file configures the testing environment specifically for React components.
 * It extends jest-dom matchers and sets up browser API mocks needed for jsdom.
 */

import '@testing-library/jest-dom';

// ====================================================================
// BROWSER API MOCKS FOR JSDOM ENVIRONMENT
// ====================================================================

// Mock IntersectionObserver which is not available in jsdom
(global as any).IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver which is not available in jsdom  
(global as any).ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia which is not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo which is not available in jsdom
global.scrollTo = jest.fn();

// Mock fetch for API calls in React components
global.fetch = jest.fn();

// ====================================================================
// REACT-SPECIFIC TEST UTILITIES
// ====================================================================

// Setup fetch mock reset before each test
beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
  
  // Reset scroll mock
  (global.scrollTo as jest.Mock).mockClear();
}); 