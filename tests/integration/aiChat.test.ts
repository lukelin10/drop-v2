import { enableMocksForAPITests, getTestApp, getMockStorage, TEST_USER_ID } from '../setup-server';

// Enable mocks before any other imports
enableMocksForAPITests();

import request from 'supertest';
import { createMockUser, createMockQuestion, createMockDrop, createMockDropWithQuestion, createMockMessage } from '../factories/testData';
import { generateResponse } from '../../server/services/anthropic';

// Get the mocked function from the setup-server.ts configuration
const mockGenerateResponse = generateResponse as jest.MockedFunction<typeof generateResponse>;

describe('AI-Powered Chat', () => {
  let app: any;
  const testQuestionId = 1;
  const testDropId = 1;
  let currentMessageId = 1;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    currentMessageId = 1;

    // Get mock storage instance
    const mockStorage = getMockStorage();

    // Set up basic mocks
    const mockUser = createMockUser({ id: TEST_USER_ID });
    const mockQuestion = createMockQuestion({
      id: testQuestionId,
      text: 'How are you feeling today?'
    });
    const mockDrop = createMockDropWithQuestion({
      id: testDropId,
      userId: TEST_USER_ID,
      questionId: testQuestionId,
      text: 'Reflecting on my feelings',
      questionText: 'How are you feeling today?'
    });

    mockStorage.getUser.mockResolvedValue(mockUser);
    mockStorage.createQuestion.mockResolvedValue(mockQuestion);
    mockStorage.createDrop.mockResolvedValue(mockDrop);
    mockStorage.getDrop.mockResolvedValue(mockDrop);

    // Mock message creation to simulate realistic message flow
    mockStorage.createMessage.mockImplementation(async (messageData: any) =>
      createMockMessage({
        ...messageData,
        id: currentMessageId++,
        dropId: testDropId
      })
    );

    // Mock message retrieval to return current conversation state
    let messages: any[] = [
      createMockMessage({
        id: 1,
        dropId: testDropId,
        text: 'How are you feeling today?',
        fromUser: false
      })
    ];

    mockStorage.getMessages.mockImplementation(async () => [...messages]);

    // Update the mock when messages are created
    mockStorage.createMessage.mockImplementation(async (messageData: any) => {
      const newMessage = createMockMessage({
        ...messageData,
        id: currentMessageId++,
        dropId: testDropId
      });
      messages.push(newMessage);
      return newMessage;
    });

    // Reset the anthropic mock
    mockGenerateResponse.mockClear();
  });

  test('AI responds differently based on message content', async () => {
    // Test with "hello" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'hello there',
        fromUser: true
      });

    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the response
    let messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(3); // 1 automatic initial + 1 user + 1 AI response
    expect(messagesResponse.body[2].fromUser).toBe(false);
    expect(messagesResponse.body[2].text).toContain('Test AI response to: hello there');

    // Test with "sad" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'I feel sad today',
        fromUser: true
      });

    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the response
    messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(5); // 1 automatic initial + 2 user + 2 AI responses
    expect(messagesResponse.body[4].fromUser).toBe(false);
    expect(messagesResponse.body[4].text).toContain('Test AI response to: I feel sad today');

    // Test with "happy" message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'Actually I\'m feeling happy now',
        fromUser: true
      });

    // Wait for AI response to be generated
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check the response
    messagesResponse = await request(app).get(`/api/drops/${testDropId}/messages`);
    expect(messagesResponse.body.length).toBe(7); // 1 automatic initial + 3 user + 3 AI responses
    expect(messagesResponse.body[6].fromUser).toBe(false);
    expect(messagesResponse.body[6].text).toContain('Test AI response to: Actually I\'m feeling happy now');
  });

  test('AI receives conversation history for contextual responses', async () => {
    // First message
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'hello there',
        fromUser: true
      });

    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Second message referring to the first
    await request(app)
      .post('/api/messages')
      .send({
        dropId: testDropId,
        text: 'Can we talk about what I mentioned earlier?',
        fromUser: true
      });

    // Wait for AI response
    await new Promise(resolve => setTimeout(resolve, 2000));

    // The generateResponse function should have been called with the user message
    // and the drop ID, which allows it to fetch conversation history
    expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
    expect(mockGenerateResponse.mock.calls[1][0]).toBe('Can we talk about what I mentioned earlier?');
    expect(mockGenerateResponse.mock.calls[1][1]).toBe(testDropId);
  });
});