# PRD: Settings Screen Rebuild - Account Management

## Introduction/Overview

The current settings screen in the Drop app is a placeholder with no functional capabilities. This feature will completely rebuild the settings screen to provide core account management functionality for consumer users. The new settings screen will focus on essential profile management and account actions while maintaining the app's warm, mindful design philosophy as outlined in the style guide.

**Problem Statement**: Users currently cannot manage their account information, update their profile, or log out of the app due to the non-functional placeholder settings screen.

**Goal**: Create a fully functional, simple settings screen that enables users to manage their core account information and perform essential account actions.

## Goals

1. **Replace non-functional placeholder** with a working settings screen
2. **Enable profile management** - allow users to view and update their name and email
3. **Provide secure logout functionality** with proper redirection
4. **Maintain design consistency** with Drop's established visual identity
5. **Optimize for web platform** with consideration for future mobile app development
6. **Ensure accessibility** and intuitive user experience

## User Stories

**As a Drop app user, I want to:**
- View my current profile information (name and email) so I can see what's associated with my account
- Update my display name so it reflects how I want to be identified in the app
- Log out of my account securely so I can switch accounts or ensure my privacy
- Have confidence that my changes are saved properly with clear feedback
- Navigate the settings easily without confusion or clutter

**As a developer, I want to:**
- Build upon existing Replit authentication so the integration is seamless
- Follow the established style guide so the interface is consistent
- Handle errors gracefully so users have a smooth experience

## Functional Requirements

### Profile Information Display and Management
1. **FR-01**: The system must display the user's current email address (read-only)
2. **FR-02**: The system must display the user's current name in an editable text field
3. **FR-03**: The system must provide a "Save Changes" button that saves name updates
4. **FR-04**: The system must show a success message after successfully saving profile changes
5. **FR-05**: The system must validate that the name field is not empty before allowing save
6. **FR-06**: The system must show appropriate error messages for failed save attempts

### Authentication and Logout
7. **FR-07**: The system must provide a clearly labeled "Log Out" button
8. **FR-08**: The system must securely log out the user when the logout button is clicked
9. **FR-09**: The system must redirect users to the login page after successful logout
10. **FR-10**: The system must handle logout errors gracefully with appropriate user feedback

### User Interface and Navigation
11. **FR-11**: The settings screen must follow the Drop app style guide for colors, typography, and layout
12. **FR-12**: The interface must be contained within the max-width constraint (512px)
13. **FR-13**: The screen must include a back navigation option to return to the previous screen
14. **FR-14**: All interactive elements must meet accessibility standards with proper focus states
15. **FR-15**: The layout must be responsive and work well on various screen sizes

### Data Handling
16. **FR-16**: Profile changes must only be saved when the user explicitly clicks "Save Changes"
17. **FR-17**: All form inputs must have proper validation and error states
18. **FR-18**: The system must show skeleton loaders while fetching user profile data on initial load

## Non-Goals (Out of Scope)

- **Password management**: Users authenticate via OAuth (Google/Facebook/Apple) only
- **Email address changes**: Email is display-only and cannot be modified
- **Notification preferences**: Will be added in future iterations
- **Dark mode toggle**: Will be added in future iterations
- **Feedback/support options**: Will be added in future iterations
- **Account deletion**: Not included in this initial rebuild
- **Profile photo management**: Simplified to name and email only for this version
- **Mobile app interface**: Focus is on web platform (mobile considerations for future)

## Design Considerations

### Visual Design
- **Color Scheme**: Use primary brand colors from style guide (`--soft-terracotta`, `--deep-olive`, `--warm-cream`)
- **Typography**: 
  - Headings: Fraunces serif font
  - Body text and labels: Inter sans-serif font
  - Font size: 0.9rem base size
- **Layout**: Cards with `rounded-2xl` borders and `shadow-sm` elevation
- **Buttons**: 
  - Primary "Save Changes": `btn-primary` style with `rounded-full`
  - Secondary "Log Out": `btn-secondary` or `btn-ghost` style
  - Destructive styling considerations for logout action

### Component Structure
```
Settings Screen
├── Header (Back button + "Settings" title)
├── Profile Information Card
│   ├── Email (read-only display)
│   ├── Name (editable input field)
│   └── Save Changes button
└── Account Actions Card
    └── Log Out button
```

### Form Elements
- **Input styling**: Follow `search-input` pattern with `rounded-full` borders
- **Labels**: Clear, accessible labels for all form fields
- **Validation**: Real-time validation feedback with error states
- **Focus states**: Proper focus rings using `focus:ring-2 focus:ring-primary`

## Technical Considerations

### Authentication Integration
- **Replit Auth**: Leverage existing Replit authentication system for session management
- **Session Management**: Ensure proper session cleanup on logout
- **OAuth Provider Info**: Access to user's email from OAuth provider
- **Future Migration**: Design with consideration for eventual migration away from Replit Auth to internal authentication system

### Database Integration
- **Users Table**: User's name will be stored in the application's `users` table, separate from Replit auth
- **User Metadata**: This represents the beginning of managing user data independently from auth provider
- **Data Separation**: Email comes from auth provider, name comes from application database

### Data Flow
1. **Load user data** from both Replit auth session (email) and users table (name) on component mount
2. **Show skeleton loaders** while fetching user profile data
3. **Track form state** for name field changes
4. **API calls** to update users table when saving name changes
5. **Logout flow** through Replit auth logout methods

### Error Handling
- **Network errors**: Graceful handling with clear error messages (no retry mechanisms)
- **Database errors**: Handle failures when fetching/updating user data in users table
- **Validation errors**: Clear field-level error messages
- **Session errors**: Redirect to login if session is invalid

### Performance
- **Fast loading**: Minimize data fetching on screen load
- **Optimistic updates**: Consider optimistic UI updates for better UX
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Success Metrics

1. **Functional Success**: 100% of users can successfully update their name and save changes
2. **User Satisfaction**: Users can complete profile updates without confusion or errors
3. **Technical Success**: Zero critical bugs related to authentication or data persistence
4. **Performance**: Settings screen loads within 2 seconds on standard web connections
5. **Accessibility**: Passes WCAG AA compliance testing
6. **Design Consistency**: UI elements match established style guide patterns

---

**Target Audience**: Junior developers  
**Implementation Priority**: High  
**Estimated Complexity**: Medium  
**Dependencies**: Replit Auth integration, existing style guide components, users table database schema 