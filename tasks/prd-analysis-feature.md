# Product Requirements Document: Analysis Feature

## Introduction/Overview

The Analysis feature provides users with AI-powered insights about their personal growth and patterns by analyzing their journal entries (drops). This feature replaces the existing static Analysis page with a dynamic system that generates personalized analyses when users have accumulated sufficient journal entries. The analysis uses an LLM to examine chat histories and identify patterns, blind spots, and growth opportunities that users may not recognize themselves.

**Problem Statement:** Users often miss important patterns and insights in their own journal entries, limiting their self-awareness and growth potential.

**Goal:** Provide users with regular, AI-generated analyses that reveal hidden patterns in their thinking, behavior, and emotional responses to accelerate personal growth and self-awareness.

## Goals

1. **Enable AI-powered self-reflection** by analyzing 7+ journal entries to identify patterns and insights
2. **Increase user engagement** by providing valuable, personalized insights that encourage continued journaling
3. **Improve self-awareness** by surfacing blind spots and growth opportunities users may not recognize
4. **Create a persistent knowledge base** of personal insights that users can reference over time
5. **Maintain high-quality analysis** through a structured LLM prompt that ensures consistent, actionable insights

## User Stories

1. **As a drop user**, I want to see how many entries I need before I can get an analysis, so I know when I'll be able to gain insights about my patterns.

2. **As a drop user**, I want to trigger an analysis when I have 7+ unanalyzed entries, so I can get personalized insights about my growth and patterns.

3. **As a drop user**, I want to see a loading screen while my analysis is being generated, so I know the system is working on my insights.

4. **As a drop user**, I want to view a comprehensive analysis of my recent entries, so I can understand patterns I may have missed.

5. **As a drop user**, I want to heart/favorite analyses that resonate with me, so I can easily find the most meaningful insights later.

6. **As a drop user**, I want to browse my historical analyses in chronological order, so I can track my growth over time.

7. **As a drop user**, I want the system to retry failed analyses automatically, so I don't lose the opportunity for insights due to temporary technical issues.

8. **As a drop user**, I want to navigate to a dedicated page for each analysis, so I can read the full content without distractions.

## Functional Requirements

### 1. Analysis Eligibility System
- The system must track unanalyzed drops since the last analysis
- The system must display a progress counter (e.g., "4 out of 7") when user has fewer than 7 unanalyzed drops
- The system must show a "Run Analysis" button when user has 7 or more unanalyzed drops
- The counter must reset to 0 after each analysis is completed
- Users can only generate 1 analysis at a time when they have 7+ unanalyzed drops

### 2. Analysis Trigger & Processing
- Users must manually trigger analysis initiation
- The system must include all drops since the last analysis (minimum 7, can be more)
- The system must send the complete chat history (question, answer, and entire conversation) to the LLM
- The system must use the specified LLM prompt for consistent analysis generation
- The system must display a loading screen during analysis generation
- Users must not be able to cancel an analysis once initiated

### 3. Analysis Output Format
- The analysis must include a one-line summary (15 words or less) at the top
- The analysis body must be limited to maximum 3 paragraphs total
- The analysis summary must include 3-5 bullet points highlighting key patterns/recommendations
- The analysis must maintain a direct, insightful, and actionable tone
- The analysis must focus on psychology, cognitive behavioral therapy, and life coaching insights

### 4. Analysis Storage & Persistence
- All analyses must be stored indefinitely in the database
- Each analysis must be associated with the user and include a timestamp
- The system must track which drops were included in each analysis
- The system must prevent duplicate analyses of the same drop set

### 5. Analysis Display & Interaction
- The main screen must display analyses in a feed format, organized by date (newest first)
- Each analysis card must show a preview of the content
- Users must be able to tap on an analysis card to navigate to a dedicated analysis page
- Each analysis must have its own separate page displaying the full analysis content
- Users must be able to navigate back to the analysis feed from the individual analysis page
- Users must be able to heart/favorite analyses that resonate with them
- The system must visually indicate which analyses have been hearted

### 6. Error Handling & Reliability
- The system must automatically retry failed analyses up to 2 times
- The system must display appropriate error messages if all retries fail
- The system must maintain data integrity during analysis failures
- The system must log analysis failures for debugging purposes

### 7. Progress Tracking UI
- The progress counter must show current unanalyzed drops (e.g., "4 out of 7")
- The progress bar must visually fill up as the user approaches 7 drops
- The subtitle must display "Drop deeper with an analysis after 7 entries"
- The UI must clearly distinguish between progress state and ready-to-analyze state

## Non-Goals (Out of Scope)

1. **Automatic analysis triggering** - analyses will only be manually initiated
2. **Analysis sharing functionality** - this will be added in future versions
3. **Analysis editing or customization** - the LLM prompt is fixed for consistency
4. **Analysis categorization or filtering** - feed will be chronological only
5. **Export or download functionality** - analyses remain within the app
6. **Real-time analysis updates** - analyses are generated once and stored
7. **Collaborative analysis features** - analyses are personal and private
8. **Advanced accessibility features** - basic accessibility only for this version
9. **Multiple concurrent analyses** - users can only generate 1 analysis at a time
10. **Analysis notifications** - notification system will be added later
11. **Advanced privacy controls** - basic privacy only for this version
12. **Human review process** - no quality assurance review for this version
13. **A/B testing of prompts** - fixed prompt format for this version

## Design Considerations

### UI/UX Requirements
- **Progress Indicator**: Use a visual progress bar that fills up as users approach 7 drops
- **Analysis Cards**: Design cards that show analysis preview with clear call-to-action
- **Loading State**: Implement an engaging loading screen with progress indication
- **Heart Feature**: Use a heart icon that can be toggled on/off for favoriting
- **Feed Layout**: Implement infinite scroll or pagination for historical analyses
- **Visual Hierarchy**: Ensure the "Run Analysis" button is prominent when available
- **Navigation**: Implement clear navigation between analysis feed and individual analysis pages
- **Analysis Page**: Design a clean, readable layout for full analysis content

### Visual Design Elements
- Use consistent card design matching the existing app aesthetic
- Implement smooth animations for progress bar and heart interactions
- Use appropriate icons for progress tracking and analysis states
- Maintain color consistency with the existing app theme
- Ensure proper typography hierarchy for analysis content readability

## Technical Considerations

### Database Schema
- Create an `analyses` table with fields: id, user_id, content, summary, bullet_points, created_at, is_favorited
- Create an `analysis_drops` junction table to track which drops were included in each analysis
- Add a `last_analysis_date` field to the users table to track analysis eligibility

### API Endpoints
- `POST /api/analyses` - Create new analysis
- `GET /api/analyses` - Retrieve user's analyses (paginated)
- `GET /api/analyses/:id` - Retrieve specific analysis details
- `PUT /api/analyses/:id/favorite` - Toggle analysis favorite status
- `GET /api/analyses/eligibility` - Check if user can run analysis

### LLM Integration
- Implement retry logic with exponential backoff for failed requests
- Set appropriate timeout limits for analysis generation
- Log analysis requests and responses for quality monitoring
- Implement rate limiting to prevent abuse

### Performance Considerations
- Cache analysis results to avoid regeneration
- Implement efficient pagination for analysis feed
- Optimize database queries for analysis retrieval
- Consider background processing for analysis generation

### Routing & Navigation
- Implement dedicated routes for analysis feed (`/analysis`) and individual analysis (`/analysis/:id`)
- Ensure proper back navigation from analysis detail to feed
- Handle deep linking to specific analyses

## Success Metrics

1. **User Engagement**: 60% of eligible users (7+ drops) trigger an analysis within 7 days
2. **Analysis Quality**: 80% of users heart at least one analysis within 30 days
3. **Retention Impact**: Users who receive analyses show 20% higher 30-day retention
4. **Feature Adoption**: 40% of active users generate at least one analysis per month
5. **Technical Reliability**: 95% of analysis requests complete successfully (including retries)
6. **Navigation Usage**: 70% of users who view analysis cards navigate to full analysis pages

---

**Target Audience**: Junior developers implementing the analysis feature
**Estimated Effort**: 3-4 weeks for full implementation
**Priority**: High - core feature for user engagement and retention 