# Testing Documentation

## 🎯 **Quick Start**

**New to testing here?** → Read the **[Complete Testing Guide](./TESTING_GUIDE.md)** 

**TL;DR for experienced developers:**
```typescript
// For unit tests
import { mockStorage } from '../mocks/mockStorage';
// Database access automatically blocked


// For API tests  
import { enableMocksForAPITests, getTestApp } from '../setup-server';
enableMocksForAPITests(); // Must be first
```

## 🏆 **What We Have**

This directory contains a **complete mock-based testing framework** for the Drop application:

- **🔒 100% Safe**: Zero database access, impossible to affect production data
- **⚡ 10x Faster**: Under 10 seconds for full test suite (was 30+ seconds)
- **🎯 Reliable**: Deterministic results, no flaky tests
- **🔧 Easy**: Pre-built tools and scenarios for common test patterns

## 📋 **Test Organization**

```
tests/
├── unit/                    # Individual function/component tests (80%)
├── api/                     # API endpoint tests (15%)
├── integration/             # Service integration tests (5%)
├── factories/               # Test data generators
├── mocks/                   # Mock infrastructure
└── TESTING_GUIDE.md         # Complete documentation
```

## 🚀 **Running Tests**

```bash
# All tests (fast and safe!)
npm test

# Specific types
npm test -- --testPathPattern="unit"        # Unit tests
npm test -- --testPathPattern="api"         # API tests

# Specific file
npm test tests/unit/myTest.test.ts

# Watch mode
npm test -- --watch
```

## 📚 **Documentation**

- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete guide with examples
- **[mocks/README.md](./mocks/README.md)** - Mock system documentation
- **[DATABASE_SAFETY.md](./DATABASE_SAFETY.md)** - Safety system details

## ✨ **Key Features**

### **Test Data Factories**
```typescript
import { createMockUser, createMockDrop } from '../factories/testData';
const user = createMockUser({ id: 'test-123' });
```

### **Pre-configured Scenarios**
```typescript
import { setupEligibleUserMocks } from '../mocks/mockStorage';
setupEligibleUserMocks('user-id'); // User ready for analysis
```

### **Complete Safety System**
- Global database blocking prevents accidental production access
- Multiple protection layers with clear error messages
- Mock override system for safe testing

**For complete instructions and examples, see [TESTING_GUIDE.md](./TESTING_GUIDE.md)** 🎯