import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  testMatch: [
    '**/tests/**/*.test.ts',
    // Exclude React component tests from the main test run
    '!**/client/src/**/*.test.{ts,tsx}'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: true,
    }],
  },
  // Setup files run in order: first jest.setup.ts (global protection), then setup-server.ts (server test utilities)
  setupFilesAfterEnv: [
    '<rootDir>/tests/jest.setup.ts',
    '<rootDir>/tests/setup-server.ts'
  ],
  testTimeout: 15000,
  // Run tests sequentially to avoid database race conditions
  maxWorkers: 1,
  // Ensure tests don't interfere with each other
  forceExit: true,
  detectOpenHandles: true,
};

export default config;