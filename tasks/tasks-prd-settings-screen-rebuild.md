# Implementation Tasks: Settings Screen Rebuild - Account Management

Based on the PRD requirements, here are the implementation tasks:

## Relevant Files

- `migrations/0005_add_name_field_to_users.sql` - Database migration to add name field to users table
- `shared/schema.ts` - Updated users table schema with name field and index
- `lib/database/user-queries.ts` - Database query functions for user profile operations
- `tests/unit/userQueries.test.ts` - Unit tests for user database queries with proper mocking strategy
- `server/routes.ts` - Added user profile API endpoints (`/api/user/profile`, `/api/user/update-name`)
- `tests/api/userProfile.test.ts` - API tests for user profile endpoints with proper mock infrastructure
- `types/user.ts` - TypeScript interfaces for user profile data structures and utilities
- `pages/settings.tsx` - Main settings page component with profile management interface (completed - rebuilt according to PRD requirements)
- `pages/__tests__/Settings.working.test.tsx` - Unit tests for settings page component (completed - comprehensive test coverage with 7 passing tests)
- `components/ui/SkeletonLoader.tsx` - Reusable skeleton loader component for loading states (pending)
- `components/ui/SkeletonLoader.test.tsx` - Unit tests for skeleton loader component (pending)
- `lib/auth/replit-auth.ts` - Utility functions for Replit Auth integration (completed)
- `lib/auth/replit-auth.test.ts` - Unit tests for auth utilities (completed)

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Use [mocking-strategy.mdc](mdc:.cursor/rules/mocking-strategy.mdc) to make sure that tests do not touch the database and that mocking is used properly

### Unit Test Coverage Status

The Settings component unit tests validate the following functionality:
- ✅ Component rendering and UI structure (sections, email display, logout button)
- ✅ Profile management (form state, name changes, save button logic)
- ✅ API integration (successful saves, loading states, error handling)
- ✅ Authentication integration (user session data, logout functionality)
- ✅ Error handling and user feedback (toast notifications, network failures)

## Tasks

- [x] 1.0 Database and API Infrastructure Setup
  - [x] 1.1 Create or update users table schema with name field and user_id primary key
  - [x] 1.2 Create database migration file for users table changes
  - [x] 1.3 Implement user database query functions (getUserProfile, updateUserName)
  - [x] 1.4 Create API endpoint `/api/user/profile` to fetch user profile data
  - [x] 1.5 Create API endpoint `/api/user/update-name` to save name changes
  - [x] 1.6 Add TypeScript interfaces for user profile data structures
- [ ] 2.0 Settings Screen UI Components and Layout
  - [x] 2.1 Create main settings page component following Drop style guide
  - [ ] 2.2 Implement header section with back button and "Settings" title
  - [ ] 2.3 Create Profile Information Card with email display and name input field
  - [ ] 2.4 Create Account Actions Card with logout button
  - [ ] 2.5 Implement skeleton loader component for loading states
  - [ ] 2.6 Apply responsive design within 512px max-width constraint
- [x] 3.0 Profile Management Functionality
  - [x] 3.1 Implement data fetching for user email (from Replit Auth) and name (from database)
  - [x] 3.2 Create form state management for name field with React hooks
  - [x] 3.3 Implement "Save Changes" button functionality with API call
  - [x] 3.4 Add success message display after successful name update
  - [x] 3.5 Implement form validation to ensure name field is not empty
  - [x] 3.6 Track form dirty state to enable/disable save button appropriately
- [x] 4.0 Authentication Integration and Logout Flow
  - [x] 4.1 Create utility functions to get user session data from Replit Auth
  - [x] 4.2 Implement logout functionality using Replit Auth logout methods
  - [x] 4.3 Add redirect logic to login page after successful logout
  - [x] 4.4 Handle session validation and redirect to login if session invalid
  - [x] 4.5 Ensure proper session cleanup during logout process
- [x] 5.0 Error Handling, Validation, and User Experience Polish
  - [x] 5.1 Implement error handling for network failures during API calls
  - [x] 5.2 Add field-level validation messages for name input
  - [x] 5.3 Create error states for database operation failures
  - [x] 5.4 Add proper ARIA labels and keyboard navigation for accessibility
  - [x] 5.5 Implement proper focus states following style guide (`focus:ring-2 focus:ring-primary`)
  - [x] 5.6 Test and ensure responsive behavior across different screen sizes
- [x] 6.0 Unit Testing and Quality Assurance
  - [x] 6.1 Create comprehensive unit tests for Settings component functionality
  - [x] 6.2 Implement test coverage for component rendering and UI structure
  - [x] 6.3 Add tests for profile management and form state handling
  - [x] 6.4 Create tests for API integration and error handling scenarios
  - [x] 6.5 Validate authentication integration and logout functionality through tests
  - [x] 6.6 Resolve Jest configuration and ES module compatibility issues 