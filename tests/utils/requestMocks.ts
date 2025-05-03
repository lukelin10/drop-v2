import { Request, Response } from 'express';
import { TEST_USER_ID } from '../setup';

/**
 * Creates a mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  interface AuthenticatedRequest extends Request {
    user: {
      claims: { sub: string };
      expires_at: number;
    };
  }
  
  const req: Partial<AuthenticatedRequest> = {
    user: {
      claims: { sub: TEST_USER_ID },
      expires_at: Math.floor(Date.now() / 1000) + 3600
    },
    isAuthenticated: function(this: AuthenticatedRequest): this is AuthenticatedRequest {
      return true;
    },
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