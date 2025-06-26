#!/usr/bin/env node

/**
 * Test Safety Verification Script
 * 
 * This script verifies that the test environment is properly configured
 * to prevent any risk of affecting production data.
 */

console.log('🔍 Verifying test safety configuration...\n');

let hasErrors = false;

// Check 1: NODE_ENV status
if (process.env.NODE_ENV !== 'test') {
  console.log('⚠️  NODE_ENV not set to "test"');
  console.log(`   Current value: ${process.env.NODE_ENV || 'undefined'}`);
  console.log('📝 This is OK since database tests are disabled');
} else {
  console.log('✅ NODE_ENV is correctly set to "test"');
}

// Check 2: TEST_DATABASE_URL status
if (!process.env.TEST_DATABASE_URL) {
  console.log('⚠️  TEST_DATABASE_URL not configured');
  console.log('🛡️  Database tests will be skipped to protect production data');
  console.log('📝 This is safe - no database tests will run');
} else {
  console.log('✅ TEST_DATABASE_URL is set');
}

// Check 3: TEST_DATABASE_URL must not equal DATABASE_URL (most critical safety check)
if (process.env.TEST_DATABASE_URL && process.env.DATABASE_URL) {
  if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: TEST_DATABASE_URL cannot be the same as DATABASE_URL');
    console.error('   This would cause tests to run against production database!');
    hasErrors = true;
  } else {
    console.log('✅ TEST_DATABASE_URL is different from DATABASE_URL');
  }
}

// Check 4: Display current configuration (without sensitive data)
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
  if (process.env.TEST_DATABASE_URL) {
    console.log('\nDatabase tests will run against the separate test database.');
  } else {
    console.log('\nDatabase tests are disabled - production data is protected.');
  }
}

console.log('='.repeat(50) + '\n'); 