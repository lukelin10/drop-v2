# Drop v2 - Personal Coaching Journal Application

## Overview

Drop v2 is a full-stack personal coaching and journaling application that combines daily reflection prompts with AI-powered conversational coaching. The application helps users develop self-awareness through guided journaling and provides intelligent analysis of their entries to identify patterns and insights for personal growth.

## System Architecture

The application follows a modern full-stack architecture with clear separation of concerns:

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and build optimization
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React Context for local state
- **UI Library**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Authentication**: Replit Auth integration

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: Replit OAuth/OpenID Connect with Passport.js
- **Session Storage**: PostgreSQL-backed sessions
- **AI Integration**: Anthropic Claude API for conversational coaching and analysis

### Development & Testing
- **Testing Framework**: Jest with separate configurations for React and Node.js
- **Test Types**: Unit tests, integration tests, and API tests
- **Database Testing**: Isolated test database with safety checks
- **Hot Reloading**: Vite HMR for frontend, tsx for backend development

## Key Components

### Core Entities
1. **Users**: Authentication and profile management via Replit Auth
2. **Questions**: Daily reflection prompts with categories and active status
3. **Drops**: Journal entries linking users to questions with free-form text
4. **Messages**: Conversational exchanges between users and AI coach
5. **Analyses**: AI-generated insights from collections of journal entries

### Feature Modules

#### Daily Journaling
- Random daily question selection from active prompts
- Rich text journal entry creation (drops)
- Question categorization system

#### AI Coaching Conversations
- Real-time chat interface for each journal entry
- Context-aware responses using conversation history
- Anthropic Claude integration with specialized coaching prompts

#### Analysis & Insights
- AI-powered pattern analysis of journal entries
- Minimum 7 entries required for analysis generation
- Structured output with summary, content, and bullet points
- Analysis history with favoriting functionality
- Progress tracking toward analysis eligibility

### Authentication & Security
- Replit OAuth/OpenID Connect integration
- Session-based authentication with PostgreSQL storage
- Protected routes with authentication middleware
- User isolation for all data operations

## Data Flow

### Journal Entry Creation
1. User views daily question from active question pool
2. User creates journal entry (drop) responding to question
3. Entry is stored with user ID, question ID, and timestamp
4. User can engage in AI-coached conversation about their entry

### AI Conversation Flow
1. User sends message within journal entry context
2. System retrieves full conversation history for context
3. Anthropic API generates contextual coaching response
4. Response stored as message linked to the journal entry
5. Conversation continues with full history maintained

### Analysis Generation
1. System tracks unanalyzed entries since last analysis
2. When user has 7+ unanalyzed entries, analysis becomes available
3. User triggers analysis generation manually
4. System compiles entries with full conversation histories
5. Anthropic API generates structured analysis using specialized prompts
6. Analysis stored with relationships to source entries
7. User can view, favorite, and browse historical analyses

## External Dependencies

### Required Services
- **Neon PostgreSQL**: Primary database with connection pooling
- **Anthropic API**: Claude AI for coaching and analysis (requires API key)
- **Replit Authentication**: OAuth provider for user authentication

### Key NPM Packages
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **Authentication**: `passport`, `openid-client`, `express-session`
- **AI Integration**: `@anthropic-ai/sdk`
- **Frontend**: `react`, `@tanstack/react-query`, `wouter`
- **UI Components**: `@radix-ui/*`, `class-variance-authority`, `clsx`
- **Development**: `vite`, `typescript`, `jest`, `tsx`

### Environment Variables
- `DATABASE_URL`: Production PostgreSQL connection string
- `TEST_DATABASE_URL`: Separate test database (required for testing)
- `ANTHROPIC_API_KEY`: Claude API access key
- `REPL_ID`: Replit application identifier
- `REPLIT_DOMAINS`: Allowed authentication domains

## Deployment Strategy

### Replit Deployment
- **Target**: Autoscale deployment on Replit infrastructure
- **Build Process**: `npm run build` compiles both frontend and backend
- **Runtime**: Node.js 20 with PostgreSQL 16 module
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Production environment variables managed through Replit

### Database Migrations
- **Tool**: Drizzle Kit for schema management
- **Location**: `/migrations` directory with versioned SQL files
- **Execution**: `npm run db:push` for schema deployment
- **Safety**: Separate test database prevents production data contamination

### Build Process
1. Frontend assets compiled with Vite to `dist/public`
2. Backend TypeScript bundled with esbuild to `dist/index.js`
3. Static assets served through Express in production
4. Database schema pushed via Drizzle migrations

### Testing Strategy
- **Safety Checks**: Environment verification prevents production database usage
- **Test Isolation**: Dedicated test database with automated cleanup
- **Coverage**: Unit, integration, and API tests with Jest
- **CI/CD**: Tests must pass before deployment

## Changelog
- June 24, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.