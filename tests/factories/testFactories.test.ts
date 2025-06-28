/**
 * Test Data Factories Test
 * 
 * Simple verification that our test data factories work correctly
 */

import { 
  createMockUser, 
  createMockDrop, 
  createMockMessage,
  createMockQuestion,
  createMockAnalysis,
  createMockUsers,
  createMockDrops,
  createMockConversation,
  createMockAnalysisEligibility,
  createMockAnalysisResult,
  TEST_USER_IDS,
  TEST_DATES
} from './testData';

describe('Test Data Factories', () => {
  describe('createMockUser', () => {
    it('should create a user with default values', () => {
      const user = createMockUser();
      
      expect(user.id).toBe(TEST_USER_IDS.USER_1);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.createdAt).toEqual(TEST_DATES.PAST);
    });

    it('should allow overriding values', () => {
      const user = createMockUser({ 
        id: 'custom-id', 
        username: 'customuser' 
      });
      
      expect(user.id).toBe('custom-id');
      expect(user.username).toBe('customuser');
      expect(user.email).toBe('test@example.com'); // Should keep default
    });
  });

  describe('createMockDrop', () => {
    it('should create a drop with default values', () => {
      const drop = createMockDrop();
      
      expect(drop.id).toBe(1);
      expect(drop.questionId).toBe(1);
      expect(drop.userId).toBe(TEST_USER_IDS.USER_1);
      expect(drop.text).toContain('grateful');
    });

    it('should allow overriding values', () => {
      const drop = createMockDrop({ 
        id: 42, 
        text: 'Custom drop text' 
      });
      
      expect(drop.id).toBe(42);
      expect(drop.text).toBe('Custom drop text');
      expect(drop.questionId).toBe(1); // Should keep default
    });
  });

  describe('createMockAnalysis', () => {
    it('should create an analysis with default values', () => {
      const analysis = createMockAnalysis();
      
      expect(analysis.id).toBe(1);
      expect(analysis.userId).toBe(TEST_USER_IDS.USER_1);
      expect(analysis.content).toContain('journal entries');
      expect(analysis.summary).toContain('self-awareness');
      expect(analysis.bulletPoints).toContain('gratitude');
      expect(analysis.isFavorited).toBe(false);
    });

    it('should allow overriding values', () => {
      const analysis = createMockAnalysis({ 
        id: 99, 
        isFavorited: true,
        summary: 'Custom summary'
      });
      
      expect(analysis.id).toBe(99);
      expect(analysis.isFavorited).toBe(true);
      expect(analysis.summary).toBe('Custom summary');
    });
  });

  describe('createMockUsers', () => {
    it('should create multiple users', () => {
      const users = createMockUsers(3);
      
      expect(users).toHaveLength(3);
      expect(users[0].id).toBe('test-user-1');
      expect(users[1].id).toBe('test-user-2');
      expect(users[2].id).toBe('test-user-3');
      
      expect(users[0].username).toBe('testuser1');
      expect(users[1].username).toBe('testuser2');
      expect(users[2].username).toBe('testuser3');
    });
  });

  describe('createMockDrops', () => {
    it('should create multiple drops for a user', () => {
      const drops = createMockDrops(5, 'user-123');
      
      expect(drops).toHaveLength(5);
      expect(drops[0].id).toBe(1);
      expect(drops[4].id).toBe(5);
      
      // All should belong to the same user
      drops.forEach(drop => {
        expect(drop.userId).toBe('user-123');
      });

      // Should have different question IDs (rotating through 3)
      expect(drops[0].questionId).toBe(1);
      expect(drops[1].questionId).toBe(2);
      expect(drops[2].questionId).toBe(3);
      expect(drops[3].questionId).toBe(1); // Rotates back
    });
  });

  describe('createMockConversation', () => {
    it('should create a drop with messages', () => {
      const conversation = createMockConversation(42, 3);
      
      expect(conversation.drop.id).toBe(42);
      expect(conversation.drop.messageCount).toBe(3);
      expect(conversation.messages).toHaveLength(3);
      
      // First message should be from user, second from AI
      expect(conversation.messages[0].fromUser).toBe(true);
      expect(conversation.messages[1].fromUser).toBe(false);
    });
  });

  describe('createMockAnalysisEligibility', () => {
    it('should create eligibility data with defaults', () => {
      const eligibility = createMockAnalysisEligibility();
      
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.unanalyzedCount).toBe(8);
      expect(eligibility.requiredCount).toBe(7);
    });

    it('should allow overriding eligibility', () => {
      const eligibility = createMockAnalysisEligibility({
        isEligible: false,
        unanalyzedCount: 5
      });
      
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.unanalyzedCount).toBe(5);
      expect(eligibility.requiredCount).toBe(7); // Should keep default
    });
  });

  describe('createMockAnalysisResult', () => {
    it('should create successful result by default', () => {
      const result = createMockAnalysisResult();
      
      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.metadata.dropCount).toBe(7);
      expect(result.metadata.processingTime).toBe(1500);
    });

    it('should create failed result when requested', () => {
      const result = createMockAnalysisResult(false);
      
      expect(result.success).toBe(false);
      expect(result.analysis).toBeUndefined();
      expect(result.error).toBe('Mock analysis creation failed');
    });
  });
}); 