<!-- SYNC IMPACT REPORT
Version Change: 0.11.3 → 0.12.0 (MINOR: Added Backend Layer Structure subsection clarifying three-layer architecture pattern)
Modified Sections: Backend (added Backend Layer Structure subsection, clarified Repository scope)
Added Sections: Backend Layer Structure (describes Repository, Service, and GraphQL layers with responsibilities and constraints)
Removed Sections: None
Refinements: Removed ambiguous "scoped to authenticated user" language from Repository Layer to avoid confusion with authorization (handled at Resolver/Service level); Added "one repository per entity" design guidance; Simplified multi-repository operations description for clarity
Templates Requiring Updates:
  ✅ spec-template.md: No changes needed (focused on user stories, not architecture)
  ✅ plan-template.md: No changes needed (Constitution Check gates remain valid)
  ✅ tasks-template.md: No changes needed (task structure naturally aligns with three-layer pattern)
Follow-up TODOs:
  - Ratification date remains TODO (inherited from previous versions)
-->

# Personal Finance Tracker Constitution

## Repository Structure

The project comprises four independent npm packages distributed across the repository:

- **backend/** – GraphQL server exposing the API for the frontend, includes database integration
- **frontend/** – User-facing single-page application
- **backend-cdk/** – Deployable backend infrastructure
- **frontend-cdk/** – Deployable frontend infrastructure

Each package maintains its own `package.json`, dependencies, and build configuration. They are versioned and deployed independently while remaining architecturally coupled through shared GraphQL schema and deployment order requirements.

## General Requirements

- Deploy with free or minimal cost (use free-tier cloud services, no mandatory paid subscriptions)
- Enable mobile installation via PWA without app store publishing

## Backend

An npm package providing Apollo GraphQL server and API implementation.

### Technologies
- **Language**: TypeScript
- **Framework**: Apollo Server, Node.js
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

### Responsibilities
- **Business Logic**: Implement application domain logic and service layer operations
- **GraphQL API**: Expose data and operations through GraphQL resolvers
- **Database Access**: Handle all data persistence and retrieval operations
- **Authentication**: Verify JWT tokens and establish user identity
- **Authorization**: Enforce user data scoping and prevent cross-user data access

### Backend Layer Structure

The backend implements a clean three-layer architecture that separates concerns and maintains clear dependencies:

```
GraphQL Resolvers → Services → Repositories
```

**Repository Layer**:
- Provide database access interface
- Perform pure data access operations (CRUD)
- Handle errors for database operations
- Avoid business logic
- Organize one repository per entity (recommended)

**Service Layer**:
- Implement business logic and domain rules
- Provide business-specific error messages
- Orchestrate multi-repository operations (operations across multiple repositories)
- Inject repository dependencies in service constructor
- Implement complex validation logic (currency matching, category type validation)
- Orchestrate transactions (atomic operations ensuring data consistency)
- Group related CRUD operations for one entity in one service
- Expose public methods for direct calling by GraphQL resolvers

**GraphQL Layer**:
- Validate user input using Zod schemas
- Enforce authentication and authorization
- Define API schema and documentation
- Transform requests and responses
- Call appropriate service methods
- Avoid direct database access

## Frontend

An npm package providing the user-facing single-page application.

### Technologies
- **Language**: TypeScript
- **Framework**: Vue 3, Vite, Vuetify, Apollo Client
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode, Vue type-checking

### Responsibilities
- **User Interface**: User interface and interactions
- **Client Routing**: Single-page navigation and routing
- **Authentication**: User sign-in and JWT token management
- **GraphQL Client**: GraphQL API client communication

## Backend CDK

An npm package providing infrastructure-as-code for backend deployment to AWS.

### Technologies
- **Language**: TypeScript
- **Framework**: AWS CDK
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

## Frontend CDK

An npm package providing infrastructure-as-code for frontend deployment to AWS.

### Technologies
- **Language**: TypeScript
- **Framework**: AWS CDK
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

## AWS Production Architecture

```mermaid
graph TD
    Browser["User Browser"]

    CloudFront["CloudFront<br/>Distribution"]
    Auth0["Auth0<br/>(Identity Provider)"]

    S3["S3 Bucket<br/>(Frontend Assets)"]
    APIGateway["API Gateway<br/>(HTTP API)"]

    Lambda["Lambda<br/>(/graphql)"]

    DynamoDB["DynamoDB"]

    Browser -->|Static & API| CloudFront
    Browser -->|Login| Auth0
    CloudFront -->|Serve| S3
    CloudFront -->|Forward| APIGateway
    APIGateway -->|Route| Lambda
    Lambda -->|Read/Write| DynamoDB
    Lambda -->|Verify JWT| Auth0
```

## Core Principles

### Test Strategy

**Backend** (primary focus):

- Test repositories
  - In repository tests, use real database connection to validate data access layer
- Test services
  - In service tests, use mocked repositories to isolate business logic from database dependencies
- Test resolvers only on request (optional)
- Test utility functions
- Prefer unit tests over integration tests
- Keep test suite small and effective

**Frontend**:
- Test manually (visual verification in dev)
- Write UI component tests only for complex/critical components; not required

**Test File Location**:
- Co-location strategy: tests live next to the code they test
- Naming: `[source-file].test.ts` in same directory as source `[source-file].ts`

### Soft-Deletion

**Non-negotiable rule**: All entities use soft-deletion by default unless explicitly excepted.

**Implementation**:
- All entities MUST support soft-deletion via an `isArchived` flag or equivalent
- Soft-deleted records MUST NOT appear in user-facing queries by default
- All queries scoped to non-archived records unless intentionally accessing archived data
- Exceptions: Document the business reason in entity comments

**Rationale**: Provides audit trail, enables accidental deletion recovery, and maintains data integrity for historical analysis.

### Vendor Independence

**Non-negotiable rule**: Minimize vendor lock-in through technology choices and architectural decisions that preserve deployment flexibility.

- **Frontend**: Must be deployable to any static hosting provider without code changes
  (S3, GitHub Pages, nginx, Cloudflare Pages, Vercel, or equivalent)
- **Backend**: Must be deployable to any Node.js runtime without code changes
  (AWS Lambda, Docker containers, VPS, bare metal, or equivalent)
- **Data Layer**: Database access must be abstracted to enable migration to another database
  - **Repository Pattern**: Use repository pattern for all database access to support
    database portability and maintainability
  - **Portable Query Patterns**: Use only database operations and query patterns that
    can be reproduced in popular SQL and NoSQL databases (PostgreSQL, MongoDB, MySQL, etc.).
  - Avoid vendor-specific features and optimizations
- **Infrastructure Code**: CDK is AWS-specific but frontend and backend remain portable

### Schema-Driven Development

**Non-negotiable rule**: GraphQL schema is the single source of truth for API contracts. All API changes begin with schema modification.

**Development Process**:
- Backend GraphQL schema defined at `backend/src/schema.graphql` (canonical source)
- Before making any change, read the schema
- Start all API changes with schema updates
- Backend generates TypeScript types via `npm run codegen` after schema changes
- Frontend syncs schema from backend using `npm run codegen:sync-schema` in `frontend/src/schema.graphql`
- Frontend generates typed composables via `npm run codegen` for all GraphQL operations
- Code generation provides full TypeScript type checking across frontend and backend
- Both frontend and backend consume generated types for compile-time type safety

**Rationale**: Single schema source ensures API contracts are unambiguous, prevents type mismatches, enables safe refactoring, and synchronizes frontend and backend versions automatically.

### Database Record Hydration

**Non-negotiable rule**: All data read from the database MUST be validated at the repository boundary before being returned to service or resolver layers.

**Implementation**:
- Use schema validation (Zod or equivalent) to validate every database record at read time
- Validate against TypeScript interfaces to ensure compile-time type safety
- Apply validation consistently across all repositories for uniform error handling

**Rationale**: Validates data at its source (database) for immediate error detection rather than downstream in service logic. Prevents corrupted data from propagating through the application.

### UI Guidelines

- Use snackbars for all user feedback notifications (errors and success messages)
- Optimize design and behavior for mobile devices first, ensure responsive across all screen sizes

## Governance

This constitution supersedes all other development guidelines. Amendments require documentation in the sync impact report and ratification by the team.

**Amendment Process**:
1. Update `.specify/memory/constitution.md` with changes
2. Increment version per semantic versioning (MAJOR/MINOR/PATCH)
3. Document changes in sync impact report (top of file as HTML comment)
4. Commit with message: `docs: amend constitution to vX.Y.Z ([change summary])`
5. Update dependent artifacts (templates, guidance docs) as flagged

**Version**: 0.12.0 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2025-11-16
