# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Tracker - A serverless web application for individual financial management with Vue.js frontend, GraphQL backend, and AWS infrastructure.

### Architecture
- **frontend/** - Vue 3 + Vite + Vuetify SPA
- **backend/** - Apollo GraphQL server (Node.js/TypeScript)
- **backend-cdk/** - AWS CDK infrastructure for backend (Lambda/API Gateway/DynamoDB)
- **frontend-cdk/** - AWS CDK infrastructure for frontend (S3/CloudFront)

## Development Commands

### Backend Development
```bash
cd backend
npm run dev          # Start development server with nodemon
npm run build        # Compile and bundle for Lambda deployment
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run prettier     # Prettier format check
npm run prettier:fix # Prettier format fix

# Database (Development)
npm run db:start      # Start DynamoDB Local + Admin UI
npm run db:start-only # Start only DynamoDB Local (without admin UI)
npm run db:admin      # Start admin UI separately
npm run db:stop       # Stop all database services
npm run db:setup      # Start database and create tables
npm run db:reset      # Reset database (stop, start, create tables)

# Format code
npm run format        # Run prettier:fix and lint:fix together
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run type-check   # Vue TypeScript checking
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run format       # Run prettier:fix and lint:fix together
```

### CDK Infrastructure
```bash
cd backend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy backend to AWS
npm run test         # Run Jest tests

cd frontend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy frontend infrastructure to AWS
npm run test         # Run Jest tests
```

### Full Deployment
```bash
./deploy.sh          # Complete deployment: backend → frontend infrastructure → frontend assets
```

## Key Technical Details

### Authentication Flow
- Auth0 JWT tokens used for authentication
- Backend verifies JWT signatures and extracts user context
- All data operations scoped to authenticated user

### Database Design
- DynamoDB with user data partitioned by internal user ID
- Repository pattern abstracts database operations for portability
- All queries scoped to authenticated user for data isolation

### Development Database

**Setup:**
- DynamoDB Local runs in Docker container (port 8000)
- DynamoDB Admin UI available at http://localhost:8001
- Tables created automatically with `npm run db:setup`
- Data persisted in `./docker/dynamodb/` directory

**First-time setup:**
```bash
cd backend
npm run db:setup    # Starts DynamoDB Local and creates all tables
```

**Daily development workflow:**
```bash
cd backend
npm run db:start    # Start DynamoDB Local + Admin UI
npm run dev         # Start backend development server

# Admin UI automatically available at http://localhost:8001
```

**Database management:**
```bash
npm run db:stop     # Stop DynamoDB Local + Admin UI
npm run db:reset    # Reset database (recreate all tables)
```

**Requirements:**
- Docker and Docker Compose must be installed
- AWS SDK dependencies installed via `npm install`

### Development Tools
- ESLint + Prettier for code quality across all packages
- TypeScript for type safety
- Jest for unit testing in CDK packages
- Git hooks available (run `git config core.hooksPath .githooks` to enable)

## Important Patterns

### Script Usage
Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations.

### Multi-Currency Support
Each account has a specific currency. Transfers only allowed between accounts with same currency. Reports grouped by currency without conversion.

### Error Handling
Backend implements structured error handling with GraphQL-specific error formatting. Frontend uses Apollo Client error handling patterns.

## Architecture Patterns

### GraphQL Context Pattern
All GraphQL resolvers receive a standardized context containing:
- `auth`: Authentication state (isAuthenticated, user info from JWT)
- `userRepository`: Database access layer for user operations

Context creation automatically handles JWT verification and user extraction from Auth0 tokens.

### Repository Pattern
Database operations are abstracted through repository interfaces:
- `IUserRepository` with concrete `UserRepository` implementation
- Repositories handle environment-specific DynamoDB configuration (local vs AWS)
- All database queries automatically scoped to authenticated user
- Repository methods use `ensureUser()` pattern for automatic user creation

### Authentication Flow
1. Frontend obtains JWT tokens from Auth0 (`useAuth` composable)
2. Apollo Client automatically includes JWT in Authorization headers
3. Backend verifies JWT signatures against Auth0 public keys
4. User context extracted and available in all GraphQL resolvers
5. Database operations automatically scoped to authenticated user

### Environment Configuration
- **Frontend**: Uses Vite environment variables (`VITE_*` prefix)
- **Backend**: Uses Node.js process.env for Auth0, AWS, and database config
- **CDK**: Reads environment variables during deployment for stack configuration
- Development vs production determined by `NODE_ENV`

### DynamoDB Design Patterns
- Primary tables use UUID partition keys for even distribution
- Global Secondary Indexes (GSI) for Auth0 user ID lookups
- All user data partitioned by internal user ID for data isolation
- Development uses DynamoDB Local with Docker Compose
- Production uses pay-per-request billing with point-in-time recovery

### Frontend State Management
- Auth state managed by Auth0 Vue SDK (`useAuth` composable)
- GraphQL data managed by Apollo Client cache
- User data fetched via GraphQL with `useUser` composable
- Automatic token refresh handled by Auth0 SDK

## Advanced Patterns

### GraphQL Error Handling Pattern
Backend uses structured error handling with specific error types:
- Repository errors (e.g., `AccountRepositoryError`) with error codes
- Zod validation errors converted to GraphQL format
- Helper functions like `requireAuthentication()` and `getAuthenticatedUser()`
- Consistent error response format across all resolvers

### Environment-Aware Repository Configuration
Repositories automatically detect and configure for different environments:
- Development: DynamoDB Local endpoint (`http://localhost:8000`) with dummy credentials
- Production: AWS DynamoDB endpoint with IAM role authentication
- Table names and configurations read from environment variables
- Repository interfaces enable easy testing and implementation swapping

### Cross-Stack Resource Sharing (CDK)
Backend and frontend CDK stacks communicate via exports/imports:
- Backend CDK exports API Gateway domain and stage URL
- Frontend CDK imports backend values using `Fn.importValue`
- CloudFront distribution configured with dual origins (S3 + API Gateway)
- Deployment order critical: backend → backend-cdk → frontend-cdk → frontend assets

### JWT Token Flow Pattern
Sophisticated token management across the application:
- Auth0 SDK handles token acquisition and refresh in frontend
- Global token getter function allows Apollo Client to access Auth0 tokens
- Backend fetches Auth0 public keys via JWKS client for JWT verification
- Context creation automatically extracts and validates user information

### Database Scoping and Isolation
All database operations enforce user-level data isolation:
- Repository methods automatically scope queries to authenticated user
- `ensureUser()` pattern creates users on first GraphQL operation
- All data partitioned by internal user ID (UUID) for security
- GSI indexes on Auth0 user ID for efficient user lookups

### Development Environment Orchestration
Complete Docker-based development setup:
- DynamoDB Local with persistent volumes in `./docker/dynamodb/`
- Admin UI at http://localhost:8001 for database inspection
- Automatic table creation via TypeScript scripts on `npm run db:setup`
- Service health checks and graceful startup/shutdown procedures

## Testing and Debugging

### GraphQL Development Tools
- Apollo Server includes GraphQL Playground for query testing
- Backend dev server runs at http://localhost:4000/graphql
- Frontend Apollo Client DevTools integration for cache inspection
- DynamoDB Admin UI for database state verification during development

### Error Tracing Patterns
- Repository operations include detailed error context and user scoping
- GraphQL resolvers use structured error helpers for consistent error formatting
- Authentication failures include specific error codes for debugging
- Environment-specific error handling (verbose in dev, sanitized in prod)

### Database Testing Workflow
- `npm run db:reset` for clean slate testing with fresh tables
- Docker named volumes preserve data between development sessions
- Table creation scripts are idempotent and can be run multiple times
- Admin UI provides real-time view of data changes during development

## Important Development Guidelines

### Code Quality Standards
- **TypeScript Best Practices**: Avoid unnecessary type checks (typeof, non-null, non-undefined) when the provided type is explicit and doesn't require such checks
- **Script Usage**: Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations
- **Documentation**: Only create documentation files when explicitly requested

### Project Specifications
Before starting any development work, review:
- `docs/general_spec.md` - Business requirements and feature specifications
- `docs/tech_spec.md` - Technical architecture and implementation guidelines
- `docs/tasks.md` - Current development roadmap and task tracking
