/**
 * Global Jest Setup - Database Safety System
 * 
 * This file runs BEFORE all tests and provides multiple layers of database protection.
 * Individual tests can override these mocks using enableMocksForAPITests() or manual mocking.
 * 
 * CRITICAL: This prevents any accidental database access during testing.
 */

// ====================================================================
// TYPESCRIPT DECLARATIONS
// ====================================================================

declare global {
  var mockConsoleError: () => void;
  var restoreConsoleError: () => void;
  var mockDatabaseAccessError: (operation: string) => never;
}

// ====================================================================
// GLOBAL DATABASE ACCESS PROTECTION
// ====================================================================

console.log('🛡️  Jest Setup: Activating database access protection...');

// ====================================================================
// GLOBAL DATABASE ACCESS BLOCKING
// ====================================================================

// List of modules that should never be accessed directly in tests
const BLOCKED_DATABASE_MODULES = [
  'server/db',
  'server/DatabaseStorage', 
  'server/storage'
];

// Block each dangerous module with helpful error messages
BLOCKED_DATABASE_MODULES.forEach(modulePath => {
  jest.mock(`../${modulePath}`, () => {
    const moduleName = modulePath.split('/').pop();
    throw new Error(
      `❌ Module '${moduleName}' blocked for safety. ` +
      `For unit tests: import { mockStorage } from '../mocks/mockStorage'. ` +
      `For API tests: use enableMocksForAPITests() from '../setup-server'.`
    );
  });
});

// Mock the entire replitAuth module to avoid openid-client import issues
jest.mock('../server/replitAuth', () => ({
  setupAuth: jest.fn().mockResolvedValue(undefined),
  getSession: jest.fn().mockReturnValue((req: any, res: any, next: any) => next()),
  isAuthenticated: jest.fn().mockImplementation((req: any, res: any, next: any) => {
    // Match the structure that routes expect: req.user.claims.sub
    req.user = { 
      claims: { 
        sub: 'test-user-123' 
      } 
    };
    next();
  })
}));

// ====================================================================
// ENVIRONMENT SAFETY CHECKS
// ====================================================================

// Ensure we're in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test');
}

// Prevent accidental production database usage
if (process.env.DATABASE_URL && process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL cannot be the same as production DATABASE_URL');
}

// ====================================================================
// GLOBAL TEST UTILITIES
// ====================================================================

// Global test timeout (prevent hanging tests)
jest.setTimeout(30000); // 30 seconds

// Mock console.error to prevent spam during expected error tests
const originalConsoleError = console.error;
global.mockConsoleError = () => {
  console.error = jest.fn();
};

global.restoreConsoleError = () => {
  console.error = originalConsoleError;
};

// Cleanup after each test
afterEach(() => {
  // Restore console.error if it was mocked
  if (jest.isMockFunction(console.error)) {
    console.error = originalConsoleError;
  }
});

console.log('✅ Jest Setup: Database protection active. Tests are safe to run.');

// ====================================================================
// HELPFUL ERROR MESSAGES FOR COMMON MISTAKES
// ====================================================================

// Override common database access patterns with helpful errors
global.mockDatabaseAccessError = (operation: string) => {
  console.error(`
🚨 CRITICAL: Database access attempted during testing!

This is blocked for safety to prevent corruption of production data.

✅ SOLUTION - Choose the right approach for your test:

📋 For Unit Tests:
1. Import: import { mockStorage } from '../mocks/mockStorage';
2. Use: mockStorage.getUser.mockResolvedValue(mockUser);
3. Test: Your business logic with mocked data

🌐 For API Tests: 
1. Import: import { enableMocksForAPITests, getTestApp } from '../setup-server';
2. Call: enableMocksForAPITests(); (before other imports)
3. Test: API endpoints with mocked dependencies

📚 Need help? Check tests/TESTING_GUIDE.md for examples!
`);
  throw new Error(`Database ${operation} blocked for safety`);
};

export {}; 