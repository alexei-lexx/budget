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
npm run build        # Compile TypeScript to dist/
npm run build:bundle # Bundle with esbuild for Lambda deployment
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run prettier     # Prettier format check
npm run prettier:fix # Prettier format fix
npm run codegen      # Generate GraphQL types from schema

# Database (Development)
npm run db:start      # Start DynamoDB Local + Admin UI
npm run db:stop       # Stop all database services
npm run db:setup      # Start database and create tables
npm run db:purge      # Reset database (stop, remove data, setup)

# Testing
npm run test         # Run Jest tests
npm run test:setup   # Setup test environment

# Format code
npm run format        # Run prettier:fix and lint:fix together
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite development server (includes schema sync + codegen)
npm run build        # Build for production (includes schema sync + codegen + type-check)
npm run build-only   # Build without type checking
npm run preview      # Preview production build locally
npm run type-check   # Vue TypeScript checking
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run format       # Run prettier:fix and lint:fix together

# GraphQL CodeGen (automatic in dev/build)
npm run codegen:sync-schema  # Sync schema from backend to frontend
npm run codegen             # Generate TypeScript types and Vue Apollo composables
```

### CDK Infrastructure
```bash
cd backend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy backend to AWS
npm run diff         # Show deployment differences
npm run synth        # Synthesize CloudFormation templates
npm run watch        # Watch for changes and deploy
npm run test         # Run Jest tests

cd frontend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy frontend infrastructure to AWS
npm run diff         # Show deployment differences
npm run synth        # Synthesize CloudFormation templates
npm run test         # Run Jest tests
```

### Full Deployment
```bash
./deploy.sh          # Complete deployment: backend → frontend infrastructure → frontend assets
```

**Deployment Requirements:**
- AWS CLI configured with appropriate credentials
- `jq` command-line JSON processor installed
- All dependencies installed in each package directory

**GraphQL CodeGen Integration in Deployment:**
- Frontend build process automatically syncs schema and generates types
- Schema sync ensures frontend uses latest backend GraphQL schema during build
- Generated types are included in production build for type safety
- No manual intervention required for schema synchronization during deployment

## Environment Management

The project uses **dotenvx** for sophisticated environment management across all packages:

```bash
# Environment files (in order of precedence):
.env.local          # Local overrides (gitignored)
.env.development    # Development defaults
.env.production     # Production settings
.env               # Base configuration
.env.example       # Template file
```

**Important Environment Variables:**
- **AUTH0_DOMAIN**, **AUTH0_AUDIENCE** - Auth0 configuration
- **AWS_REGION**, **AWS_PROFILE** - AWS configuration
- **NODE_ENV** - Environment mode (development/production)
- Table names and AWS settings loaded from environment

**Usage Pattern:**
Commands prefixed with `dotenvx run` automatically load the correct environment files for the current NODE_ENV.

## Build System Architecture

### Backend Build Process
- **TypeScript Compilation** (`npm run build`) - Compiles to `dist/` directory
- **ESBuild Bundling** (`npm run build:bundle`) - Creates optimized Lambda bundle
- **GraphQL Schema** - Copied from `src/schema.graphql` to `dist/` during build
- **Code Generation** (`npm run codegen`) - Generates TypeScript types from GraphQL schema

### Frontend Build Process
- **Vite** - Modern build tool with hot module replacement
- **Path Aliases** - `@/` maps to `src/` directory
- **TypeScript** - Full type checking integrated with build process
- **GraphQL CodeGen** - Automatic schema sync and type generation from backend GraphQL schema
- **Production Optimization** - Tree shaking, minification, asset optimization

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
- Tables created automatically with `npm run db:setup` (Users, Accounts, Categories, Transactions)
- Data persisted in Docker named volume `dynamodb-data`

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
```

**Database reset (manual process):**
```bash
npm run db:stop     # Stop database
docker volume rm backend_dynamodb-data  # Remove data volume
npm run db:setup    # Recreate database and tables
```

**Requirements:**
- Docker and Docker Compose must be installed
- AWS SDK dependencies installed via `npm install`

### Development Tools
- ESLint + Prettier for code quality across all packages
- TypeScript for type safety
- Jest for unit testing in CDK packages
- Git hooks available for code quality enforcement

### Git Hooks Setup
To enable project git hooks for consistent code quality:
```bash
git config core.hooksPath .githooks
```

To disable project git hooks:
```bash
git config --unset core.hooksPath
```

## Important Patterns

### Script Usage
Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations.

### Multi-Currency Support
Each account has a specific currency. Transfers only allowed between accounts with same currency. Reports grouped by currency without conversion.

### Transfer System
Account-to-account transfers implemented with industry-standard patterns:
- **Two-Transaction Model**: Each transfer creates paired TRANSFER_OUT and TRANSFER_IN transactions
- **Atomic Operations**: Uses DynamoDB transactions to ensure both sides commit or rollback together
- **Currency Validation**: Only allows transfers between accounts with matching currencies
- **Audit Trail**: Each transaction includes transferId to link paired transactions
- **Rollback Support**: Failed transfers automatically rollback partial changes

### Error Handling
Backend implements structured error handling with GraphQL-specific error formatting. Frontend uses Apollo Client error handling patterns.

## Architecture Patterns

### Backend Three-Layer Architecture

The backend follows a clean architecture pattern:

```
GraphQL Resolvers → Services → Repositories → Database
```

**GraphQL Context Pattern:**
All GraphQL resolvers receive a standardized context containing:
- `auth`: Authentication state (isAuthenticated, user info from JWT)
- `userRepository`, `accountRepository`, `categoryRepository`, `transactionRepository`: Database access layers
- `transactionService`, `accountService`, `transferService`: Business logic services for cross-repository operations
- `jwtAuthService`: JWT token verification service

Context creation automatically handles JWT verification and user extraction from Auth0 tokens.

**Service Layer Pattern:**
- **Domain-centric services** - Single service per entity (TransactionService, AccountService, TransferService)
- **Business logic coordination** - Cross-repository operations and validation
- **Dependency injection** - Repository dependencies injected once per service
- **Private helper methods** - Shared validation logic within domain

### Repository Pattern
Database operations are abstracted through repository interfaces:
- `IUserRepository`, `IAccountRepository`, `ICategoryRepository`, `ITransactionRepository` with concrete implementations
- Repositories handle environment-specific DynamoDB configuration (local vs AWS)
- All database queries automatically scoped to authenticated user
- Repository methods use `ensureUser()` pattern for automatic user creation
- Repository error classes (`UserRepositoryError`, `AccountRepositoryError`, etc.) provide structured error handling
- Transaction repository includes cursor-based pagination for efficient data loading

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
- Global Secondary Indexes (GSI) for Auth0 user ID lookups and date-sorted queries
- All user data partitioned by internal user ID for data isolation
- Database-level sorting preferred over application sorting (use GSI with ScanIndexForward)
- Development uses DynamoDB Local with Docker Compose
- Production uses pay-per-request billing with point-in-time recovery

### Frontend State Management
- Auth state managed by Auth0 Vue SDK (`useAuth` composable)
- GraphQL data managed by Apollo Client cache
- User data fetched via GraphQL with `useUser` composable
- Automatic token refresh handled by Auth0 SDK

### Pagination Architecture
- **Relay-Compatible Cursor Pagination**: Implements Relay Connection specification
- **Stable Navigation**: Cursors remain valid even when new data is inserted
- **Database-Native**: Uses DynamoDB's native pagination with GSI for efficient queries
- **Frontend Pattern**: "Load More" button with cumulative list display
- **Cursor Design**: Base64-encoded JSON containing date + ID for stable positioning

## Advanced Patterns

### Error Handling Patterns

**Repository Errors:**
- `AccountRepositoryError`, `CategoryRepositoryError`, `TransactionRepositoryError` with error codes
- Database operation failures with structured error context

**Service Layer Errors:**
- `BusinessError` class for domain-specific validation failures
- User-friendly error messages for business rule violations

**GraphQL Layer:**
- Zod validation errors converted to GraphQL format
- Helper functions like `requireAuthentication()` and `getAuthenticatedUser()`
- Consistent error response format using `handleResolverError()` shared utility

### Hybrid Input Validation Pattern

**Two-tier validation approach:**

1. **GraphQL Layer (Zod)** - Input validation:
   - Schema compliance (required fields, data types)
   - Format validation (UUID, date, email formats)
   - Range constraints (positive numbers, string length limits)
   - Enum validation (INCOME/EXPENSE)
   - Schema definitions at top of resolver files

2. **Service Layer** - Business validation:
   - Entity existence checks (account exists, category exists)
   - Business rule enforcement (currency matching, category type consistency)
   - Cross-entity validation (transaction requires valid account)
   - Domain-specific constraints

**Example Zod Schema:**
```typescript
const createTransactionInput = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid().optional(),
});
```

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

### GraphQL Type Generation System

**Schema Synchronization:**
- Backend maintains canonical GraphQL schema at `backend/src/schema.graphql`
- Frontend automatically syncs schema to `frontend/src/schema.graphql` during dev and build processes
- Manual sync available via `npm run codegen:sync-schema` in frontend directory

**Type Generation Architecture:**
```
backend/src/schema.graphql → [sync] → frontend/src/schema.graphql
                                              ↓
frontend/src/graphql/*.ts (operations) → [codegen] → frontend/src/__generated__/
                                                            ├── graphql-types.ts (base types)
                                                            └── vue-apollo.ts (typed composables)
```

**Frontend CodeGen Configuration:**
- **Schema Source**: Local copy at `frontend/src/schema.graphql`
- **Operations Source**: GraphQL queries, mutations, fragments in `frontend/src/graphql/`
- **Generated Output**: TypeScript types and Vue Apollo composables in `frontend/src/__generated__/`
- **Type Safety**: `InputMaybe<T>` types use `T | undefined` for strict null handling
- **Composables**: Generated `useCreateTransactionMutation()`, `useGetAccountsQuery()`, etc.

**Development Workflow:**
1. Backend developer updates `backend/src/schema.graphql`
2. Frontend `npm run dev` automatically syncs schema and regenerates types
3. TypeScript compilation catches any breaking changes immediately
4. IDE provides full autocomplete and type checking for GraphQL operations
5. Generated composables replace manual `useQuery`/`useMutation` calls

**Generated Type Structure:**
- **Base Types**: Account, Transaction, Category interfaces from schema
- **Input Types**: CreateTransactionInput, UpdateAccountInput, etc.
- **Enum Types**: TransactionType, CategoryType as TypeScript unions
- **Composable Functions**: Typed Vue Apollo hooks for each GraphQL operation
- **Document Objects**: GraphQL document objects for direct Apollo Client usage

**Schema Change Process Guidelines:**

*For Backend Developers:*
1. **Schema Updates**: Modify `backend/src/schema.graphql` for any GraphQL API changes
2. **Resolver Implementation**: Update resolvers and types in backend before frontend sync
3. **Testing**: Test backend GraphQL endpoint functionality before schema changes are consumed
4. **Communication**: Notify frontend team of breaking schema changes via commit messages or PR descriptions

*For Frontend Developers:*
1. **Schema Sync**: Frontend automatically syncs schema during `npm run dev` or `npm run build`
2. **Manual Sync**: Use `npm run codegen:sync-schema` to pull latest schema changes manually
3. **Type Safety**: Let TypeScript compilation catch schema mismatches immediately
4. **Operation Updates**: Update GraphQL operations in `frontend/src/graphql/` as needed for schema changes
5. **Testing**: Verify all affected components work with updated types and operations

*For Breaking Changes:*
1. **Backend**: Update schema, resolvers, and test thoroughly
2. **Frontend**: Sync schema and fix TypeScript errors from generated types
3. **Verification**: Ensure UI functionality works with updated GraphQL operations
4. **Deployment**: Deploy backend changes before frontend deployment to avoid API mismatches

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
- Use manual database reset process for clean slate testing with fresh tables
- Docker named volumes preserve data between development sessions
- Table creation scripts are idempotent and can be run multiple times
- Admin UI provides real-time view of data changes during development

## Current Implementation Status

### Completed Features
- **User Authentication** - Auth0 integration with JWT verification
- **Account Management** - Complete CRUD operations with multi-currency support
- **Category Management** - Income/Expense categorization with validation
- **Transaction Management** - Complete CRUD operations with pagination
- **Transaction Pagination** - Relay-compatible cursor-based pagination with "Load More" functionality
- **Development Database** - DynamoDB Local with Docker orchestration
- **Service Layer Architecture** - TransactionService, AccountService, and TransferService with business logic and validation
- **Transfer System** - Account-to-account transfers with atomic DynamoDB transactions
- **GraphQL Type Generation** - Frontend TypeScript type generation and typed Vue Apollo composables from shared schema

### Architecture Status
**Current State:** Major features implemented with service layer adoption
- Transaction operations use TransactionService for comprehensive business logic
- Account operations use AccountService for balance calculation
- Transfer operations use TransferService for atomic dual-account transactions
- Category operations still use direct repository calls in resolvers
- Pagination implemented using Relay Connection specification with "Load More" UI

**Service Layer Pattern:** New business logic should be implemented in service classes, not directly in GraphQL resolvers

**Balance Calculation:** Account balance = initialBalance + sum of INCOME + sum of TRANSFER_IN - sum of EXPENSE - sum of TRANSFER_OUT

## Important Development Guidelines

### Code Quality Standards
- **TypeScript Best Practices**: Avoid unnecessary type checks (typeof, non-null, non-undefined) when the provided type is explicit and doesn't require such checks
- **TypeScript Import Conventions**: When generating TypeScript code, import files without extensions (no .js or .ts). The build system will handle extension resolution automatically
- **Class Method Organization**: Public methods should come first, followed by private methods. This ensures the public API is visible at the top of the class
- **Script Usage**: Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations
- **Documentation**: Only create documentation files when explicitly requested
- **Service Layer**: New business logic should be implemented in service classes, not directly in GraphQL resolvers

### Test Commands
All projects use Jest for testing. Run tests with:
```bash
# Backend CDK tests
cd backend-cdk
npm test

# Frontend CDK tests
cd frontend-cdk
npm test
```

### Project Specifications
Before starting any development work, review:
- docs/general_spec.md - Business requirements and feature specifications
- docs/tech_spec.md - Technical architecture and implementation guidelines
- docs/tasks/ - Individual task files with detailed implementation requirements

### Task Completion Tracking
**CRITICAL**: Always mark tasks as completed in the relevant task files in docs/tasks/ immediately after finishing them:
- Change `[ ]` to `[x]` in the task line within the specific task file
- When all sub-task items under a parent task are completed and marked, mark the parent task item as completed as well
- This maintains permanent progress tracking across development sessions
- Prevents duplicate work and ensures accountability

### Task Implementation Approach
Follow bottom-up, layer-by-layer implementation pattern:
1. **Database Layer** - Development/production database setup, schema changes, data migrations
2. **Repository Layer** - Data access operations, error handling, validation
3. **Service Layer** - Business logic, cross-repository coordination, business rules
4. **GraphQL Layer** - Schema definitions, resolvers, input validation
5. **Frontend Data Layer** - GraphQL queries/mutations, composables, error handling
6. **Frontend UI/UX Layer** - Components, user interface, form validation
7. **Integration Testing** - Manual testing, end-to-end validation, production verification

### Task Definition Guidelines
For comprehensive task definition guidelines, refer to docs/tasks.instructions.md

## Code Quality and Development Workflow

### Git Hooks Setup
Enable project git hooks for consistent code quality:
```bash
git config core.hooksPath .githooks
```

**Pre-commit Hook:**
- Runs formatting and linting across all packages
- Prevents commits with code quality issues
- Automatically fixes formatting where possible

### Testing Infrastructure
- **Backend CDK**: Jest tests for infrastructure validation
- **Frontend CDK**: Jest tests for deployment configuration
- **Backend**: Test environment setup with `npm run test:setup`
- Test databases isolated from development data

### Code Generation Workflow
- **Backend GraphQL Types**: Run `npm run codegen` in backend after schema changes
- **Frontend GraphQL Types**: Automatic schema sync and codegen during `npm run dev` and `npm run build`
- **Manual Frontend Codegen**: Use `npm run codegen:sync-schema && npm run codegen` in frontend directory
- **Apollo Config**: `apollo.config.js` enables IDE integration and tooling
- **TypeScript**: Strict type checking across all packages

## Troubleshooting

### Common Development Issues
- **Database Connection**: Ensure Docker is running for DynamoDB Local
- **Environment Variables**: Check `.env.example` files for required variables
- **Port Conflicts**: Backend dev server (4000), DynamoDB Local (8000), Admin UI (8001)
- **Build Failures**: Run `npm run format` before building to fix formatting issues

### Debugging Patterns
- **Backend**: Use nodemon for automatic restarts during development
- **Lambda Functions**: Test locally before deployment with `npm run build:bundle`
- **CDK Deployments**: Use `npm run diff` to preview changes before deploy
- **GraphQL**: Use Apollo Server playground at http://localhost:4000/graphql

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

## Claude Code Project Guidelines

**Script Usage:**
- Prefer npm scripts defined in package.json over running tools directly
- This ensures consistent tool versions and project-specific configurations
- Example: Use `npm run deploy` instead of `npx cdk deploy`

**Commit Message Format:**
- Use lower case for the entire commit message
- Write in imperative mood (e.g., "add feature", "fix bug", "update docs")
- Keep subject line under 50 characters, no period at end
- Separate subject from body with blank line if body needed
- Use bullet points in body for multiple changes
- Wrap body lines at 72 characters

**Required Commit Prefixes:**
- `[be]` - Backend changes only
- `[fe]` - Frontend changes only
- `[be][fe]` - Both backend and frontend changes
- `[doc]` - Documentation changes in docs/ folder only
- `[copilot]` - GitHub Copilot instruction updates only
- `[claude]` - Claude Code specific files and command updates only
