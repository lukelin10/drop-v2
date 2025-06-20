# Task List: Analysis Feature Implementation

Based on PRD: `prd-analysis-feature.md`

## Relevant Files

- `server/db/schema.sql` - Database schema additions for analyses and analysis_drops tables
- `server/db/migrations/add_analysis_tables.sql` - Migration file for new analysis tables
- `server/models/Analysis.js` - Analysis model with database operations
- `server/models/Analysis.test.js` - Unit tests for Analysis model
- `server/routes/analyses.js` - API routes for analysis operations
- `server/routes/analyses.test.js` - Unit tests for analysis API routes
- `server/services/llmService.js` - LLM integration service for generating analyses
- `server/services/llmService.test.js` - Unit tests for LLM service
- `server/services/analysisService.js` - Business logic for analysis operations
- `server/services/analysisService.test.js` - Unit tests for analysis service
- `client/src/pages/Analysis.tsx` - Main analysis feed page (replaces existing)
- `client/src/pages/Analysis.test.tsx` - Unit tests for Analysis page
- `client/src/pages/AnalysisDetail.tsx` - Individual analysis display page
- `client/src/pages/AnalysisDetail.test.tsx` - Unit tests for AnalysisDetail page
- `client/src/components/AnalysisCard.tsx` - Analysis preview card component
- `client/src/components/AnalysisCard.test.tsx` - Unit tests for AnalysisCard component
- `client/src/components/AnalysisProgress.tsx` - Progress tracking component
- `client/src/components/AnalysisProgress.test.tsx` - Unit tests for AnalysisProgress component
- `client/src/components/AnalysisLoading.tsx` - Loading screen component
- `client/src/components/AnalysisLoading.test.tsx` - Unit tests for AnalysisLoading component
- `client/src/hooks/useAnalyses.ts` - Custom hook for analysis operations
- `client/src/hooks/useAnalyses.test.ts` - Unit tests for useAnalyses hook
- `client/src/hooks/useAnalysisEligibility.ts` - Custom hook for eligibility checking
- `client/src/hooks/useAnalysisEligibility.test.ts` - Unit tests for useAnalysisEligibility hook
- `client/src/api/analysisApi.ts` - API client functions for analysis operations
- `client/src/api/analysisApi.test.ts` - Unit tests for analysis API client
- `client/src/types/analysis.ts` - TypeScript type definitions for analysis data
- `tests/integration/analysis-workflow.test.js` - End-to-end analysis workflow integration tests
- `tests/integration/analysis-api.test.js` - API integration tests with database
- `tests/integration/analysis-ui.test.js` - Frontend integration tests with API mocking
- `tests/integration/llm-integration.test.js` - LLM service integration tests
- `tests/e2e/analysis-feature.spec.js` - End-to-end tests using Playwright/Cypress

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `Analysis.tsx` and `Analysis.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Integration tests should be run in a separate test database environment to avoid affecting development data.
- Database migrations should be run in order and tested in a development environment before production deployment.
- E2E tests require a full application setup and should be run against a staging environment.
- **UI Consistency**: All new components must reuse existing design tokens, components, and patterns from the app. Reference the existing Analysis.tsx page for layout structure, card styling, and color schemes.
- **Component Reuse**: Before creating new UI components, check if existing components can be extended or reused (Button, Card, Loading, Icons, Typography classes).
- **Design System**: Follow the app's established design system including spacing utilities (p-4, mb-3), color classes (primary, secondary, muted-foreground), and icon patterns (ri-* classes).

## Tasks

- [ ] 1.0 Database Schema & Backend Infrastructure
  - [ ] 1.1 Create database migration for `analyses` table with fields: id, user_id, content, summary, bullet_points, created_at, is_favorited
  - [ ] 1.2 Create database migration for `analysis_drops` junction table to track which drops were included in each analysis
  - [ ] 1.3 Add `last_analysis_date` field to users table via migration
  - [ ] 1.4 Create Analysis model with CRUD operations (create, read, update favorite status)
  - [ ] 1.5 Implement API endpoints: POST /api/analyses, GET /api/analyses, GET /api/analyses/:id, PUT /api/analyses/:id/favorite, GET /api/analyses/eligibility
  - [ ] 1.6 Add database indexes for performance optimization on user_id and created_at fields
  - [ ] 1.7 Write unit tests for Analysis model and API endpoints

- [ ] 2.0 Analysis Eligibility & Progress Tracking System
  - [ ] 2.1 Implement logic to count unanalyzed drops since last analysis
  - [ ] 2.2 Create eligibility check service that returns current progress (e.g., 4 out of 7)
  - [ ] 2.3 Build AnalysisProgress component with visual progress bar and counter display, reusing existing progress bar components and color scheme from the app where possible
  - [ ] 2.4 Implement "Run Analysis" button using existing Button component with consistent styling and primary color theme
  - [ ] 2.5 Add subtitle text "Drop deeper with an analysis after 7 entries" using existing typography classes and muted text colors
  - [ ] 2.6 Create useAnalysisEligibility hook to manage eligibility state
  - [ ] 2.7 Implement counter reset logic after analysis completion
  - [ ] 2.8 Write unit tests for eligibility logic and progress components

- [ ] 3.0 LLM Integration & Analysis Generation
  - [ ] 3.1 Create LLM service with the specified analysis prompt for psychology/CBT/life coaching insights
  - [ ] 3.2 Implement function to compile chat histories from 7+ unanalyzed drops
  - [ ] 3.3 Add retry logic with exponential backoff for failed LLM requests (up to 2 retries)
  - [ ] 3.4 Set appropriate timeout limits for analysis generation requests
  - [ ] 3.5 Implement rate limiting to prevent LLM service abuse
  - [ ] 3.6 Add logging for analysis requests and responses for monitoring
  - [ ] 3.7 Parse LLM response to extract one-line summary, 3 paragraphs, and 3-5 bullet points
  - [ ] 3.8 Create analysis service to orchestrate the full analysis generation process
  - [ ] 3.9 Write comprehensive unit tests for LLM integration and analysis generation

- [ ] 4.0 Analysis Feed & Display Components
  - [ ] 4.1 Replace existing Analysis.tsx with new analysis feed implementation, maintaining the same layout structure and section styling as current page
  - [ ] 4.2 Create AnalysisCard component using existing card component as base, maintaining consistent padding, border radius, and shadow styling
  - [ ] 4.3 Implement chronological feed layout (newest first) using existing spacing utilities and grid/flex patterns from the app
  - [ ] 4.4 Add heart/favorite toggle functionality using existing icon components (ri-heart-line/ri-heart-fill) and primary/secondary color scheme
  - [ ] 4.5 Implement infinite scroll or pagination matching existing patterns in the app (reuse pagination components if available)
  - [ ] 4.6 Create useAnalyses hook for fetching and managing analysis data
  - [ ] 4.7 Add loading states using existing loading components/skeletons and empty states using existing empty state patterns
  - [ ] 4.8 Ensure all components use existing design tokens (colors, typography, spacing) from the app's theme system
  - [ ] 4.9 Implement smooth animations using existing animation utilities and transition classes from the app
  - [ ] 4.10 Write unit tests for feed components and analysis management hooks

- [ ] 5.0 Individual Analysis Page & Navigation
  - [ ] 5.1 Create AnalysisDetail.tsx page using existing page layout components and maintaining consistent header/content structure
  - [ ] 5.2 Implement typography hierarchy using existing text classes (text-base, text-sm, text-xs) and font weights from the app's design system
  - [ ] 5.3 Add navigation from analysis cards using existing navigation patterns and link components
  - [ ] 5.4 Implement back navigation using existing back button component or icon (ri-arrow-left-line) with consistent styling
  - [ ] 5.5 Add routing for /analysis (feed) and /analysis/:id (individual analysis) following existing routing patterns
  - [ ] 5.6 Handle deep linking to specific analyses using existing routing utilities
  - [ ] 5.7 Add heart/favorite functionality using the same heart icon components and interaction patterns as the feed
  - [ ] 5.8 Use existing spacing utilities (p-4, mb-3, etc.) and layout components to maintain visual consistency
  - [ ] 5.9 Add loading states using existing loading spinner/skeleton components from the app
  - [ ] 5.10 Write unit tests for analysis detail page and navigation

- [ ] 6.0 Error Handling & Reliability Features
  - [ ] 6.1 Implement automatic retry mechanism for failed analysis generation (up to 2 retries)
  - [ ] 6.2 Create appropriate error messages for analysis generation failures
  - [ ] 6.3 Add error logging for debugging analysis failures
  - [ ] 6.4 Implement data integrity checks during analysis failures
  - [ ] 6.5 Create AnalysisLoading component using existing loading patterns, spinner components, and maintaining consistent modal/overlay styling
  - [ ] 6.6 Add error boundaries for analysis-related components
  - [ ] 6.7 Implement graceful degradation for network connectivity issues
  - [ ] 6.8 Add validation to prevent duplicate analyses of the same drop set
  - [ ] 6.9 Create comprehensive error handling tests and edge case scenarios

- [ ] 7.0 Integration & End-to-End Testing
  - [ ] 7.1 Create integration tests for complete analysis workflow (eligibility check → analysis generation → storage → display)
  - [ ] 7.2 Write API integration tests with real database operations (create, read, update analyses)
  - [ ] 7.3 Implement frontend integration tests with mocked API responses for all user flows
  - [ ] 7.4 Create LLM service integration tests with mock responses and error scenarios
  - [ ] 7.5 Write database integration tests for analysis and drop relationship tracking
  - [ ] 7.6 Implement cross-component integration tests for navigation between analysis feed and detail pages
  - [ ] 7.7 Create end-to-end tests covering the complete user journey from progress tracking to analysis viewing
  - [ ] 7.8 Add performance integration tests for analysis feed pagination and loading
  - [ ] 7.9 Write integration tests for error scenarios (LLM failures, network issues, database errors)
  - [ ] 7.10 Create regression tests to ensure existing drop functionality remains unaffected 