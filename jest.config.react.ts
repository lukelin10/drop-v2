import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
    // Handle CSS imports (stub them out for tests)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle static assets
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/tests/utils/fileMock.js',
  },
  testMatch: [
    '**/client/src/**/__tests__/**/*.test.{ts,tsx}',
    '**/client/src/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: true,
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup-react.ts'],
  testTimeout: 10000,
  // For React tests, we can run in parallel
  maxWorkers: '50%',
  collectCoverageFrom: [
    'client/src/**/*.{ts,tsx}',
    '!client/src/**/*.d.ts',
    '!client/src/main.tsx',
    '!client/src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage-react',
  coverageReporters: ['text', 'lcov', 'html'],
  // Mock modules that don't work well in tests
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};

export default config; 