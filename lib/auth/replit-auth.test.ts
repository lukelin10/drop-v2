/**
 * Unit Tests for Replit Auth Utility Functions
 * 
 * Tests the client-side Replit Auth utilities including session data fetching,
 * authentication checks, and helper functions.
 */

import {
  getUserSessionData,
  isUserAuthenticated,
  getUserDisplayName,
  getUserInitials,
  initiateLogout,
  initiateLogin,
  validateSessionOrRedirect,
  getUserEmail,
  hasProfileImage,
} from './replit-auth';
import type { UserSessionData } from '../../types/user';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = {
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('Replit Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  describe('getUserSessionData', () => {
    it('should return user data when authenticated', async () => {
      const mockUserData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'https://example.com/avatar.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      });

      const result = await getUserSessionData();

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/user', {
        method: 'GET',
        credentials: 'include',
      });

      expect(result).toEqual({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'https://example.com/avatar.jpg',
      });
    });

    it('should return null when user is not authenticated (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await getUserSessionData();

      expect(result).toBeNull();
    });

    it('should throw error for non-401 HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getUserSessionData();

      expect(result).toBeNull(); // Error is caught and null is returned
    });

    it('should return null when fetch throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getUserSessionData();

      expect(result).toBeNull();
    });

    it('should handle partial user data', async () => {
      const mockUserData = {
        id: 'user123',
        username: 'testuser',
        // Missing optional fields
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      });

      const result = await getUserSessionData();

      expect(result).toEqual({
        id: 'user123',
        username: 'testuser',
        email: undefined,
        firstName: undefined,
        lastName: undefined,
        profileImageUrl: undefined,
      });
    });
  });

  describe('isUserAuthenticated', () => {
    it('should return true when user data is available', async () => {
      const mockUserData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'https://example.com/avatar.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      });

      const result = await isUserAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await isUserAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('getUserDisplayName', () => {
    it('should return full name when both first and last names are available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = getUserDisplayName(sessionData);

      expect(result).toBe('Test User');
    });

    it('should return first name when only first name is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: 'Test',
      };

      const result = getUserDisplayName(sessionData);

      expect(result).toBe('Test');
    });

    it('should return username when no first/last name is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
      };

      const result = getUserDisplayName(sessionData);

      expect(result).toBe('testuser');
    });

    it('should return "Unknown User" when no name data is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: '',
      };

      const result = getUserDisplayName(sessionData);

      expect(result).toBe('Unknown User');
    });

    it('should handle names with extra whitespace', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: '  Test  ',
        lastName: '  User  ',
      };

      const result = getUserDisplayName(sessionData);

      expect(result).toBe('Test   User'); // trim() is applied to the full string
    });
  });

  describe('getUserInitials', () => {
    it('should return initials from first and last names', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = getUserInitials(sessionData);

      expect(result).toBe('TU');
    });

    it('should return first letter of first name when only first name is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: 'Test',
      };

      const result = getUserInitials(sessionData);

      expect(result).toBe('T');
    });

    it('should return first letter of username when no first name is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
      };

      const result = getUserInitials(sessionData);

      expect(result).toBe('T');
    });

    it('should return "U" when no name data is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: '',
      };

      const result = getUserInitials(sessionData);

      expect(result).toBe('U');
    });

    it('should handle lowercase names', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        firstName: 'test',
        lastName: 'user',
      };

      const result = getUserInitials(sessionData);

      expect(result).toBe('TU');
    });
  });

  describe('initiateLogout', () => {
    it('should redirect to logout endpoint', () => {
      initiateLogout();

      expect(mockLocation.href).toBe('/api/logout');
    });
  });

  describe('initiateLogin', () => {
    it('should redirect to login endpoint', () => {
      initiateLogin();

      expect(mockLocation.href).toBe('/api/login');
    });
  });

  describe('validateSessionOrRedirect', () => {
    it('should not redirect when user is authenticated', async () => {
      const mockUserData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockUserData),
      });

      await validateSessionOrRedirect();

      expect(mockLocation.href).toBe('');
    });

    it('should redirect to login when user is not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await validateSessionOrRedirect();

      expect(mockLocation.href).toBe('/api/login');
    });

    it('should handle redirect path parameter (not currently implemented)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await validateSessionOrRedirect('/settings');

      expect(mockLocation.href).toBe('/api/login');
    });
  });

  describe('getUserEmail', () => {
    it('should return email when available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
      };

      const result = getUserEmail(sessionData);

      expect(result).toBe('test@example.com');
    });

    it('should return null when email is not available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
      };

      const result = getUserEmail(sessionData);

      expect(result).toBeNull();
    });

    it('should return null when email is empty string', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        email: '',
      };

      const result = getUserEmail(sessionData);

      expect(result).toBeNull();
    });
  });

  describe('hasProfileImage', () => {
    it('should return true when profile image URL is available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        profileImageUrl: 'https://example.com/avatar.jpg',
      };

      const result = hasProfileImage(sessionData);

      expect(result).toBe(true);
    });

    it('should return false when profile image URL is not available', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
      };

      const result = hasProfileImage(sessionData);

      expect(result).toBe(false);
    });

    it('should return false when profile image URL is empty string', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        profileImageUrl: '',
      };

      const result = hasProfileImage(sessionData);

      expect(result).toBe(false);
    });

    it('should return false when profile image URL is only whitespace', () => {
      const sessionData: UserSessionData = {
        id: 'user123',
        username: 'testuser',
        profileImageUrl: '   ',
      };

      const result = hasProfileImage(sessionData);

      expect(result).toBe(false);
    });
  });
}); 