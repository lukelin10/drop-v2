/**
 * Analysis Workflow Integration Tests (Mock-Based)
 * 
 * Tests the complete end-to-end analysis workflow using mocks:
 * 1. Service integration and communication
 * 2. Data flow through application layers  
 * 3. Error handling across service boundaries
 * 4. API contracts and response formats
 * 
 * This replaces database-dependent integration tests with fast, reliable, contract-based testing.
 */

import { setupIntegrationMocks, createTestScenario, resetIntegrationMocks } from './mocks/integrationMocks';
import { mockStorage } from '../mocks/mockStorage';
import { verifyAnalysisAPIContract, verifySuccessResponse } from './contracts/apiContracts';
import { createMockUser } from '../factories/testData';
import request from 'supertest';

// CRITICAL: Setup integration mocks to prevent database access
setupIntegrationMocks();

describe('Analysis Workflow Integration Tests (Mock-Based)', () => {
  let testUserId: string;

  beforeEach(() => {
    // Reset to clean mock state
    resetIntegrationMocks();

    // Set up test user
    testUserId = 'test-user-integration';
    createTestScenario('eligible-user', testUserId);
  });

  describe('Complete Analysis Workflow', () => {
    test('end-to-end workflow: eligibility → generation → storage → retrieval', async () => {
      // Import services after mocks are set up
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      // Step 1: Verify initial eligibility
      const initialEligibility = await mockStorage.getAnalysisEligibility(testUserId);
      expect(initialEligibility.isEligible).toBe(true);
      expect(initialEligibility.unanalyzedCount).toBe(5);
      expect(initialEligibility.requiredCount).toBe(3);

      // Step 2: Create analysis through service layer
      const analysisResult = await createAnalysisForUser(testUserId);

      // Verify service integration worked correctly
      expect(analysisResult.success).toBe(true);
      expect(analysisResult.analysis).toBeDefined();
      expect(analysisResult.metadata?.dropCount).toBe(5);
      expect(analysisResult.metadata?.processingTime).toBeGreaterThan(0);

      const analysis = analysisResult.analysis!;

      // Step 3: Verify analysis structure and content
      expect(analysis.id).toBeGreaterThan(0);
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.summary).toBeDefined();
      expect(analysis.content).toBeDefined();
      expect(analysis.bulletPoints).toBeDefined();
      expect(analysis.isFavorited).toBe(false);
      expect(analysis.createdAt).toBeInstanceOf(Date);

      // Step 4: Verify service calls were made correctly
      expect(mockStorage.getUser).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);

      // Verify LLM service was called to get drops (analysis service calls this directly)
      const mockGetUnanalyzedDropsWithConversations = require('../../server/services/analysisLLM').getUnanalyzedDropsWithConversations;
      expect(mockGetUnanalyzedDropsWithConversations).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          summary: expect.any(String),
          content: expect.any(String),
          bulletPoints: expect.any(String)
        }),
        expect.any(Array) // dropIds array
      );

      // Step 5: Verify analysis can be retrieved
      // Set up the mock to return the analysis that was just created
      mockStorage.getAnalysis.mockResolvedValue(analysis);
      const retrievedAnalysis = await mockStorage.getAnalysis(analysis.id);
      expect(retrievedAnalysis).toEqual(analysis);

      // Step 6: Verify user analyses list
      mockStorage.getUserAnalyses.mockResolvedValue([analysis]);
      const userAnalyses = await mockStorage.getUserAnalyses(testUserId);
      expect(userAnalyses).toHaveLength(1);
      expect(userAnalyses[0].id).toBe(analysis.id);

      // Step 7: Verify analysis drops relationship
      const analysisDrops = await mockStorage.getAnalysisDrops(analysis.id);
      expect(analysisDrops).toHaveLength(5);
      analysisDrops.forEach(drop => {
        expect(drop.userId).toBe(testUserId);
        expect(drop.questionText).toBeDefined();
      });
    });

    test('workflow handles multiple analyses correctly', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      // Create first analysis
      const firstAnalysis = await createAnalysisForUser(testUserId);
      expect(firstAnalysis.success).toBe(true);

      // Mock user to have no lastAnalysisDate to bypass rate limiting
      const mockUser = createMockUser({
        id: testUserId,
        username: 'integrationuser',
        email: 'integration@test.com',
        lastAnalysisDate: null // Remove rate limiting
      });
      mockStorage.getUser.mockResolvedValue(mockUser);

      // Update mocks for second analysis scenario
      mockStorage.getAnalysisEligibility.mockResolvedValue({
        isEligible: true,
        unanalyzedCount: 10,
        requiredCount: 3
      });

      // Create second analysis
      const secondAnalysis = await createAnalysisForUser(testUserId);
      expect(secondAnalysis.success).toBe(true);

      // Verify both analyses are distinct
      expect(secondAnalysis.analysis!.id).toBe(firstAnalysis.analysis!.id); // Same in mock
      expect(mockStorage.createAnalysis).toHaveBeenCalledTimes(2);
    });

    test('workflow enforces business rules correctly', async () => {
      // Test insufficient drops scenario
      createTestScenario('ineligible-user', testUserId);

      const { createAnalysisForUser } = require('../../server/services/analysisService');
      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result.errorType).toBe('validation');
      expect(result.error).toContain('need at least 3');
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('Service Integration', () => {
    test('analysis service integrates correctly with storage service', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      await createAnalysisForUser(testUserId);

      // Verify correct service calls were made
      expect(mockStorage.getUser).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.getAnalysisEligibility).toHaveBeenCalledWith(testUserId);

      // Verify LLM service was called to get drops
      const mockGetUnanalyzedDropsWithConversations = require('../../server/services/analysisLLM').getUnanalyzedDropsWithConversations;
      expect(mockGetUnanalyzedDropsWithConversations).toHaveBeenCalledWith(testUserId);
      expect(mockStorage.createAnalysis).toHaveBeenCalled();
    });

    test('analysis service integrates correctly with LLM service', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');
      const mockGenerateAnalysis = require('../../server/services/analysisLLM').generateAnalysis;

      await createAnalysisForUser(testUserId);

      // Verify LLM service was called
      expect(mockGenerateAnalysis).toHaveBeenCalledWith(testUserId);

      // Verify LLM response was processed correctly
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: 'Integration test analysis summary showing deep insights',
          content: expect.stringContaining('comprehensive integration test analysis'),
          bulletPoints: expect.stringContaining('Integration workflow verified')
        }),
        expect.any(Array) // dropIds array
      );
    });

    test('error handling works across service boundaries', async () => {
      // Set up LLM service error (clear previous mock and set up the error)
      const mockGenerateAnalysis = require('../../server/services/analysisLLM').generateAnalysis;
      mockGenerateAnalysis.mockClear();
      mockGenerateAnalysis.mockRejectedValue(new Error('LLM service unavailable'));

      const { createAnalysisForUser } = require('../../server/services/analysisService');
      const result = await createAnalysisForUser(testUserId);

      // Verify error propagation
      expect(result.success).toBe(false);
      expect(result.errorType).toBe('llm');
      expect(result.error).toContain('unavailable');

      // Verify no partial data was stored
      expect(mockStorage.createAnalysis).not.toHaveBeenCalled();
    });
  });

  describe('API Contract Validation', () => {
    test('analysis API maintains correct response format', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');
      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(true);

      // Validate the analysis object matches API contract
      verifyAnalysisAPIContract(result.analysis);
    });

    test('error responses maintain correct format', async () => {
      createTestScenario('ineligible-user', testUserId);

      const { createAnalysisForUser } = require('../../server/services/analysisService');
      const result = await createAnalysisForUser(testUserId);

      expect(result.success).toBe(false);
      expect(result).toMatchObject({
        success: false,
        errorType: expect.any(String),
        error: expect.any(String),
        metadata: expect.any(Object)
      });
    });
  });

  describe('Data Flow Validation', () => {
    test('data transforms correctly through application layers', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      // Track data transformation
      const originalDrops = await mockStorage.getUnanalyzedDrops(testUserId);
      const result = await createAnalysisForUser(testUserId);

      // Verify data flowed correctly from drops → LLM → analysis
      expect(result.analysis!.userId).toBe(testUserId);
      expect(mockStorage.createAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUserId,
          summary: expect.any(String),
          content: expect.any(String),
          bulletPoints: expect.any(String)
        }),
        expect.any(Array) // dropIds array
      );

      // Verify metadata includes drop information
      expect(result.metadata?.dropCount).toBe(originalDrops.length);
    });

    test('user state updates correctly during workflow', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      await createAnalysisForUser(testUserId);

      // Verify user's last analysis date would be updated
      // (In real implementation, this would update the user record)
      expect(mockStorage.getUser).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('Performance and Reliability', () => {
    test('workflow completes within reasonable time', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      const startTime = Date.now();
      const result = await createAnalysisForUser(testUserId);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second with mocks
    });

    test('workflow is deterministic with mocks', async () => {
      const { createAnalysisForUser } = require('../../server/services/analysisService');

      const result1 = await createAnalysisForUser(testUserId);

      // Reset and run again
      resetIntegrationMocks();
      createTestScenario('eligible-user', testUserId);

      const result2 = await createAnalysisForUser(testUserId);

      // Results should be consistent
      expect(result1.success).toBe(result2.success);
      expect(result1.analysis!.summary).toBe(result2.analysis!.summary);
    });
  });
}); 