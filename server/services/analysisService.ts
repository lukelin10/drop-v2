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
  metadata?: {
    dropCount: number;
    processingTime: number;
    userId: string;
  };
}

/**
 * Analysis validation result
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
  dropCount?: number;
}

/**
 * Create a complete analysis for a user
 * 
 * This is the main orchestration function that:
 * 1. Validates user eligibility
 * 2. Generates analysis using LLM
 * 3. Stores analysis in database
 * 4. Updates user's last analysis date
 * 5. Creates analysis-drop relationships
 * 
 * @param userId - The user to create analysis for
 * @returns Analysis creation result with success/error status
 */
export async function createAnalysisForUser(userId: string): Promise<AnalysisCreationResult> {
  const startTime = Date.now();
  
  try {
    console.log(`Starting analysis creation workflow for user: ${userId}`);
    
    // Step 1: Validate user eligibility
    const validation = await validateAnalysisEligibility(userId);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
        metadata: {
          dropCount: validation.dropCount || 0,
          processingTime: Date.now() - startTime,
          userId
        }
      };
    }

    // Step 2: Get unanalyzed drops for the analysis
    const unanalyzedDrops = await getUnanalyzedDropsWithConversations(userId);
    
    if (unanalyzedDrops.length < 7) {
      return {
        success: false,
        error: `Insufficient drops for analysis: ${unanalyzedDrops.length} (minimum 7 required)`,
        metadata: {
          dropCount: unanalyzedDrops.length,
          processingTime: Date.now() - startTime,
          userId
        }
      };
    }

    console.log(`Validated eligibility: ${unanalyzedDrops.length} drops available for analysis`);

    // Step 3: Generate analysis using LLM
    let llmAnalysis;
    try {
      llmAnalysis = await generateAnalysis(userId);
    } catch (llmError) {
      console.error('LLM analysis generation failed:', llmError);
      return {
        success: false,
        error: `Analysis generation failed: ${llmError instanceof Error ? llmError.message : 'Unknown LLM error'}`,
        metadata: {
          dropCount: unanalyzedDrops.length,
          processingTime: Date.now() - startTime,
          userId
        }
      };
    }

    console.log('LLM analysis generated successfully');

    // Step 4: Prepare analysis data for database storage
    const analysisData = {
      userId,
      content: llmAnalysis.content,
      summary: llmAnalysis.summary,
      bulletPoints: llmAnalysis.bulletPoints
    };

    // Step 5: Store analysis in database with drop relationships
    const dropIds = unanalyzedDrops.map(drop => drop.id);
    let analysis;
    
    try {
      analysis = await storage.createAnalysis(analysisData, dropIds);
    } catch (dbError) {
      console.error('Database storage failed:', dbError);
      return {
        success: false,
        error: `Failed to store analysis: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`,
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

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Analysis creation workflow failed for user ${userId}:`, error);
    
    return {
      success: false,
      error: `Analysis creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        dropCount: 0,
        processingTime,
        userId
      }
    };
  }
}

/**
 * Validate if user is eligible for analysis
 * 
 * @param userId - User to validate
 * @returns Validation result with eligibility status
 */
async function validateAnalysisEligibility(userId: string): Promise<ValidationResult> {
  try {
    // Check user exists and get eligibility status
    const eligibility = await storage.getAnalysisEligibility(userId);
    
    if (!eligibility.isEligible) {
      return {
        isValid: false,
        error: `User not eligible for analysis: ${eligibility.unanalyzedCount} out of ${eligibility.requiredCount} drops`,
        dropCount: eligibility.unanalyzedCount
      };
    }

    return {
      isValid: true,
      dropCount: eligibility.unanalyzedCount
    };

  } catch (error) {
    console.error('Error validating analysis eligibility:', error);
    return {
      isValid: false,
      error: `Eligibility validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
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
      isEligible: eligibility.isEligible
    };
    
  } catch (error) {
    console.error('Error getting analysis stats:', error);
    return {
      totalAnalyses: 0,
      unanalyzedDropCount: 0,
      isEligible: false
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
        error: `Not eligible: ${eligibility.unanalyzedCount} out of ${eligibility.requiredCount} drops`
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