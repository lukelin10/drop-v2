# Mock Storage Setup for Unit Tests

This directory contains the mock setup for replacing database operations in unit tests with Jest mocks.

## 🎯 **Purpose**

- **Block database access** in unit tests
- **Provide realistic mock data** for testing
- **Speed up test execution** by removing I/O operations
- **Ensure test safety** by preventing accidental data corruption

## 📁 **Files**

- `mockStorage.ts` - Complete mock implementation of the storage service
- `setupMocks.ts` - Easy-to-use mock setup functions
- `mockStorage.test.ts` - Tests verifying the mock functionality
- `README.md` - This documentation

## 🚀 **Quick Start**

### Unit Test Setup

```typescript
// At the top of your test file (before imports)
import { setupUnitTestMocks } from '../mocks/setupMocks';
import { mockStorage } from '../mocks/mockStorage';
import { createMockUser, createMockDrop } from '../factories/testData';

// Setup mocks (call outside describe blocks)
setupUnitTestMocks();

describe('My Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a user', async () => {
    // Arrange: Setup mock return value
    const expectedUser = createMockUser({ id: 'new-user' });
    mockStorage.upsertUser.mockResolvedValue(expectedUser);

    // Act: Call the service
    const result = await myService.createUser({ username: 'testuser' });

    // Assert: Verify behavior
    expect(mockStorage.upsertUser).toHaveBeenCalledWith({ username: 'testuser' });
    expect(result.id).toBe('new-user');
  });
});
```

### API Test Setup

```typescript
import { setupAPITestMocks, getTestApp } from '../mocks/setupMocks';
import { mockStorage } from '../mocks/mockStorage';
import request from 'supertest';

setupAPITestMocks(); // Includes auth, LLM, and storage mocks

describe('API Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    app = await getTestApp(); // Get configured Express app
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle GET /api/users/:id', async () => {
    mockStorage.getUser.mockResolvedValue(createMockUser());
    
    const response = await request(app).get('/api/users/test-user-1');
    
    expect(response.status).toBe(200);
    expect(mockStorage.getUser).toHaveBeenCalledWith('test-user-1');
  });
});
```

## 🛠 **Available Mock Methods**

All storage interface methods are mocked:

### User Methods
```typescript
mockStorage.getUser(id: string)
mockStorage.getUserByUsername(username: string)
mockStorage.upsertUser(userData: InsertUser)
```

### Drop Methods
```typescript
mockStorage.getDrops()
mockStorage.getUserDrops(userId: string)
mockStorage.getDrop(id: number)
mockStorage.createDrop(dropData: InsertDrop)
mockStorage.updateDrop(id: number, updates: Partial<Drop>)
```

### Message Methods
```typescript
mockStorage.getMessages(dropId: number)
mockStorage.createMessage(messageData: InsertMessage)
```

### Question Methods
```typescript
mockStorage.getDailyQuestion()
mockStorage.getQuestions()
mockStorage.createQuestion(questionData: InsertQuestion)
mockStorage.updateQuestion(id: number, updates: Partial<Question>)
```

### Analysis Methods
```typescript
mockStorage.createAnalysis(analysisData: InsertAnalysis, dropIds: number[])
mockStorage.getUserAnalyses(userId: string, limit?: number, offset?: number)
mockStorage.getAnalysis(id: number)
mockStorage.updateAnalysisFavorite(id: number, isFavorited: boolean)
mockStorage.getAnalysisEligibility(userId: string)
mockStorage.getUnanalyzedDrops(userId: string)
mockStorage.getAnalysisDrops(analysisId: number)
```

## 🎭 **Scenario Helpers**

Pre-configured mock setups for common test scenarios:

### Eligible User (8+ drops)
```typescript
import { setupEligibleUserMocks } from '../mocks/mockStorage';

setupEligibleUserMocks('user-id');

// Now getAnalysisEligibility() returns isEligible: true
// And getUnanalyzedDrops() returns 8 drops
```

### Ineligible User (fewer drops)
```typescript
import { setupIneligibleUserMocks } from '../mocks/mockStorage';

setupIneligibleUserMocks('user-id', 5); // User has 5 drops (need 7)

// Now getAnalysisEligibility() returns isEligible: false
// And getUnanalyzedDrops() returns 5 drops
```

### Empty User (no data)
```typescript
import { setupEmptyUserMocks } from '../mocks/mockStorage';

setupEmptyUserMocks('user-id');

// All methods return empty arrays or zero counts
```

### Error Scenarios
```typescript
import { setupStorageErrorMocks } from '../mocks/mockStorage';

setupStorageErrorMocks('getUser', new Error('User not found'));

// Now getUser() will throw the specified error
```

## 🔄 **Mock Management**

### Reset to Default State
```typescript
import { resetStorageMocks } from '../mocks/mockStorage';

beforeEach(() => {
  resetStorageMocks(); // Clear all mocks and restore defaults
});
```

### Custom Mock Responses
```typescript
// Override specific method behavior
mockStorage.createDrop.mockResolvedValue(createMockDrop({ id: 42 }));

// Mock rejection
mockStorage.getUser.mockRejectedValue(new Error('Database error'));

// Mock implementation
mockStorage.updateDrop.mockImplementation(async (id, updates) => {
  return createMockDrop({ id, ...updates });
});
```

## ✅ **Best Practices**

### 1. Always Clear Mocks
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear call history
  // OR
  resetStorageMocks(); // Clear history + restore defaults
});
```

### 2. Use Factory Functions
```typescript
// Good: Use factories for consistent data
const user = createMockUser({ username: 'testuser' });

// Avoid: Manual object creation
const user = { id: 'test', username: 'testuser', /* missing fields */ };
```

### 3. Test Mock Calls
```typescript
// Verify the service called the right method with right parameters
expect(mockStorage.createDrop).toHaveBeenCalledWith({
  userId: 'test-user',
  questionId: 1,
  text: 'Expected text'
});

expect(mockStorage.createDrop).toHaveBeenCalledTimes(1);
```

### 4. Setup Realistic Data
```typescript
// Good: Setup data that matches the test scenario
setupEligibleUserMocks('user-with-enough-drops');

// Avoid: Using defaults that don't match test intent
```

## 🚫 **What's Blocked**

These will throw errors in unit tests:

- Direct `testDb` usage
- `DatabaseStorage` constructor calls
- Direct database imports from `server/db`
- Any real database connections

## 🔍 **Debugging Mock Issues**

### Check Mock Calls
```typescript
console.log(mockStorage.getUser.mock.calls); // See what was called
console.log(mockStorage.getUser.mock.results); // See what was returned
```

### Verify Mock Setup
```typescript
expect(jest.isMockFunction(mockStorage.getUser)).toBe(true);
```

### Test Mock Configuration
```typescript
// Run the mock storage test to verify setup
npm test tests/mocks/mockStorage.test.ts
```

## 📈 **Migration Examples**

### Before: Direct Database Access
```typescript
// OLD - Database access in unit test
beforeEach(async () => {
  await testDb.delete(schema.users);
  await testDb.insert(schema.users).values(userData);
});

test('should find user', async () => {
  const user = await storage.getUser('test-id');
  expect(user).toBeDefined();
});
```

### After: Mocked Storage
```typescript
// NEW - Mocked storage in unit test
import { setupUnitTestMocks } from '../mocks/setupMocks';
import { mockStorage } from '../mocks/mockStorage';

setupUnitTestMocks();

test('should find user', async () => {
  mockStorage.getUser.mockResolvedValue(createMockUser());
  
  const user = await storage.getUser('test-id');
  
  expect(user).toBeDefined();
  expect(mockStorage.getUser).toHaveBeenCalledWith('test-id');
});
```

## 🎯 **Result**

- ✅ **No database connections** in unit tests
- ✅ **Faster test execution** (no I/O operations)
- ✅ **Predictable test data** (no external dependencies)
- ✅ **Safe testing** (no risk of data corruption)
- ✅ **Better test isolation** (each test controls its data) 