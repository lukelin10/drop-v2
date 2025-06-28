/**
 * Integration Test Mocks
 * 
 * Provides comprehensive mock setups for integration testing.
 * Uses the new streamlined mock architecture.
 */

// Database access automatically blocked by jest.setup.ts
import { 
  mockStorage, 
  resetStorageMocks, 
  setupEligibleUserMocks, 
  setupIneligibleUserMocks 
} from '../../mocks/mockStorage';
import { createMockUser, createMockDropWithQuestion, createMockMessage, createMockAnalysis } from '../../factories/testData';

/**
 * Complete integration test mock setup
 * Use this at the top of integration test files
 */
export const setupIntegrationMocks = () => {
  // Set up database and storage mocks (but allow analysis service)
  setupIntegrationDatabaseMocks();
  
  // Add integration-specific external service mocks
  setupExternalServiceMocks();
  
  // Set up rich workflow scenarios
  setupWorkflowMocks();
};

/**
 * Database mocks for integration tests
 * Similar to unit test mocks but allows analysis service to run
 */
export const setupIntegrationDatabaseMocks = () => {
  // Block database access
  jest.mock('../../../server/db', () => {
    throw new Error('Direct database access blocked in integration tests. Use mock storage.');
  });

  // Block DatabaseStorage class
  jest.mock('../../../server/DatabaseStorage', () => {
    return {
      DatabaseStorage: jest.fn(() => {
        throw new Error('DatabaseStorage blocked in integration tests. Use mock storage.');
      })
    };
  });

  // Mock the storage module (allow analysis service to use mocked storage)
  jest.mock('../../../server/storage', () => ({
    storage: mockStorage
  }));

  // NOTE: We do NOT block analysisService here - integration tests need it
};

/**
 * Mock external services commonly used in integration tests
 */
export const setupExternalServiceMocks = () => {
  // Test server functionality now handled by setup-server.ts
  // No need to mock testServer here - use getTestApp() from setup-server.ts instead

  // Mock Anthropic service for conversation flows
  jest.mock('../../../server/services/anthropic', () => ({
    generateResponse: jest.fn().mockImplementation(async (userMessage: string) => {
      return `Mock AI response to: "${userMessage}". This is a thoughtful response that shows understanding.`;
    }),
    getConversationHistory: jest.fn().mockResolvedValue([])
  }));

  // Mock Analysis LLM service
  jest.mock('../../../server/services/analysisLLM', () => ({
    generateAnalysis: jest.fn().mockResolvedValue({
      summary: 'Integration test analysis summary showing deep insights',
      content: 'This comprehensive integration test analysis demonstrates the workflow from data collection through AI processing to final presentation. The analysis shows consistent patterns of engagement and thoughtful reflection.',
      bulletPoints: '• Integration workflow verified\n• Service boundaries tested\n• Data flow confirmed\n• Error handling validated\n• Contract compliance verified'
    }),
    getUnanalyzedDropsWithConversations: jest.fn().mockResolvedValue([])
  }));
};

/**
 * Set up rich workflow scenarios for integration testing
 */
export const setupWorkflowMocks = () => {
  // Default to eligible user scenario
  setupAnalysisWorkflowMocks('test-user-integration');
};

/**
 * Complete analysis workflow mock setup
 */
export const setupAnalysisWorkflowMocks = (userId: string = 'test-user-integration') => {
  const mockUser = createMockUser({ 
    id: userId,
    username: 'integrationuser',
    email: 'integration@test.com'
  });

  const mockDrops = Array.from({ length: 8 }, (_, i) => 
    createMockDropWithQuestion({
      id: i + 1,
      userId,
      questionId: 1,
      text: `Integration test drop ${i + 1} with comprehensive content for meaningful analysis and workflow testing`,
      questionText: 'Integration test question for workflow validation'
    })
  );

  const mockMessages = mockDrops.flatMap(drop => [
    createMockMessage({
      id: drop.id * 2 - 1,
      dropId: drop.id,
      text: `User reflection for drop ${drop.id}: This represents my thoughts and experiences.`,
      fromUser: true
    }),
    createMockMessage({
      id: drop.id * 2,
      dropId: drop.id,
      text: `AI response for drop ${drop.id}: That's a thoughtful reflection. What patterns do you notice?`,
      fromUser: false
    })
  ]);

  // Set up storage mocks for complete workflow
  mockStorage.getUser.mockResolvedValue(mockUser);
  mockStorage.getAnalysisEligibility.mockResolvedValue({
    isEligible: true,
    unanalyzedCount: 8,
    requiredCount: 7
  });
  mockStorage.getUnanalyzedDrops.mockResolvedValue(mockDrops);
  mockStorage.getUserDrops.mockResolvedValue(mockDrops);
  mockStorage.getMessages.mockImplementation(async (dropId: number) => {
    return mockMessages.filter(msg => msg.dropId === dropId);
  });

  // Mock analysis creation workflow
  mockStorage.createAnalysis.mockImplementation(async (analysisData) => {
    const analysis = createMockAnalysis({
      ...analysisData,
      id: 1,
      userId,
      isFavorited: false
    });
    
    // Update user's last analysis date
    mockUser.lastAnalysisDate = new Date();
    
    return analysis;
  });

  mockStorage.getUserAnalyses.mockResolvedValue([]);
  mockStorage.getAnalysisDrops.mockResolvedValue(mockDrops);
};

/**
 * Conversation flow mock setup
 */
export const setupConversationFlowMocks = (userId: string = 'test-user-integration') => {
  const mockUser = createMockUser({ id: userId });
  const mockDrop = createMockDropWithQuestion({
    id: 1,
    userId,
    questionId: 1,
    text: 'Integration test drop for conversation flow',
    questionText: 'What are your goals for today?'
  });

  let messageId = 1;
  const messages: any[] = [
    createMockMessage({
      id: messageId++,
      dropId: 1,
      text: 'Welcome! I see you want to discuss your goals. What specific goals are you thinking about?',
      fromUser: false
    })
  ];

  mockStorage.getUser.mockResolvedValue(mockUser);
  mockStorage.getDrop.mockResolvedValue(mockDrop);
  mockStorage.getUserDrops.mockResolvedValue([mockDrop]);
  mockStorage.createDrop.mockImplementation(async (dropData) => {
    return createMockDropWithQuestion({
      ...dropData,
      id: 1,
      questionText: 'What are your goals for today?'
    });
  });

  mockStorage.getMessages.mockImplementation(async (dropId: number) => {
    return messages.filter(msg => msg.dropId === dropId);
  });

  mockStorage.createMessage.mockImplementation(async (messageData) => {
    const newMessage = createMockMessage({
      ...messageData,
      id: messageId++
    });
    messages.push(newMessage);
    
    // If user message, trigger AI response
    if (messageData.fromUser) {
      setTimeout(() => {
        const aiResponse = createMockMessage({
          id: messageId++,
          dropId: messageData.dropId,
          text: `Mock AI response to: "${messageData.text}"`,
          fromUser: false
        });
        messages.push(aiResponse);
      }, 100);
    }
    
    return newMessage;
  });
};

/**
 * API contract mock setup
 */
export const setupAPIContractMocks = (userId: string = 'test-user-integration') => {
  setupAnalysisWorkflowMocks(userId);
  
  // Add specific API response mocks
  mockStorage.getDailyQuestion.mockResolvedValue('What are your goals for today?');
  
  // Mock question management
  mockStorage.createQuestion.mockImplementation(async (questionData) => ({
    id: 1,
    text: questionData.text,
    isActive: questionData.isActive ?? true,
    category: questionData.category || 'general',
    createdAt: new Date(),
    lastUsedAt: null,
    usageCount: 0
  }));
};

/**
 * Error scenario mock setup
 */
export const setupErrorScenarioMocks = () => {
  // Mock various error scenarios for integration testing
  
  // Database error scenarios
  const setupDatabaseErrorMocks = () => {
    mockStorage.createAnalysis.mockRejectedValue(new Error('Database connection failed'));
    mockStorage.getUser.mockRejectedValue(new Error('User not found'));
  };
  
  // LLM service error scenarios
  const setupLLMErrorMocks = () => {
    const mockGenerateAnalysis = require('../../../server/services/analysisLLM').generateAnalysis;
    mockGenerateAnalysis.mockRejectedValue(new Error('LLM service unavailable'));
  };
  
  // Network error scenarios
  const setupNetworkErrorMocks = () => {
    const mockGenerateResponse = require('../../../server/services/anthropic').generateResponse;
    mockGenerateResponse.mockRejectedValue(new Error('Network timeout'));
  };
  
  return {
    setupDatabaseErrorMocks,
    setupLLMErrorMocks,
    setupNetworkErrorMocks
  };
};

/**
 * Reset all integration mocks to clean state
 */
export const resetIntegrationMocks = () => {
  jest.clearAllMocks();
  
  // Reset to default workflow setup
  setupWorkflowMocks();
};

/**
 * Helper to create realistic test scenarios
 */
export const createTestScenario = (scenarioName: string, userId: string = 'test-user-integration') => {
  switch (scenarioName) {
    case 'eligible-user':
      setupAnalysisWorkflowMocks(userId);
      break;
      
    case 'ineligible-user':
      setupIneligibleUserMocks(userId, 5);
      break;
      
    case 'conversation-flow':
      setupConversationFlowMocks(userId);
      break;
      
    case 'api-contracts':
      setupAPIContractMocks(userId);
      break;
      
    case 'error-scenarios':
      return setupErrorScenarioMocks();
      
    default:
      setupWorkflowMocks();
  }
}; 