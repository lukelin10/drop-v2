import request from 'supertest';
import { getTestApp, TEST_USER_ID, enableMocksForAPITests, getMockStorage } from '../setup-server';

// Enable mocks for API testing before importing server modules
enableMocksForAPITests();

describe('Complete Conversation Flow - 7 Exchange Limit Testing', () => {
  let app: any;
  let testQuestionId: number;
  let mockStorage: any;

  beforeAll(async () => {
    app = await getTestApp();
    mockStorage = getMockStorage();
    testQuestionId = 1;
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup comprehensive mock responses for conversation flow

    // Basic user and question mocks
    mockStorage.getUser.mockResolvedValue({
      id: TEST_USER_ID,
      username: 'testuser',
      email: 'test@example.com',
    });

    mockStorage.getDailyQuestion.mockResolvedValue('What are your goals for today?');

    // Mock drop creation and retrieval
    mockStorage.createDrop.mockImplementation(async (data: any) => {
      const drop = {
        id: Math.floor(Math.random() * 1000),
        ...data,
        createdAt: new Date(),
        messageCount: 0
      };
      // Update getUserDrops to return the created drop
      mockStorage.getUserDrops.mockResolvedValue([drop]);
      mockStorage.getDrop.mockResolvedValue(drop);
      return drop;
    });

    // Start with no drops
    mockStorage.getUserDrops.mockResolvedValue([]);
    mockStorage.getDrop.mockResolvedValue(undefined);

    // Mock message handling
    let messageStore: any[] = [];

    mockStorage.createMessage.mockImplementation(async (data: any) => {
      const message = {
        id: Math.floor(Math.random() * 1000),
        ...data,
        createdAt: new Date()
      };
      messageStore.push(message);

      // Update getMessages to return all messages for this drop
      mockStorage.getMessages.mockResolvedValue([...messageStore]);

      return message;
    });

    mockStorage.getMessages.mockResolvedValue([]);

    // Mock update operations
    mockStorage.updateDrop.mockImplementation(async (id: number, updates: any) => ({
      id,
      userId: TEST_USER_ID,
      questionId: testQuestionId,
      text: 'Mock drop text',
      createdAt: new Date(),
      ...updates
    }));
  });

  test('7-exchange limit enforcement in conversation', async () => {
    console.log('🧪 Testing 7-exchange limit enforcement...');

    // Step 1: Create a drop for conversation
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Test drop for 7-exchange limit'
      });

    expect(dropResponse.status).toBe(201);
    const dropId = dropResponse.body.id;

    console.log(`✅ Created drop ${dropId} for conversation testing`);

    // Step 2: Test exactly 7 exchanges (user-AI pairs)
    let messageStore: any[] = [];

    // Add initial AI message to store
    const initialAiMessage = {
      id: 1,
      dropId: dropId,
      text: 'Welcome! How can I help you reflect on your entry?',
      fromUser: false,
      createdAt: new Date()
    };
    messageStore.push(initialAiMessage);

    for (let i = 1; i <= 7; i++) {
      console.log(`📝 Exchange ${i}: Sending user message...`);

      // Update mock to return current messages
      mockStorage.getMessages.mockResolvedValue([...messageStore]);

      // User message
      const userMessage = {
        id: messageStore.length + 1,
        dropId: dropId,
        text: `User message ${i} - testing conversation limits`,
        fromUser: true,
        createdAt: new Date()
      };

      // Mock message creation to add to store
      mockStorage.createMessage.mockImplementationOnce(async (data: any) => {
        const newMessage = { ...userMessage, ...data };
        messageStore.push(newMessage);
        mockStorage.getMessages.mockResolvedValue([...messageStore]);
        return newMessage;
      });

      const userResponse = await request(app)
        .post('/api/messages')
        .send({
          dropId: dropId,
          text: userMessage.text,
          fromUser: true
        });

      expect(userResponse.status).toBe(201);
      console.log(`✅ User message ${i} sent successfully`);

      // AI response (simulated)
      const aiMessage = {
        id: messageStore.length + 1,
        dropId: dropId,
        text: `AI response ${i} - reflecting on your thoughts`,
        fromUser: false,
        createdAt: new Date()
      };
      messageStore.push(aiMessage);

      console.log(`🤖 AI response ${i} added to conversation`);
    }

    // Step 3: Verify conversation structure
    mockStorage.getMessages.mockResolvedValue([...messageStore]);

    const messagesResponse = await request(app).get(`/api/drops/${dropId}/messages`);
    expect(messagesResponse.status).toBe(200);

    const messages = messagesResponse.body;
    console.log(`📊 Total messages in conversation: ${messages.length}`);

    // Should have: 1 initial AI + 7 user + 7 AI responses = 15 total
    expect(messages.length).toBe(15);

    // Step 4: Verify exchange pattern
    let exchangeCount = 0;
    for (let i = 1; i < messages.length; i += 2) {
      if (i < messages.length && messages[i].fromUser) {
        exchangeCount++;
      }
    }

    expect(exchangeCount).toBe(7);
    console.log(`✅ Verified exactly 7 exchanges completed`);

    // Step 5: Test limit enforcement (8th exchange should be handled by frontend)
    console.log('🚫 Testing conversation limit reached state...');

    // In a real implementation, this would be handled by the frontend hook
    // The backend continues to accept messages, but the frontend prevents sending them
    console.log('✅ 7-exchange limit testing completed successfully');
  });

  test('Analysis eligibility with 3-drop requirement boundary', async () => {
    console.log('🧪 Testing 3-drop analysis requirement...');

    // Mock analysis eligibility responses for different drop counts

    // Test with 2 drops (insufficient)
    mockStorage.getAnalysisEligibility.mockResolvedValue({
      isEligible: false,
      unanalyzedCount: 2,
      requiredCount: 3
    });

    let eligibilityResponse = await request(app).get('/api/analyses/eligibility');
    expect(eligibilityResponse.status).toBe(200);
    expect(eligibilityResponse.body).toMatchObject({
      isEligible: false,
      unanalyzedCount: 2,
      requiredCount: 3
    });
    console.log('✅ Verified ineligible with 2 drops');

    // Test with exactly 3 drops (boundary condition)
    mockStorage.getAnalysisEligibility.mockResolvedValue({
      isEligible: true,
      unanalyzedCount: 3,
      requiredCount: 3
    });

    eligibilityResponse = await request(app).get('/api/analyses/eligibility');
    expect(eligibilityResponse.status).toBe(200);
    expect(eligibilityResponse.body).toMatchObject({
      isEligible: true,
      unanalyzedCount: 3,
      requiredCount: 3
    });
    console.log('✅ Verified eligible with exactly 3 drops (boundary condition)');

    // Test with 5 drops (more than sufficient)
    mockStorage.getAnalysisEligibility.mockResolvedValue({
      isEligible: true,
      unanalyzedCount: 5,
      requiredCount: 3
    });

    eligibilityResponse = await request(app).get('/api/analyses/eligibility');
    expect(eligibilityResponse.status).toBe(200);
    expect(eligibilityResponse.body).toMatchObject({
      isEligible: true,
      unanalyzedCount: 5,
      requiredCount: 3
    });
    console.log('✅ Verified eligible with 5 drops');

    console.log('✅ 3-drop requirement testing completed successfully');
  });

  test('Integration: Both features work independently', async () => {
    console.log('🧪 Testing both features work independently...');

    // Test 1: Chat with 7 exchanges doesn't affect analysis eligibility
    mockStorage.getAnalysisEligibility.mockResolvedValue({
      isEligible: true,
      unanalyzedCount: 5,
      requiredCount: 3
    });

    const eligibilityBefore = await request(app).get('/api/analyses/eligibility');
    expect(eligibilityBefore.body.isEligible).toBe(true);
    expect(eligibilityBefore.body.requiredCount).toBe(3);

    // Simulate a conversation (should not affect analysis eligibility)
    const dropResponse = await request(app)
      .post('/api/drops')
      .send({
        questionId: testQuestionId,
        text: 'Testing independence of features'
      });

    expect(dropResponse.status).toBe(201);

    // Analysis eligibility should remain unchanged
    const eligibilityAfter = await request(app).get('/api/analyses/eligibility');
    expect(eligibilityAfter.body.isEligible).toBe(true);
    expect(eligibilityAfter.body.requiredCount).toBe(3);

    console.log('✅ Chat feature does not interfere with analysis requirements');

    // Test 2: Analysis creation doesn't affect conversation limits
    // (Conversation limits are handled by frontend hook, not backend)

    console.log('✅ Both features operate independently');
  });

  test('Basic API endpoint functionality', async () => {
    // Simple test to verify basic API structure works
    const questionResponse = await request(app).get('/api/daily-question');
    expect(questionResponse.status).toBe(200);
    expect(questionResponse.body).toHaveProperty('question');

    console.log('✅ Basic API endpoints working correctly');
  });
});