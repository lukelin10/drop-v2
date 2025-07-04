# Task List: Flow Updates Implementation

## Relevant Files

- `client/src/hooks/useMessages.ts` - Contains the MESSAGE_LIMIT constant (currently 5, needs to be 7)
- `client/src/pages/Chat.tsx` - Displays the conversation counter using MESSAGE_LIMIT from the hook
- `client/src/hooks/useAnalysisEligibility.ts` - Contains requiredCount placeholder (currently 7, needs to be 3)
- `server/DatabaseStorage.ts` - Contains analysis eligibility logic with requiredCount hardcoded to 7
- `server/services/analysisService.ts` - Contains analysis validation logic checking for minimum 7 drops
- `server/services/analysisLLM.ts` - Contains LLM analysis logic with hardcoded minimum 7 drops requirement
- `tests/unit/messageConversation.test.ts` - Unit tests for message conversation limits
- `tests/unit/analysis.test.ts` - Unit tests for analysis eligibility logic
- `tests/integration/conversationFlow.test.ts` - Integration tests for conversation flow
- `tests/integration/analysis-integration.test.ts` - Integration tests for analysis API
- `tests/integration/analysisWorkflow.test.ts` - Integration tests for analysis workflow
- `tests/unit/analysisService.test.ts` - Unit tests for analysis service
- `tests/integration/analysisFrontend.test.tsx` - Frontend integration tests for analysis
- `client/src/components/AnalysisProgress.tsx` - UI component displaying analysis progress
- `client/src/pages/Analysis.tsx` - Analysis page with eligibility messaging
- `client/src/pages/__tests__/Analysis.test.tsx` - Unit tests for Analysis page
- `tasks/prd-core-flow.md` - Updated PRD with new chat limit
- `tasks/prd-analysis-feature.md` - Updated PRD with new analysis requirement

### Testing Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Use [testing-rules.mdc](mdc:.cursor/rules/testing-rules.mdc) tests are built to ensure consistency across the application

## Tasks

- [x] 1.0 Update Chat Exchange Limit from 5 to 7
  - [x] 1.1 Change MESSAGE_LIMIT constant from 5 to 7 in `client/src/hooks/useMessages.ts`
  - [x] 1.2 Update related unit tests in `tests/unit/messageConversation.test.ts` to reflect new limit
  - [x] 1.3 Update integration tests in `tests/integration/conversationFlow.test.ts` that test conversation limits
  - [x] 1.4 Update any test mocks or factories that create conversations with hardcoded 5-exchange limits
  - [x] 1.5 Verify Chat.tsx UI correctly displays the new limit counter (should update automatically via hook)
  - [x] 1.6 Test that existing conversations can continue to 7 exchanges without issues

- [x] 2.0 Update Analysis Requirement from 7 to 3 Drops
  - [x] 2.1 Change requiredCount from 7 to 3 in `client/src/hooks/useAnalysisEligibility.ts` placeholder data
  - [x] 2.2 Update requiredCount from 7 to 3 in `server/DatabaseStorage.ts` getAnalysisEligibility method
  - [x] 2.3 Change minimum drop validation from 7 to 3 in `server/services/analysisService.ts`
  - [x] 2.4 Update minimum drop requirement from 7 to 3 in `server/services/analysisLLM.ts`
  - [x] 2.5 Update error message in `server/services/analysisService.ts` to reflect new minimum requirement
  - [x] 2.6 Update all unit tests in `tests/unit/analysis.test.ts` that use hardcoded 7-drop requirements
  - [x] 2.7 Update integration tests in `tests/integration/analysis-integration.test.ts` to use 3-drop minimum
  - [x] 2.8 Update workflow tests in `tests/integration/analysisWorkflow.test.ts` to reflect new requirement
  - [x] 2.9 Update service tests in `tests/unit/analysisService.test.ts` with new minimum drop counts
  - [x] 2.10 Update frontend tests in `tests/integration/analysisFrontend.test.tsx` to use new progress values

- [x] 3.0 Update User Interface Text and Messaging
  - [x] 3.1 Update subtitle text in `client/src/components/AnalysisProgress.tsx` from "7 entries" to "3 entries"
  - [x] 3.2 Update empty state message in `client/src/pages/Analysis.tsx` from "7 drops" to "3 drops"
  - [x] 3.3 Update any hardcoded progress counter examples from "X out of 7" to "X out of 3"
  - [x] 3.4 Update test assertions in `client/src/pages/__tests__/Analysis.test.tsx` to reflect new messaging
  - [x] 3.5 Verify all UI components automatically update progress bars and counters via the eligibility hook

- [x] 4.0 Testing and Validation
  - [x] 4.1 Run all existing unit tests to ensure no regressions from the changes
  - [x] 4.2 Run all integration tests to verify end-to-end functionality with new limits
  - [x] 4.3 Test the chat interface to ensure 7-exchange limit works properly
  - [x] 4.4 Test the analysis eligibility system to ensure 3-drop requirement works correctly
  - [x] 4.5 Verify that existing users with 3+ drops become immediately eligible for analysis
  - [x] 4.6 Test that analysis creation works with exactly 3 drops (boundary condition)
  - [x] 4.7 Verify UI components display correct progress and messaging with new thresholds
  - [x] 4.8 Test both features together to ensure they work independently without conflicts 