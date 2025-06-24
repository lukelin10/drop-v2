# 🚨 TEST SAFETY GUIDE - CRITICAL INFORMATION

## ⚠️ NEVER RUN TESTS AGAINST PRODUCTION DATABASE

This document outlines critical safety measures to prevent tests from affecting production data.

## 🔒 Safety Mechanisms Implemented

### 1. Environment-Based Database Isolation

The system now enforces strict database separation:

```typescript
// server/db.ts - Automatically routes to correct database
if (process.env.NODE_ENV === 'test') {
  // REQUIRES TEST_DATABASE_URL - will throw error if not set
  databaseUrl = process.env.TEST_DATABASE_URL;
} else {
  // Uses DATABASE_URL for production/development
  databaseUrl = process.env.DATABASE_URL;
}
```

### 2. Required Test Database Configuration

**BEFORE RUNNING ANY TESTS**, you MUST set up a separate test database:

```bash
# Example environment variables
export NODE_ENV=test
export TEST_DATABASE_URL="postgresql://username:password@localhost:5432/test_database"
export DATABASE_URL="postgresql://username:password@localhost:5432/production_database"
```

### 3. Multiple Safety Checks

The test system includes multiple layers of protection:

1. **Environment Check**: Tests only run when `NODE_ENV=test`
2. **URL Comparison**: `TEST_DATABASE_URL` cannot equal `DATABASE_URL`
3. **Runtime Verification**: Each test file verifies test environment

## 🛡️ Safety Checklist

Before running tests, verify:

- [ ] `NODE_ENV=test` is set
- [ ] `TEST_DATABASE_URL` is configured and points to a separate test database
- [ ] `TEST_DATABASE_URL` ≠ `DATABASE_URL`
- [ ] Test database is empty or contains only test data

## 🚀 Safe Test Execution

### Running All Tests
```bash
NODE_ENV=test npm test
```

### Running Specific Test Files
```bash
NODE_ENV=test npm test -- tests/integration/analysisWorkflow.test.ts
```

### Running Tests with Coverage
```bash
NODE_ENV=test npm run test:coverage
```

## 🗄️ Test Database Setup

### Option 1: Local PostgreSQL
```bash
# Create test database
createdb analysis_app_test

# Set environment variable
export TEST_DATABASE_URL="postgresql://localhost:5432/analysis_app_test"
```

### Option 2: Docker PostgreSQL
```bash
# Run test database in Docker
docker run --name test-postgres -e POSTGRES_DB=analysis_app_test -e POSTGRES_PASSWORD=testpass -p 5433:5432 -d postgres:15

# Set environment variable
export TEST_DATABASE_URL="postgresql://postgres:testpass@localhost:5433/analysis_app_test"
```

### Option 3: Cloud Test Database
```bash
# Use a separate cloud database instance for testing
export TEST_DATABASE_URL="postgresql://user:pass@test-db-host:5432/test_database"
```

## 🔍 Verification Commands

### Check Current Configuration
```bash
echo "NODE_ENV: $NODE_ENV"
echo "TEST_DATABASE_URL: $TEST_DATABASE_URL"
echo "DATABASE_URL: $DATABASE_URL"
```

### Verify Database Separation
```bash
# These should be DIFFERENT
if [ "$TEST_DATABASE_URL" = "$DATABASE_URL" ]; then
  echo "❌ DANGER: Test and production databases are the same!"
else
  echo "✅ Safe: Test and production databases are separate"
fi
```

## 🧪 Test Types and Safety

### Unit Tests (`tests/unit/`)
- **Safety Level**: HIGH
- **Database**: Uses mocks, no real database
- **Risk**: None

### Integration Tests (`tests/integration/`)
- **Safety Level**: MEDIUM
- **Database**: Uses `TEST_DATABASE_URL`
- **Risk**: Low if properly configured

### API Tests (`tests/api/`)
- **Safety Level**: MEDIUM
- **Database**: Uses test server with `TEST_DATABASE_URL`
- **Risk**: Low if properly configured

## 🚨 Emergency Procedures

### If Tests Run Against Production
1. **STOP IMMEDIATELY**: Kill all test processes
2. **Check Database**: Verify production data integrity
3. **Restore if Needed**: Use latest backup if data was affected
4. **Fix Configuration**: Ensure `TEST_DATABASE_URL` is properly set
5. **Verify Setup**: Run verification commands above

### If Test Database is Corrupted
1. **Drop Test Database**: `dropdb analysis_app_test`
2. **Recreate**: `createdb analysis_app_test`
3. **Run Tests**: Tests will recreate necessary tables

## 📋 CI/CD Safety

For continuous integration, ensure:

```yaml
# Example GitHub Actions
env:
  NODE_ENV: test
  TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  DATABASE_URL: ${{ secrets.PRODUCTION_DATABASE_URL }}
```

## ⚡ Quick Safety Commands

```bash
# Quick safety check
npm run test:safety-check

# Clean test database
npm run test:clean-db

# Reset test environment
npm run test:reset
```

## 🔧 Troubleshooting

### Error: "TEST_DATABASE_URL must be set"
**Solution**: Set the `TEST_DATABASE_URL` environment variable

### Error: "Database cleanup attempted outside of test environment"
**Solution**: Ensure `NODE_ENV=test` is set

### Error: "Test database URL cannot be the same as production"
**Solution**: Use different databases for `TEST_DATABASE_URL` and `DATABASE_URL`

### Tests fail with connection errors
**Solution**: Verify test database is running and accessible

## 📞 Support

If you encounter issues with test safety:

1. Check this README first
2. Verify environment variables
3. Ensure test database is properly configured
4. Run safety verification commands

## 🎯 Remember

**The golden rule**: Tests should NEVER affect production data. When in doubt, double-check your configuration before running tests.

**Test database should be treated as disposable** - it will be cleaned and recreated during tests. 