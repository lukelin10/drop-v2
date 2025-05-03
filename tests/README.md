# Integration Tests

This directory contains integration tests for the Personal Coaching application. The tests validate API endpoints, database interactions, and complete user flows to ensure application functionality.

## Test Structure

- **tests/setup.ts**: Common setup for all tests, including database connection and utility functions
- **tests/testServer.ts**: Server configuration for tests with authentication and API mocks

### Unit Tests

- **tests/unit/databaseStorage.test.ts**: Unit tests for the database storage layer

### API Tests

- **tests/api/auth.test.ts**: Tests for authentication endpoints
- **tests/api/drops.test.ts**: Tests for creating and retrieving drops (journal entries)
- **tests/api/messages.test.ts**: Tests for message exchange between user and AI
- **tests/api/questions.test.ts**: Tests for daily questions functionality
- **tests/api/errorHandling.test.ts**: Tests for API error handling

### Integration Tests

- **tests/integration/conversationFlow.test.ts**: End-to-end test for the complete conversation flow
- **tests/integration/aiChat.test.ts**: Tests specifically for the AI-powered chat functionality

### Utility Functions

- **tests/utils/dbHelpers.ts**: Helper functions for database operations during tests
- **tests/utils/requestMocks.ts**: Mocks for Express request/response objects

## Running Tests

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- tests/api/auth.test.ts

# Run tests with coverage report
npm test -- --coverage
```

## Testing Strategy

1. **Isolation**: Each test runs with a clean database state
2. **Authentication**: Tests use a mock authentication to simulate a logged-in user
3. **AI Integration**: Claude API calls are mocked to provide predictable responses
4. **Coverage**: Tests cover happy paths and error scenarios
5. **Complete Flows**: Integration tests validate end-to-end functionality

## Test Database

Tests use the database specified in the `TEST_DATABASE_URL` environment variable. If not provided, tests will fall back to using the main database with appropriate precautions to avoid data corruption.