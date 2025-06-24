#!/usr/bin/env node

/**
 * Test Safety Verification Script
 * 
 * This script verifies that the test environment is properly configured
 * to prevent any risk of affecting production data.
 */

console.log('🔍 Verifying test safety configuration...\n');

let hasErrors = false;

// Check 1: NODE_ENV must be 'test'
if (process.env.NODE_ENV !== 'test') {
  console.error('❌ ERROR: NODE_ENV must be set to "test"');
  console.error(`   Current value: ${process.env.NODE_ENV || 'undefined'}`);
  hasErrors = true;
} else {
  console.log('✅ NODE_ENV is correctly set to "test"');
}

// Check 2: TEST_DATABASE_URL must be set
if (!process.env.TEST_DATABASE_URL) {
  console.error('❌ ERROR: TEST_DATABASE_URL environment variable is required');
  console.error('   Please set up a separate test database');
  hasErrors = true;
} else {
  console.log('✅ TEST_DATABASE_URL is set');
}

// Check 3: TEST_DATABASE_URL must contain "test" or "TEST"
if (process.env.TEST_DATABASE_URL) {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl.includes('test') && !testDbUrl.includes('TEST')) {
    console.error('❌ ERROR: TEST_DATABASE_URL must contain "test" or "TEST"');
    console.error(`   Current URL: ${testDbUrl}`);
    hasErrors = true;
  } else {
    console.log('✅ TEST_DATABASE_URL contains test identifier');
  }
}

// Check 4: TEST_DATABASE_URL must not equal DATABASE_URL
if (process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
  if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: TEST_DATABASE_URL cannot be the same as DATABASE_URL');
    console.error('   This would cause tests to run against production database!');
    hasErrors = true;
  } else {
    console.log('✅ TEST_DATABASE_URL is different from DATABASE_URL');
  }
}

// Check 5: Display current configuration (without sensitive data)
console.log('\n📋 Current Configuration:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

if (process.env.TEST_DATABASE_URL) {
  // Mask sensitive parts of the URL
  const testUrl = process.env.TEST_DATABASE_URL.replace(/:\/\/[^@]+@/, '://***:***@');
  console.log(`TEST_DATABASE_URL: ${testUrl}`);
} else {
  console.log('TEST_DATABASE_URL: undefined');
}

if (process.env.DATABASE_URL) {
  const prodUrl = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, '://***:***@');
  console.log(`DATABASE_URL: ${prodUrl}`);
} else {
  console.log('DATABASE_URL: undefined');
}

// Final result
console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.error('❌ SAFETY CHECK FAILED');
  console.error('\nPlease fix the above issues before running tests.');
  console.error('See tests/TEST-SAFETY-README.md for detailed instructions.');
  process.exit(1);
} else {
  console.log('✅ SAFETY CHECK PASSED');
  console.log('\nYour test environment is properly configured.');
  console.log('Tests will run against the separate test database only.');
}

console.log('='.repeat(50) + '\n'); 