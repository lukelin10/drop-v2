# Unit Testing Strategy: Core Daily Loop Flow

## 🎯 **Overview**

This document outlines a **simple, maintainable** unit testing strategy for the core daily loop functionality of the Drop application. The strategy is designed for junior developers and emphasizes **copying existing patterns** rather than creating new infrastructure.

**Key Principle**: Copy working test files, update the names, and extend existing infrastructure. This approach ensures consistency and reduces complexity.

## 📋 **Core Daily Loop Components**

### **1. Daily Question Presentation**
- **Service**: `DatabaseStorage.getDailyQuestion()`
- **Hook**: `useDrops.dailyQuestion`
- **Component**: `DailyDrop`
- **API**: `GET /api/daily-question`

### **2. User Answer Submission**
- **Service**: `DatabaseStorage.createDrop()`
- **Hook**: `useDrops.answerDailyQuestion()`
- **Component**: `DailyDrop` form submission
- **API**: `POST /api/drops`

### **3. AI Chat Functionality**
- **Service**: `generateResponse()` from Anthropic service
- **Hook**: `useMessages`
- **Component**: `Chat`
- **API**: `POST /api/messages`, `GET /api/drops/:id/messages`

### **4. Historic Posts Feed**
- **Service**: `DatabaseStorage.getUserDrops()`
- **Hook**: `useDrops.drops`
- **Component**: `Feed`
- **API**: `GET /api/drops`

### **5. Success/Congratulations State**
- **Service**: `useDrops.hasAnsweredTodaysQuestion()`
- **Component**: `DailyDropSuccess`
- **Logic**: Date-based question completion checking

---

## 📝 **Detailed Test Plans**

### **A. Core Daily Loop Unit Tests** [DONE]

#### **A1. Daily Question Business Logic Tests**
**File**: `tests/unit/dailyQuestion.test.ts`

```typescript
/**
 * Daily Question Business Logic Unit Tests
 * 
 * Tests daily question logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

describe('Daily Question Business Logic Unit Tests', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Question Selection Logic', () => {
    test('should return the same question for the same day')
    test('should advance to next question on different days')
    test('should handle no active questions gracefully')
    test('should update question usage statistics')
    test('should cycle through questions when all are used')
    test('should handle database errors gracefully')
  })

  describe('Question Display Logic', () => {
    test('should format question correctly')
    test('should handle loading states')
    test('should handle question rotation')
  })
})
```

#### **A2. Drop Creation Business Logic Tests**
**File**: `tests/unit/dropCreation.test.ts`

```typescript
/**
 * Drop Creation Business Logic Unit Tests
 * 
 * Tests drop creation logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

describe('Drop Creation Business Logic Unit Tests', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Drop Creation Logic', () => {
    test('should create drop with valid data')
    test('should link drop to correct question')
    test('should set correct user ID')
    test('should generate initial AI response asynchronously')
    test('should update user drop cache')
  })
  
  describe('Validation Logic', () => {
    test('should handle missing question gracefully')
    test('should validate required fields')
    test('should prevent empty submissions')
  })

  describe('Daily Question Integration', () => {
    test('should detect when user answered today')
    test('should handle multiple answers same day')
    test('should work across timezone boundaries')
    test('should handle question changes mid-day')
  })
})
```

#### **A3. Message and Conversation Logic Tests**
**File**: `tests/unit/messageConversation.test.ts`

```typescript
/**
 * Message and Conversation Business Logic Unit Tests
 * 
 * Tests message and conversation logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

describe('Message and Conversation Business Logic Unit Tests', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Message Creation Logic', () => {
    test('should create user message')
    test('should create AI message')
    test('should maintain message order')
    test('should handle empty messages')
  })
  
  describe('Conversation Flow Logic', () => {
    test('should retrieve messages for drop')
    test('should format conversation history for AI')
    test('should handle conversation limits')
    test('should track message counts')
    test('should calculate exchanges correctly')
  })

  describe('AI Integration Logic', () => {
    test('should generate contextual response')
    test('should include conversation history')
    test('should handle API key missing')
    test('should respect conversation limits')
    test('should provide session closure')
  })
})
```

#### **A4. Feed and Historic Posts Logic Tests**
**File**: `tests/unit/feedDisplay.test.ts`

```typescript
/**
 * Feed Display Business Logic Unit Tests
 * 
 * Tests feed display logic that interacts with the storage layer.
 * Uses mocked storage to ensure no database connections in unit tests.
 */

describe('Feed Display Business Logic Unit Tests', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Drop Retrieval Logic', () => {
    test('should load user drops')
    test('should handle empty feed')
    test('should sort drops chronologically')
    test('should include question text')
  })
  
  describe('Display Logic', () => {
    test('should format dates correctly')
    test('should format content correctly')
    test('should handle long content')
    test('should show drop count')
  })

  describe('Navigation Logic', () => {
    test('should navigate to conversations')
    test('should handle invalid drops')
    test('should handle click interactions')
  })
})
```

### **B. Component Type Safety Tests (Optional)**

#### **B1. Core Daily Loop Component Types**
**File**: `tests/unit/dailyLoopComponents.test.ts`

```typescript
/**
 * Daily Loop Components Type Safety Tests
 * 
 * Tests type definitions and basic component logic for core daily loop.
 * Follows the pattern from analysisComponents.test.ts - focuses on types, not rendering.
 */

describe('Daily Loop Components Type Safety', () => {
  describe('DailyDrop Component Types', () => {
    test('should have correct Question type definition')
    test('should have correct Drop type definition')
    test('should validate required component props')
    test('should handle form validation schema types')
  })

  describe('Chat Component Types', () => {
    test('should have correct Message type definition')
    test('should validate conversation limit logic')
    test('should handle message ordering types')
  })

  describe('Feed Component Types', () => {
    test('should have correct DropWithQuestion type definition')
    test('should handle date formatting logic')
    test('should validate feed data structure')
  })
})
```

**Note**: This section is optional and should only be added if there are complex type definitions that need validation. Most component logic should be tested at the business logic level.

### **C. Core Daily Loop Error Handling Tests**

#### **C1. Daily Loop Error Scenarios**
**File**: `tests/unit/dailyLoopErrorHandling.test.ts`

```typescript
/**
 * Core Daily Loop Error Handling Tests
 * 
 * Tests various error scenarios and edge cases for the core daily loop functionality.
 */

describe('Core Daily Loop Error Handling Tests', () => {
  beforeEach(() => {
    resetStorageMocks();
  });

  describe('Daily Question Error Scenarios', () => {
    test('should handle no active questions')
    test('should handle question loading errors')
    test('should handle database timeout')
    test('should fallback to default question')
  })

  describe('Drop Creation Error Scenarios', () => {
    test('should handle submission failures')
    test('should handle network errors')
    test('should handle validation errors')
    test('should handle duplicate submissions')
  })

  describe('Conversation Error Scenarios', () => {
    test('should handle AI service timeout')
    test('should handle AI service unavailable')
    test('should handle message creation failures')
    test('should handle invalid drop access')
  })

  describe('Feed Error Scenarios', () => {
    test('should handle feed loading failures')
    test('should handle empty states gracefully')
    test('should handle navigation errors')
    test('should handle corrupted data')
  })
})
```

---

## 🛠️ **Implementation Tasks**

### **Phase 1: Copy Existing Patterns (Days 1-2)**
1. **Start with existing test structure**
   - Copy `tests/unit/analysis.test.ts` as template for `dailyQuestion.test.ts`
   - Copy `tests/unit/databaseStorage.test.ts` as template for `dropCreation.test.ts`
   - Copy `tests/unit/analysisService.test.ts` as template for `messageConversation.test.ts`
   - Copy `tests/unit/errorHandling.test.ts` as template for `dailyLoopErrorHandling.test.ts`

2. **Update imports and naming**
   - Replace analysis-specific imports with daily loop imports
   - Update test names to match daily loop functionality
   - Keep the same file structure and describe block patterns

### **Phase 2: Core Business Logic Tests (Days 3-5)**
1. **Daily Question Logic** (`tests/unit/dailyQuestion.test.ts`)
   - Focus on question selection, rotation, and date consistency
   - Use existing mock patterns from `analysis.test.ts`
   - Test both success and error scenarios

2. **Drop Creation Logic** (`tests/unit/dropCreation.test.ts`)
   - Focus on drop creation, validation, and daily question integration
   - Use existing mock patterns from `databaseStorage.test.ts`
   - Test form validation and submission logic

3. **Message & Conversation Logic** (`tests/unit/messageConversation.test.ts`)
   - Focus on message creation, ordering, and conversation limits
   - Use existing service patterns from `analysisService.test.ts`
   - Test AI integration and error handling

4. **Feed Display Logic** (`tests/unit/feedDisplay.test.ts`)
   - Focus on data retrieval, sorting, and formatting
   - Use existing storage patterns
   - Test empty states and navigation

### **Phase 3: Error Handling & Polish (Days 6-7)**
1. **Error Scenarios** (`tests/unit/dailyLoopErrorHandling.test.ts`)
   - Copy error patterns from existing `errorHandling.test.ts`
   - Add daily loop specific error scenarios
   - Test network failures, validation errors, and API timeouts

2. **Optional: Component Types** (`tests/unit/dailyLoopComponents.test.ts`)
   - Only add if there are complex type definitions
   - Follow the simple pattern from `analysisComponents.test.ts`
   - Focus on type safety, not UI rendering

### **Phase 4: Extend Existing Infrastructure (Days 8-10)**
1. **Add to existing files** (don't create new utilities)
   - Add daily loop test data to existing `tests/factories/testData.ts`
   - Add scenarios to existing `tests/mocks/mockStorage.ts`
   - Extend existing patterns rather than creating new ones

2. **Run and validate**
   - Run tests with `npm test tests/unit/`
   - Check coverage with existing tools
   - Follow existing documentation patterns

**Key Principle**: Copy existing working patterns rather than creating new infrastructure. This ensures consistency and reduces complexity for junior developers.

---

## 🔧 **Technical Considerations**

### **Mocking Strategy**
Following established patterns from existing tests:

1. **Storage Mocking**
   - Use `mockStorage` from `tests/mocks/mockStorage.ts`
   - Call `resetStorageMocks()` in each `beforeEach()`
   - Database access automatically blocked by `jest.setup.ts`

2. **Pre-Built Mock Scenarios**
   - Use `setupEligibleUserMocks()` for users who can use core features
   - Use `setupIneligibleUserMocks()` for users with insufficient data
   - Use `setupEmptyUserMocks()` for new users
   - Use `setupStorageErrorMocks()` for error testing

3. **External Service Mocking**
   - Mock Anthropic AI service using `jest.mock()` at file level
   - Mock external APIs consistently with existing patterns
   - Follow error response structure: `{ success: false, errorType: string, error: string }`

4. **Test Data Factories**
   Extend existing factories in `tests/factories/testData.ts`:
   - `createMockDailyQuestion()` for question data
   - `createMockDropWithQuestion()` for drop responses  
   - `createMockMessage()` for chat messages
   - `createMockUser()` for user scenarios

### **File Structure & Naming**
Follow existing patterns:
- **File headers**: Include detailed comment explaining what tests cover
- **Import order**: Mocks first, factories second, actual code last
- **Test naming**: `should [action] [expected outcome]`
- **Describe blocks**: Group by logical functionality
- **Mock setup**: Always in `beforeEach()` with `resetStorageMocks()`

### **Safety & Performance**
Following established framework:
- **100% Safe**: No database access possible
- **Fast execution**: Target under 10 seconds for all tests
- **Parallel safe**: All tests use isolated mocks
- **Deterministic**: Pre-configured mock scenarios ensure consistency

### **Coverage Goals**
Matching existing standards:
- **Business Logic**: 95% coverage
- **Component Logic**: 85% coverage  
- **Error Handling**: 100% coverage
- **Integration Points**: 90% coverage

---

## 📊 **Simple Extensions to Existing Infrastructure**

### **Add to Existing Mock Scenarios** (`tests/mocks/mockStorage.ts`)
```typescript
// Add these simple scenarios to the existing file
export const setupDailyQuestionMocks = (testUserId: string) => {
  // Set up user with today's question not answered yet
  mockStorage.getDailyQuestion.mockResolvedValue(createMockQuestion());
  mockStorage.getUser.mockResolvedValue(createMockUser({ id: testUserId }));
  mockStorage.getUserDrops.mockResolvedValue([]);
};

export const setupAnsweredTodayMocks = (testUserId: string) => {
  // Set up user who already answered today
  const todaysDrop = createMockDrop({ userId: testUserId, createdAt: new Date() });
  mockStorage.getUserDrops.mockResolvedValue([todaysDrop]);
};
```

### **Add to Existing Test Data Factories** (`tests/factories/testData.ts`)
```typescript
// Add these simple factories to the existing file
export const createMockQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 1,
  text: 'How are you feeling today?',
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

export const createMockDropWithToday = (overrides: Partial<Drop> = {}): Drop => ({
  ...createMockDrop(overrides),
  createdAt: new Date(), // Today's date
});
```

**Note**: Don't create new utility files. Just extend the existing `mockStorage.ts` and `testData.ts` files with these simple additions.

---

## ✅ **Success Metrics**

### **Simple Goals**
- **All tests pass** consistently
- **Tests run quickly** (under 10 seconds total)
- **Business logic covered** for core daily loop
- **Error scenarios tested** for each feature
- **Follows existing patterns** exactly

### **Quality Checklist**
- ✅ No database access (automatically blocked)
- ✅ Uses existing mock scenarios
- ✅ Tests focus on business outcomes
- ✅ Clear, descriptive test names
- ✅ Proper file headers and organization
- ✅ Extends existing infrastructure only

---

## 🔧 **Testing Approach**

### **Keep It Simple**
- **Don't create new utility files** - Extend existing ones
- **Copy existing test patterns** - They already work well
- **Use existing mock scenarios** - `setupEligibleUserMocks()`, etc.
- **Follow existing import patterns** - Mocks first, factories second, code last

### **When You Need Help**
1. **Look at existing tests first** - Copy patterns from `analysis.test.ts`
2. **Use existing mock scenarios** - Check `mockStorage.ts` for available setups
3. **Keep tests simple** - Focus on business logic, not complex utilities
4. **Ask for code review** - Before creating anything new

---

## 🎯 **Next Steps for Junior Developer**

### **Getting Started**
1. **Read the existing tests** - Understand patterns in `tests/unit/analysis.test.ts`
2. **Copy a working test file** - Use it as your template
3. **Update imports and names** - Replace analysis with daily loop terminology
4. **Start with one simple test** - Get it working before adding more
5. **Ask for help early** - Don't spend hours stuck on setup

### **Success Checklist**
- ✅ Tests follow existing file header pattern
- ✅ Tests use `resetStorageMocks()` in `beforeEach()`
- ✅ Tests use `TEST_USER_IDS` constants
- ✅ Tests use existing mock scenarios like `setupEligibleUserMocks()`
- ✅ Tests focus on business logic, not implementation details
- ✅ All tests pass and run quickly
- ✅ Code follows existing patterns exactly

**Remember**: The goal is to test the core daily loop functionality using the established patterns. Keep it simple, copy what works, and focus on business logic testing. 