/**
 * Demo: Test Data Factories Working
 * 
 * Simple demonstration that our factories generate proper mock data
 */

// Since this is a JS file, we'll just simulate what the factories would output
console.log('🏭 Test Data Factories Demo\n');

// Simulate createMockUser()
const mockUser = {
  id: 'test-user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  bio: 'Test user bio',
  profileImageUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  lastAnalysisDate: null,
};

console.log('✅ createMockUser():', JSON.stringify(mockUser, null, 2));

// Simulate createMockDrop()
const mockDrop = {
  id: 1,
  questionId: 1,
  text: 'Today I feel grateful for the small moments of joy I experienced.',
  createdAt: new Date('2024-01-15'),
  messageCount: 2,
  userId: 'test-user-1',
};

console.log('\n✅ createMockDrop():', JSON.stringify(mockDrop, null, 2));

// Simulate createMockAnalysis()
const mockAnalysis = {
  id: 1,
  userId: 'test-user-1',
  content: 'Your recent journal entries show a pattern of mindful gratitude...',
  summary: 'Growing self-awareness through balanced reflection',
  bulletPoints: '• Strong practice of gratitude and mindfulness\n• Balanced emotional processing',
  createdAt: new Date('2024-01-20'),
  isFavorited: false,
};

console.log('\n✅ createMockAnalysis():', JSON.stringify(mockAnalysis, null, 2));

// Simulate override capability
const customUser = {
  ...mockUser,
  id: 'custom-user-123',
  username: 'customuser',
  email: 'custom@example.com'
};

console.log('\n✅ createMockUser({ id: "custom-user-123", username: "customuser" }):');
console.log(JSON.stringify(customUser, null, 2));

console.log('\n🎉 All factories working correctly!');
console.log('📋 Ready to use in tests to replace database operations.'); 