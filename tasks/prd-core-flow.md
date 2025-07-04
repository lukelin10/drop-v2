# Product Requirements Document: Core Flow (Question → Chat → Feed)

## Introduction/Overview

The Core Flow represents the fundamental user journey in the personal growth and self-reflection application. This three-stage process guides users through daily introspection via structured questions, deepens their reflection through AI-powered conversations, and provides a historical view of their growth journey. The system combines structured prompts with gentle AI coaching to help users develop greater self-awareness and facilitate personal growth.

**Problem Statement:** Many people struggle with consistent self-reflection and lack the structure or guidance needed to develop deeper self-awareness and personal growth.

**Goal:** Create a supportive, structured system that guides users through daily self-reflection, provides gentle AI coaching to deepen insights, and maintains a persistent record of their personal growth journey.

## Goals

1. **Enable daily self-reflection** through thoughtfully curated questions that rotate systematically
2. **Deepen introspection** via AI-powered conversations that encourage users to explore their thoughts more thoroughly
3. **Create a persistent growth record** that users can reference to track their development over time
4. **Provide gentle, supportive guidance** through an AI coach that acts as a hybrid therapist/coach/trusted friend
5. **Maintain user engagement** through a simple, intuitive flow that reduces friction in the reflection process
6. **Build sustainable reflection habits** by providing structure and encouragement for consistent practice

## User Stories

### Daily Question Stage
1. **As a user**, I want to see today's reflective question prominently displayed, so I can begin my daily reflection practice.
2. **As a user**, I want to see the current date displayed with the question, so I have context for my reflection.
3. **As a user**, I want to be prevented from answering the same question twice in one day, so I maintain the integrity of my daily practice.
4. **As a user**, I want to see a success screen after answering, so I know my reflection was saved successfully.
5. **As a user**, I want to be automatically redirected to the conversation, so I can continue deepening my reflection.

### Chat/Conversation Stage
6. **As a user**, I want to see the original question and my response at the top of the chat, so I maintain context throughout the conversation.
7. **As a user**, I want to receive an immediate, personalized AI response to my reflection, so I feel heard and can begin the deeper conversation.
8. **As a user**, I want to engage in a back-and-forth conversation with the AI, so I can explore my thoughts more deeply.
9. **As a user**, I want to see a conversation limit counter, so I understand the boundaries of each session.
10. **As a user**, I want the AI to be supportive, gentle, and motivational, so I feel encouraged rather than judged.
11. **As a user**, I want the AI to remember our conversation history, so responses feel contextual and meaningful.
12. **As a user**, I want to see typing indicators when the AI is responding, so I know the system is working.

### Feed/History Stage
13. **As a user**, I want to see all my past reflections in chronological order, so I can track my growth over time.
14. **As a user**, I want to see both the question and my response in each feed item, so I can quickly understand the context.
15. **As a user**, I want to click on any past reflection to revisit the full conversation, so I can continue or review previous insights.
16. **As a user**, I want to see the date and message count for each reflection, so I can gauge the depth of each conversation.
17. **As a user**, I want to see an empty state with encouragement when I haven't started reflecting yet, so I feel motivated to begin.

## Functional Requirements

### 1. Daily Question System
- The system must display a single question per day for each user
- Questions must rotate systematically through the database, not randomly
- The system must track which questions have been used and when
- The system must prevent users from answering the same question twice in one day
- The system must advance to the next unused question when all questions have been used
- The system must display the current date prominently with the question
- The system must handle timezone considerations for "daily" question rotation

### 2. Question Management
- The system must store questions in a database with metadata (category, usage count, last used date)
- The system must support question categorization for future feature expansion
- The system must track question usage statistics
- The system must support adding new questions through the admin interface
- The system must allow questions to be marked as active/inactive
- The system must provide fallback questions if no active questions exist

### 3. Drop Creation (Answer Submission)
- The system must validate that users provide a non-empty response to the daily question
- The system must create a "drop" record linking the question, user response, and metadata
- The system must prevent duplicate drops for the same question on the same day
- The system must automatically redirect users to the conversation after successful submission
- The system must provide appropriate error handling for failed submissions
- The system must track drop creation timestamps for analysis purposes

### 4. AI Conversation System
- The system must generate an immediate, personalized AI response when a drop is created
- The system must display the original question and user response at the top of the conversation
- The system must support back-and-forth messaging between user and AI
- The system must maintain conversation history for context in AI responses
- The system must limit conversations to 7 exchanges
- The system must display a conversation counter showing current progress toward limit
- The system must provide visual feedback when the conversation limit is reached
- The system must generate responses asynchronously to avoid blocking the UI

### 5. AI Response Generation
- The system must use Anthropic's Claude API for AI response generation
- The system must include full conversation history in AI prompts for contextual responses
- The system must handle API failures gracefully with appropriate fallback messages
- The system must implement retry logic for failed API calls
- The system must provide timeout handling for slow API responses
- The system must maintain a supportive, gentle, and motivational tone in all responses
- The system must act as a hybrid therapist/coach/trusted friend in conversation style

### 6. Message Storage and Retrieval
- The system must store all messages (user and AI) in chronological order
- The system must link messages to their respective drops
- The system must track message creation timestamps
- The system must distinguish between user messages and AI messages
- The system must update drop message counts when new messages are added
- The system must support efficient retrieval of conversation history

### 7. Feed Display System
- The system must display all user drops in reverse chronological order (newest first)
- The system must show both the question text and user response for each drop
- The system must display the creation date and message count for each drop
- The system must provide navigation to individual conversations from the feed
- The system must handle empty states when users have no drops
- The system must support loading states during data retrieval
- The system must provide appropriate error handling for feed loading failures

### 8. Navigation and User Experience
- The system must provide smooth transitions between question → chat → feed stages
- The system must support direct navigation to the latest conversation
- The system must maintain loading states during transitions
- The system must provide clear visual feedback for user actions
- The system must support browser back/forward navigation
- The system must handle deep linking to specific conversations

### 9. Data Persistence and Security
- The system must ensure all user data is properly associated with authenticated users
- The system must prevent users from accessing other users' data
- The system must maintain data integrity across all operations
- The system must handle concurrent user sessions appropriately
- The system must provide audit trails for data modifications

### 10. Performance and Scalability
- The system must handle AI response generation without blocking the UI
- The system must optimize database queries for feed loading
- The system must implement appropriate caching strategies
- The system must handle multiple concurrent users efficiently
- The system must provide reasonable response times for all operations

## Non-Goals (Out of Scope)

1. **Multi-day conversation continuity** - each conversation is intended to be completed in a single session
2. **Question customization by users** - questions are managed centrally and rotate systematically
3. **Real-time collaborative features** - the system is designed for individual reflection
4. **Advanced AI personalities or settings** - the AI maintains a consistent supportive tone
5. **Conversation branching or threading** - conversations follow a linear back-and-forth pattern
6. **External integrations** - the system operates as a standalone reflection tool
7. **Multi-language support** - English-only for the current version
8. **Offline functionality** - requires internet connection for AI responses
9. **Advanced analytics dashboard** - basic usage tracking only
10. **User-generated questions** - questions are curated by the system
11. **Conversation export/sharing** - conversations remain private within the system
12. **Advanced accessibility features** - basic accessibility compliance only
13. **Mobile app features** - web app functionality only for current version
14. **Community features** - single-user focused for current version

## Design Considerations

### UI/UX Requirements
- **Clean, distraction-free interface** that encourages focus on reflection
- **Warm, supportive visual design** using terracotta and warm cream color palette
- **Clear visual hierarchy** with appropriate typography for readability
- **Intuitive navigation** between the three core stages
- **Responsive design** that works across different screen sizes
- **Consistent interaction patterns** throughout the application
- **Appropriate loading states** to manage user expectations
- **Error states** that are informative but not alarming

### Visual Design Elements
- Use serif fonts for questions to create a thoughtful, contemplative feel
- Implement gradient backgrounds for visual warmth and depth
- Use rounded corners and soft shadows for a gentle, approachable aesthetic
- Provide clear visual indicators for conversation progress and limits
- Use icons that reinforce the reflective and growth-oriented nature of the app
- Maintain consistent spacing and alignment throughout the interface

### Conversation Design
- **Opening AI responses** should acknowledge the user's reflection and invite deeper exploration
- **Follow-up questions** should be open-ended and non-judgmental
- **Conversation tone** should be consistently supportive, gentle, and motivational
- **Response length** should be conversational but not overwhelming
- **Closing responses** should provide gentle closure when approaching conversation limits

## Technical Considerations

### Database Schema
- **Questions table**: id, text, category, isActive, createdAt, lastUsedAt, usageCount
- **Drops table**: id, questionId, userId, text, createdAt, messageCount
- **Messages table**: id, dropId, text, fromUser, createdAt
- **Users table**: id, username, email, createdAt (basic user management)

### API Architecture
- **RESTful API design** with clear endpoints for each entity
- **Authentication middleware** to protect user data
- **Proper error handling** with meaningful error messages
- **Rate limiting** to prevent abuse of AI services
- **Async processing** for AI response generation
- **Database transaction management** for data integrity

### AI Integration
- **Anthropic Claude API** for conversation generation
- **Conversation history context** included in all AI prompts
- **Retry logic** for failed API calls
- **Timeout handling** for slow responses
- **Cost management** through conversation limits
- **Fallback responses** for API failures

### Performance Optimization
- **Efficient database queries** with proper indexing
- **Lazy loading** for conversation history
- **Response caching** where appropriate
- **Asynchronous AI processing** to avoid UI blocking
- **Optimized frontend bundle size** for fast loading

### Security Considerations
- **User authentication** required for all features
- **Authorization checks** to prevent cross-user data access
- **Input validation** for all user-submitted content
- **SQL injection prevention** through parameterized queries
- **API key security** for external service integration

## Success Metrics

1. **Daily Engagement**: 70% of active users answer the daily question within 24 hours of it being available
2. **Conversation Completion**: 60% of users who start a conversation reach at least 3 exchanges with the AI
3. **Return Engagement**: 50% of users who complete a conversation visit the feed to review past reflections
4. **Session Depth**: Average conversation length of 4+ exchanges among engaged users
5. **User Retention**: 40% of users who complete their first conversation return within 7 days
6. **Drop Completion Rate**: 80% of users who start answering a question successfully submit their response
7. **Technical Reliability**: 95% uptime for the core flow functionality
8. **AI Response Quality**: <2% of conversations require fallback responses due to AI failures

## Open Questions

1. **Question Rotation Strategy**: Should the system allow for seasonal or thematic question sets, or maintain the current sequential approach?
2. **Conversation Engagement**: Should the system provide additional encouragement or prompts to help users reach deeper exchanges in their conversations?
3. **Feed Interaction**: Should users be able to add notes or reflections to past conversations directly from the feed?
4. **AI Personality Customization**: Would users benefit from slight variations in AI coaching style based on their preferences?
5. **Progress Tracking**: Should the system provide more explicit progress indicators across the user's reflection journey?
6. **Question Difficulty Progression**: Should questions become more challenging or deeper over time as users develop their reflection skills?

---

**Target Audience**: Development team implementing and maintaining the core user flow
**Current Status**: Fully implemented and operational
**Future Evolution**: Mobile app expansion, community features, and advanced personalization planned 