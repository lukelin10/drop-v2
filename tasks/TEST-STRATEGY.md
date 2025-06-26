# Test Strategy Document

## Overview
This document outlines a simplified, comprehensive testing strategy for the Drop application, focusing on maintainability, safety, and clear separation of concerns.

## Current State Analysis

### 🔍 What We Found
After analyzing the existing test structure, we identified:

**Strengths:**
- Robust database safety measures with `TEST_DATABASE_URL` requirements
- Good coverage of critical workflows (analysis creation, API endpoints)
- Proper mocking of external dependencies (Anthropic API)
- Clear test environment setup with proper isolation

**Areas for Improvement:**
- **Test Organization**: Mixed responsibilities across test types
- **Duplication**: Similar setup patterns repeated across files  
- **Complexity**: Over-engineered test structures for simple features
- **Location Inconsistency**: Tests scattered between `/tests` and component `__tests__` folders

## 🎯 New Simplified Test Strategy

### Test Hierarchy (Priority Order)
1. **Unit Tests** (80% of tests) - Fast, isolated, focused
2. **Integration Tests** (15% of tests) - Component interactions  
3. **E2E Tests** (5% of tests) - Critical user workflows only

### File Organization Structure

```
tests/
├── unit/                          # Isolated function/component tests
│   ├── services/                  # Business logic tests
│   ├── components/                # React component tests
│   ├── hooks/                     # Custom hook tests
│   └── utils/                     # Utility function tests
├── integration/                   # Multi-component interaction tests
│   ├── api/                       # API endpoint tests
│   ├── workflows/                 # User workflow tests
│   └── database/                  # Database operation tests
├── e2e/                          # End-to-end critical path tests
├── shared/                       # Test utilities and helpers
│   ├── setup.ts                  # Global test configuration
│   ├── fixtures.ts               # Test data factories
│   ├── mocks.ts                  # Shared mock implementations
│   └── helpers.ts                # Test utility functions
└── config/                       # Test configuration files
    ├── jest.unit.config.ts
    ├── jest.integration.config.ts
    └── jest.e2e.config.ts
```

## 🧪 Test Categories & Guidelines

### Unit Tests
**Purpose**: Test individual functions, components, and hooks in complete isolation

**Guidelines:**
- Mock ALL external dependencies
- Focus on single responsibility
- Fast execution (< 10ms per test)
- No database connections
- No network calls

**Examples:**
```typescript
// ✅ Good Unit Test
describe('formatAnalysisContent', () => {
  it('should format bullet points correctly', () => {
    const input = '• Point 1\n• Point 2';
    const result = formatAnalysisContent(input);
    expect(result).toBe('<ul><li>Point 1</li><li>Point 2</li></ul>');
  });
});

// ✅ Good Component Unit Test  
describe('AnalysisCard', () => {
  it('should render analysis summary', () => {
    const mockAnalysis = { summary: 'Test Summary' };
    render(<AnalysisCard analysis={mockAnalysis} />);
    expect(screen.getByText('Test Summary')).toBeInTheDocument();
  });
});
```

### Integration Tests
**Purpose**: Test multiple components working together, API endpoints, database operations

**Guidelines:**
- Use real database (TEST_DATABASE_URL)
- Mock external APIs only
- Test realistic data flows
- Include error scenarios

**Examples:**
```typescript
// ✅ Good Integration Test
describe('Analysis API', () => {
  it('should create analysis when user has sufficient drops', async () => {
    await createTestDrops(7);
    const response = await request(app)
      .post('/api/analyses')
      .expect(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### E2E Tests
**Purpose**: Test complete user workflows from browser perspective

**Guidelines:**
- Only for critical user paths
- Real browser interactions
- Full application stack
- Minimal mocking

## 🛡️ Safety First Principles

### Database Safety (CRITICAL)
```typescript
// ALWAYS validate test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests must run in test environment');
}

// ALWAYS use separate test database
if (!process.env.TEST_DATABASE_URL?.includes('test')) {
  throw new Error('TEST_DATABASE_URL must contain "test"');
}
```

### Mock External Services
```typescript
// ✅ Good: Mock external APIs
jest.mock('@/services/anthropic', () => ({
  generateAnalysis: jest.fn().mockResolvedValue({
    summary: 'Mock analysis',
    content: 'Mock content'
  })
}));
```

## 📋 Testing Checklist

### Before Writing Tests
- [ ] Determine test type needed (unit/integration/e2e)
- [ ] Identify what to mock vs. what to test
- [ ] Choose appropriate queries (prefer `getByRole`)
- [ ] Plan for both success and error scenarios

### Component Testing Priority
1. **User Interactions** - How users actually use the component
2. **Accessibility** - Screen readers, keyboard navigation
3. **Error States** - Loading, error, empty states
4. **Edge Cases** - Boundary conditions

### Query Priority (React Testing Library)
1. `getByRole` - Always prefer accessible queries
2. `getByLabelText` - For form inputs  
3. `getByText` - For static content
4. `getByTestId` - ONLY as last resort

## 🎯 Implementation Plan

### Phase 1: Foundation (Week 1)
- [ ] Create new test structure directories
- [ ] Move shared utilities to `/tests/shared/`
- [ ] Set up separate Jest configs for each test type
- [ ] Create test data factories in `fixtures.ts`

### Phase 2: Unit Tests (Week 2)
- [ ] Migrate utility function tests
- [ ] Create isolated component tests
- [ ] Add service layer unit tests
- [ ] Test custom hooks independently

### Phase 3: Integration Tests (Week 3)
- [ ] Consolidate API endpoint tests
- [ ] Create workflow integration tests
- [ ] Test database operations
- [ ] Add error handling scenarios

### Phase 4: E2E Tests (Week 4)
- [ ] Identify critical user paths
- [ ] Set up browser testing environment
- [ ] Create minimal E2E test suite
- [ ] Add CI/CD integration

## 🔧 Configuration Examples

### Jest Unit Config
```typescript
// jest.unit.config.ts
export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/unit/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/tests/shared/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Jest Integration Config  
```typescript
// jest.integration.config.ts
export default {
  testEnvironment: 'node',
  testMatch: ['**/integration/**/*.test.{ts,tsx}'],
  setupFilesAfterEnv: ['<rootDir>/tests/shared/setup.ts'],
  globalSetup: '<rootDir>/tests/shared/database-setup.ts'
};
```

## 📊 Success Metrics

### Coverage Targets
- **Unit Tests**: 90%+ coverage for business logic
- **Integration Tests**: 100% coverage for API endpoints  
- **E2E Tests**: 100% coverage for critical user paths

### Performance Targets
- **Unit Tests**: < 10ms per test
- **Integration Tests**: < 500ms per test
- **E2E Tests**: < 30 seconds per test

### Quality Indicators
- All tests pass consistently
- No flaky tests
- Clear, descriptive test names
- Proper error messages
- Fast feedback loop

## 🚀 Getting Started

1. **Read the Safety Guide**: Review `TEST-SAFETY-README.md` 
2. **Set Environment**: Ensure `NODE_ENV=test` and proper `TEST_DATABASE_URL`
3. **Choose Test Type**: Start with unit tests for new features
4. **Follow Patterns**: Use examples in this document
5. **Ask for Review**: Get feedback on test structure before expanding

---

**Remember**: Good tests are simple, fast, and reliable. When in doubt, prefer unit tests over integration tests, and integration tests over E2E tests. 