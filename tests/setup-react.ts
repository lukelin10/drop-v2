/**
 * React Testing Setup
 * 
 * This file configures the testing environment for React components.
 * It extends jest-dom matchers and sets up global test utilities.
 */

import '@testing-library/jest-dom';

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

// Suppress console warnings in tests unless explicitly needed
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Setup fetch mock reset before each test
beforeEach(() => {
  (global.fetch as jest.Mock).mockClear();
}); 