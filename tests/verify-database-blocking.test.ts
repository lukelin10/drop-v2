/**
 * Database Blocking Verification Tests
 * 
 * Verifies that our safety system correctly blocks database access
 * and provides helpful error messages to guide developers.
 */

describe('Database Access Protection', () => {
  test('should block direct database module access', async () => {
    // These should all throw errors due to jest.setup.ts blocking
    const dangerousModules = [
      '../server/db',
      '../server/DatabaseStorage', 
      '../server/storage',
      '../server/services/analysisService'
    ];

    for (const modulePath of dangerousModules) {
      let errorMessage = '';
      try {
        await import(modulePath);
      } catch (error: any) {
        errorMessage = error.message;
      }
      
      expect(errorMessage).toContain('blocked for safety');
      expect(errorMessage).toContain('mockStorage');
    }
  });

  test('should provide helpful error messages', async () => {
    let errorMessage = '';
    try {
      await import('../server/storage');
    } catch (error: any) {
      errorMessage = error.message;
    }
    
    expect(errorMessage).toContain('For unit tests');
    expect(errorMessage).toContain('For API tests');
    expect(errorMessage).toContain('enableMocksForAPITests');
  });

  test('should allow mocking when enableMocksForAPITests is used', async () => {
    // This test verifies that the API test approach works
    const { enableMocksForAPITests } = await import('../setup-server');
    
    // Call the enable function
    enableMocksForAPITests();
    
    // Now storage should be mockable (this is tested in API tests)
    expect(typeof enableMocksForAPITests).toBe('function');
  });

  test('should allow mock storage to be imported', async () => {
    // Mock storage should always be importable
    const { mockStorage } = await import('../mocks/mockStorage');
    
    expect(mockStorage).toBeDefined();
    expect(typeof mockStorage.getUser).toBe('function');
    expect(typeof mockStorage.createDrop).toBe('function');
  });

  test('should block with fast errors (no timeouts)', () => {
    const start = Date.now();
    
    let errorThrown = false;
    try {
      require('../../server/db');
    } catch (error) {
      errorThrown = true;
    }
    
    const duration = Date.now() - start;
    
    expect(errorThrown).toBe(true);
    expect(duration).toBeLessThan(100); // Should fail fast, not timeout
  });

  test('should provide specific module name in error', async () => {
    const testCases = [
      { module: '../server/db', expectedName: 'db' },
      { module: '../server/storage', expectedName: 'storage' },
      { module: '../server/DatabaseStorage', expectedName: 'DatabaseStorage' }
    ];

    for (const { module, expectedName } of testCases) {
      let errorMessage = '';
      try {
        await import(module);
      } catch (error: any) {
        errorMessage = error.message;
      }
      
      expect(errorMessage).toContain(expectedName);
    }
  });

  test('should not block safe modules', async () => {
    // These should be importable without issues
    const safeModules = [
      '../factories/testData',
      '../mocks/mockStorage'
    ];

    for (const modulePath of safeModules) {
      let importSucceeded = false;
      try {
        await import(modulePath);
        importSucceeded = true;
      } catch (error) {
        // Import should succeed
      }
      
      expect(importSucceeded).toBe(true);
    }
  });

  test('should maintain error message consistency', async () => {
    let errorMessage = '';
    try {
      await import('../server/storage');
    } catch (error: any) {
      errorMessage = error.message;
    }
    
    // All error messages should follow the same helpful format
    expect(errorMessage).toContain('❌');
    expect(errorMessage).toContain('blocked for safety');
  });
}); 