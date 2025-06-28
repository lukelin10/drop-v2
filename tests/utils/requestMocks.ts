import { Request, Response } from 'express';
import { TEST_USER_ID } from '../setup-server';

/**
 * Creates a mock Express request object with authentication data
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  // Create a simplified mock request with authentication properties
  const req = {
    // Set the authenticated user with the format expected by the app
    user: {
      claims: { sub: TEST_USER_ID },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    },
    // Mock the isAuthenticated method that Express uses
    isAuthenticated: jest.fn().mockReturnValue(true),
    // Add any additional overrides
    ...overrides
  };
  
  return req;
}

/**
 * Creates a mock Express response object with jest spies
 */
export function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };
  
  return res;
}

/**
 * Create a mock next function for middleware testing
 */
export const createMockNext = jest.fn();

/**
 * Reset all mocks between tests
 */
export function resetMocks() {
  if (jest.isMockFunction(createMockNext)) {
    createMockNext.mockReset();
  }
}