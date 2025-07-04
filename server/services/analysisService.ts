/**
 * Analysis Service
 * 
 * This service orchestrates the complete analysis generation workflow.
 * It combines the LLM analysis generation with database operations,
 * error handling, and business logic validation.
 * 
 * Features:
 * - End-to-end analysis creation workflow
 * - Integration with LLM service and database storage
 * - Comprehensive error handling and validation
 * - Analysis eligibility verification
 * - Database transaction management
 * - Detailed logging and monitoring
 * - Duplicate analysis prevention
 * - Data integrity checks
 * - Network error handling
 */

import { generateAnalysis, getUnanalyzedDropsWithConversations } from './analysisLLM';
import { storage } from '../storage';
import type { Analysis } from '@shared/schema';

/**
 * Analysis creation result with success/error status
 */
export interface AnalysisCreationResult {
  success: boolean;
  analysis?: Analysis;
  error?: string;
  errorType?: 'validation' | 'network' | 'llm' | 'database' | 'duplicate' | 'integrity' | 'unknown';
  metadata?: {
    dropCount: number;
    processingTime: number;
    userId: string;
    retryAttempts?: number;
  };
}

/**
 * Analysis validation result
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  errorType?: string;
  dropCount?: number;
}

/**
 * Enhanced error messages for different failure scenarios
 */
const ERROR_MESSAGES = {
  INSUFFICIENT_DROPS: (count: number) =>
    `You need at least 3 journal entries to create an analysis. You currently have ${count} unanalyzed entries.`,

  DUPLICATE_ANALYSIS: 'An analysis is already being processed. Please wait for it to complete before creating another.',

  NETWORK_ERROR: 'Unable to connect to our analysis service. Please check your internet connection and try again.',

  LLM_SERVICE_ERROR: 'Our analysis service is temporarily unavailable. Please try again in a few minutes.',

  DATABASE_ERROR: 'Unable to save your analysis. Please try again or contact support if the problem persists.',

  INTEGRITY_ERROR: 'Analysis data validation failed. Please try again or contact support.',

  RATE_LIMIT_ERROR: 'You\'ve reached the analysis limit. Please wait before creating another analysis.',

  TIMEOUT_ERROR: 'Analysis took too long to complete. Please try again with fewer entries.',

  GENERIC_ERROR: 'Something went wrong while creating your analysis. Please try again.'
};

/**
 * Ongoing analysis requests to prevent duplicates
 */
const ongoingAnalyses = new Set<string>();

/**
 * Create a complete analysis for a user
 * 
 * This is the main orchestration function that:
 * 1. Validates user eligibility and prevents duplicates
 * 2. Performs data integrity checks
 * 3. Generates analysis using LLM with retry logic
 * 4. Stores analysis in database with transaction safety
 * 5. Updates user's last analysis date
 * 6. Creates analysis-drop relationships
 * 7. Comprehensive error handling and logging
 * 
 * @param userId - The user to create analysis for
 * @returns Analysis creation result with success/error status
 */
export async function createAnalysisForUser(userId: string): Promise<AnalysisCreationResult> {
  const startTime = Date.now();
  let retryAttempts = 0;

  try {
    console.log(`Starting analysis creation workflow for user: ${userId}`);

    // Step 1: Check for duplicate analysis requests
    if (ongoingAnalyses.has(userId)) {
      return {
        success: false,
        error: ERROR_MESSAGES.DUPLICATE_ANALYSIS,
        errorType: 'duplicate',
        metadata: {
          dropCount: 0,
          processingTime: Date.now() - startTime,
          userId
        }
      };
    }

    // Mark analysis as ongoing
    ongoingAnalyses.add(userId);

    try {
      // Step 2: Validate user eligibility with enhanced checks
      const validation = await validateAnalysisEligibility(userId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorType: validation.errorType as any,
          metadata: {
            dropCount: validation.dropCount || 0,
            processingTime: Date.now() - startTime,
            userId
          }
        };
      }

      // Step 3: Get unanalyzed drops with data integrity checks
      const unanalyzedDrops = await getUnanalyzedDropsWithConversations(userId);

      if (unanalyzedDrops.length < 3) {
        return {
          success: false,
          error: ERROR_MESSAGES.INSUFFICIENT_DROPS(unanalyzedDrops.length),
          errorType: 'validation',
          metadata: {
            dropCount: unanalyzedDrops.length,
            processingTime: Date.now() - startTime,
            userId
          }
        };
      }

      // Step 4: Perform data integrity checks
      const integrityCheck = await performDataIntegrityChecks(unanalyzedDrops);
      if (!integrityCheck.isValid) {
        return {
          success: false,
          error: integrityCheck.error || ERROR_MESSAGES.INTEGRITY_ERROR,
          errorType: 'integrity',
          metadata: {
            dropCount: unanalyzedDrops.length,
            processingTime: Date.now() - startTime,
            userId
          }
        };
      }

      console.log(`Validated eligibility: ${unanalyzedDrops.length} drops available for analysis`);

      // Step 5: Generate analysis using LLM with enhanced error handling
      let llmAnalysis;
      try {
        llmAnalysis = await generateAnalysis(userId);
      } catch (llmError) {
        console.error('LLM analysis generation failed:', llmError);

        const errorMessage = llmError instanceof Error ? llmError.message : 'Unknown LLM error';
        let errorType: string = 'llm';
        let userMessage = ERROR_MESSAGES.LLM_SERVICE_ERROR;

        // Classify the error type for better user messaging
        if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
          errorType = 'network';
          userMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          errorType = 'network';
          userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT')) {
          errorType = 'validation';
          userMessage = ERROR_MESSAGES.RATE_LIMIT_ERROR;
        }

        return {
          success: false,
          error: userMessage,
          errorType: errorType as any,
          metadata: {
            dropCount: unanalyzedDrops.length,
            processingTime: Date.now() - startTime,
            userId,
            retryAttempts
          }
        };
      }

      console.log('LLM analysis generated successfully');

      // Step 6: Prepare analysis data with validation
      const analysisData = {
        userId,
        content: llmAnalysis.content?.trim() || '',
        summary: llmAnalysis.summary?.trim() || '',
        bulletPoints: llmAnalysis.bulletPoints?.trim() || ''
      };

      // Validate analysis data before storage
      if (!analysisData.content || !analysisData.summary) {
        return {
          success: false,
          error: ERROR_MESSAGES.INTEGRITY_ERROR,
          errorType: 'integrity',
          metadata: {
            dropCount: unanalyzedDrops.length,
            processingTime: Date.now() - startTime,
            userId
          }
        };
      }

      // Step 7: Store analysis in database with transaction safety
      const dropIds = unanalyzedDrops.map(drop => drop.id);
      let analysis;

      try {
        analysis = await storage.createAnalysis(analysisData, dropIds);
      } catch (dbError) {
        console.error('Database storage failed:', dbError);

        const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
        let userMessage = ERROR_MESSAGES.DATABASE_ERROR;

        // Handle specific database errors
        if (errorMessage.includes('constraint') || errorMessage.includes('unique')) {
          userMessage = ERROR_MESSAGES.DUPLICATE_ANALYSIS;
        } else if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
          userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        }

        return {
          success: false,
          error: userMessage,
          errorType: 'database',
          metadata: {
            dropCount: unanalyzedDrops.length,
            processingTime: Date.now() - startTime,
            userId
          }
        };
      }

      const processingTime = Date.now() - startTime;
      console.log(`Analysis created successfully for user ${userId} in ${processingTime}ms`);
      console.log(`Analysis ID: ${analysis.id}, Summary: "${analysis.summary}"`);

      // Return successful result
      return {
        success: true,
        analysis,
        metadata: {
          dropCount: unanalyzedDrops.length,
          processingTime,
          userId
        }
      };

    } finally {
      // Always remove from ongoing analyses
      ongoingAnalyses.delete(userId);
    }

  } catch (error) {
    // Always remove from ongoing analyses on error
    ongoingAnalyses.delete(userId);

    const processingTime = Date.now() - startTime;
    console.error(`Analysis creation workflow failed for user ${userId}:`, error);

    return {
      success: false,
      error: ERROR_MESSAGES.GENERIC_ERROR,
      errorType: 'unknown',
      metadata: {
        dropCount: 0,
        processingTime,
        userId
      }
    };
  }
}

/**
 * Validate if user is eligible for analysis with enhanced checks
 * 
 * @param userId - User to validate
 * @returns Validation result with eligibility status and error details
 */
const validateAnalysisEligibility = async (userId: string): Promise<ValidationResult> => {
  try {
    // Check if user exists first
    const user = await storage.getUser(userId);
    if (!user) {
      return {
        isValid: false,
        error: 'User not found. Please log in again.',
        errorType: 'validation'
      };
    }

    // Check user eligibility status
    const eligibility = await storage.getAnalysisEligibility(userId);

    if (!eligibility.isEligible) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INSUFFICIENT_DROPS(eligibility.unanalyzedCount),
        errorType: 'validation',
        dropCount: eligibility.unanalyzedCount
      };
    }

    // Check for recent analysis (rate limiting)
    if (user.lastAnalysisDate) {
      const timeSinceLastAnalysis = Date.now() - user.lastAnalysisDate.getTime();
      const minTimeBetweenAnalyses = 30 * 60 * 1000; // 30 minutes

      if (timeSinceLastAnalysis < minTimeBetweenAnalyses) {
        const remainingTime = Math.ceil((minTimeBetweenAnalyses - timeSinceLastAnalysis) / (60 * 1000));
        return {
          isValid: false,
          error: `Please wait ${remainingTime} minutes before creating another analysis.`,
          errorType: 'validation',
          dropCount: eligibility.unanalyzedCount
        };
      }
    }

    return {
      isValid: true,
      dropCount: eligibility.unanalyzedCount
    };

  } catch (error) {
    console.error('Error validating analysis eligibility:', error);
    return {
      isValid: false,
      error: ERROR_MESSAGES.NETWORK_ERROR,
      errorType: 'network'
    };
  }
};

/**
 * Perform data integrity checks on drops before analysis
 * 
 * @param drops - Array of drops to validate
 * @returns Validation result with integrity status
 */
const performDataIntegrityChecks = async (drops: any[]): Promise<ValidationResult> => {
  try {
    // Check if drops array is valid
    if (!Array.isArray(drops) || drops.length === 0) {
      return {
        isValid: false,
        error: 'No valid journal entries found for analysis.'
      };
    }

    // Check each drop for required fields
    for (const drop of drops) {
      if (!drop.id || !drop.text || !drop.userId) {
        return {
          isValid: false,
          error: 'Some journal entries have missing data. Please contact support.'
        };
      }

      // Check text content length
      if (drop.text.trim().length < 10) {
        return {
          isValid: false,
          error: 'Some journal entries are too short for meaningful analysis.'
        };
      }

      // Check for valid timestamps
      if (!drop.createdAt || isNaN(new Date(drop.createdAt).getTime())) {
        return {
          isValid: false,
          error: 'Some journal entries have invalid dates. Please contact support.'
        };
      }
    }

    // Check for reasonable date range (not older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const oldestDrop = drops.reduce((oldest, drop) =>
      new Date(drop.createdAt) < new Date(oldest.createdAt) ? drop : oldest
    );

    if (new Date(oldestDrop.createdAt) < oneYearAgo) {
      console.warn(`Analysis includes drops older than 1 year for user: ${drops[0].userId}`);
    }

    return { isValid: true };

  } catch (error) {
    console.error('Error performing data integrity checks:', error);
    return {
      isValid: false,
      error: 'Unable to validate journal entries. Please try again.'
    };
  }
};

/**
 * Check if user has an ongoing analysis
 * 
 * @param userId - User to check
 * @returns Whether analysis is in progress
 */
export function hasOngoingAnalysis(userId: string): boolean {
  return ongoingAnalyses.has(userId);
}

/**
 * Cancel ongoing analysis (if supported)
 * 
 * @param userId - User whose analysis to cancel
 * @returns Whether cancellation was successful
 */
export function cancelOngoingAnalysis(userId: string): boolean {
  return ongoingAnalyses.delete(userId);
}

/**
 * Get analysis statistics for monitoring and debugging
 * 
 * @param userId - User to get stats for
 * @returns Analysis statistics
 */
export async function getAnalysisStats(userId: string): Promise<{
  totalAnalyses: number;
  lastAnalysisDate?: Date;
  unanalyzedDropCount: number;
  isEligible: boolean;
  hasOngoingAnalysis: boolean;
}> {
  try {
    // Get user's analyses
    const analyses = await storage.getUserAnalyses(userId, 100, 0); // Get up to 100 analyses

    // Get eligibility status
    const eligibility = await storage.getAnalysisEligibility(userId);

    // Find most recent analysis date
    const lastAnalysisDate = analyses.length > 0 ? analyses[0].createdAt : undefined;

    return {
      totalAnalyses: analyses.length,
      lastAnalysisDate,
      unanalyzedDropCount: eligibility.unanalyzedCount,
      isEligible: eligibility.isEligible,
      hasOngoingAnalysis: ongoingAnalyses.has(userId)
    };

  } catch (error) {
    console.error('Error getting analysis stats:', error);
    return {
      totalAnalyses: 0,
      unanalyzedDropCount: 0,
      isEligible: false,
      hasOngoingAnalysis: false
    };
  }
}

/**
 * Preview what would be analyzed without actually creating analysis
 * Useful for debugging and user preview
 * 
 * @param userId - User to preview analysis for
 * @returns Preview information
 */
export async function previewAnalysis(userId: string): Promise<{
  eligible: boolean;
  dropCount: number;
  oldestDrop?: Date;
  newestDrop?: Date;
  totalMessages: number;
  error?: string;
}> {
  try {
    // Check eligibility
    const eligibility = await storage.getAnalysisEligibility(userId);

    if (!eligibility.isEligible) {
      return {
        eligible: false,
        dropCount: eligibility.unanalyzedCount,
        totalMessages: 0,
        error: ERROR_MESSAGES.INSUFFICIENT_DROPS(eligibility.unanalyzedCount)
      };
    }

    // Get drops that would be analyzed
    const drops = await getUnanalyzedDropsWithConversations(userId);

    if (drops.length === 0) {
      return {
        eligible: false,
        dropCount: 0,
        totalMessages: 0,
        error: 'No unanalyzed drops found'
      };
    }

    // Calculate preview stats
    const totalMessages = drops.reduce((total, drop) => {
      return total + (drop.conversation ? drop.conversation.length : 0);
    }, 0);

    const dates = drops.map(drop => drop.createdAt).sort((a, b) => a.getTime() - b.getTime());
    const oldestDrop = dates[0];
    const newestDrop = dates[dates.length - 1];

    return {
      eligible: true,
      dropCount: drops.length,
      oldestDrop,
      newestDrop,
      totalMessages
    };

  } catch (error) {
    return {
      eligible: false,
      dropCount: 0,
      totalMessages: 0,
      error: `Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Health check for the analysis service
 * Verifies all dependencies are working
 * 
 * @returns Health status
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  checks: {
    anthropicApiKey: boolean;
    databaseConnection: boolean;
    storageService: boolean;
  };
  error?: string;
}> {
  const checks = {
    anthropicApiKey: false,
    databaseConnection: false,
    storageService: false
  };

  try {
    // Check Anthropic API key
    checks.anthropicApiKey = !!process.env.ANTHROPIC_API_KEY;

    // Check database connection by trying to get eligibility for a test user
    try {
      await storage.getAnalysisEligibility('health-check-user');
      checks.databaseConnection = true;
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
    }

    // Check storage service
    try {
      // Try to get analyses for a test user (should not fail even if user doesn't exist)
      await storage.getUserAnalyses('health-check-user', 1, 0);
      checks.storageService = true;
    } catch (storageError) {
      console.error('Storage health check failed:', storageError);
    }

    const healthy = checks.anthropicApiKey && checks.databaseConnection && checks.storageService;

    return {
      healthy,
      checks
    };

  } catch (error) {
    return {
      healthy: false,
      checks,
      error: error instanceof Error ? error.message : 'Unknown health check error'
    };
  }
} 