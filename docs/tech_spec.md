# Technical Stack Specification

- **Project Name:** Personal Finance Tracker
- **Version:** 1.0
- **Date:** 12 June 2025

---

## 1. System Overview

Personal Finance Tracker is a serverless web application for individual financial management. Users authenticate via Auth0, manage their financial data through a Vue.js frontend, and store data in AWS DynamoDB via a GraphQL API.

### Architecture
```
                                    ┌─────────────┐
                                    │     S3      │
                                    │  (Static    │
                                    │   Assets)   │
                                    └─────────────┘
                                           ▲
┌─────────────┐    ┌──────────────┐        │        ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───>│ CloudFront   │────────┼───────>│ API Gateway  │───>│   Lambda    │───>│  DynamoDB   │
│  (Vue SPA)  │    │    (CDN)     │        │        │   (HTTP      │    │ (GraphQL    │    │  (User      │
│             │    │              │        │        │    API)      │    │   API)      │    │   Data)     │
└─────────────┘    └──────────────┘        │        └──────────────┘    └─────────────┘    └─────────────┘
       │                   │               │                                    │
       │                   └───────────────┘                                    │
       │                                                                        │
       │                                      ┌─────────────┐                   │
       └─────────────────────────────────────>│   Auth0     │<──────────────────┘
                                              │ (Identity   │
                                              │  Provider)  │
                                              └─────────────┘
```

### Repository Structure
- **frontend/** - Vue 3 + Vite application
- **backend/** - Apollo GraphQL server
- **frontend-cdk/** - Frontend infrastructure (S3/CloudFront)
- **backend-cdk/** - Backend infrastructure (Lambda/API Gateway)

---

## 2. Frontend

### Technologies
- **Vue 3** - Progressive JavaScript framework with Composition API and Vue Router
- **Vite** - Fast build tool and development server
- **Vuetify** - Material Design component library
- **Apollo Client** - GraphQL client for data fetching
- **Auth0 SDK** - Authentication integration
- **TypeScript** - Type safety and enhanced developer experience

### Responsibilities
- User interface and user experience
- Client-side routing for single-page application
- Auth0 authentication integration
- GraphQL API communication
- Local UI state management using Vue's reactivity

### Key Features
- PWA support for mobile installation
- Responsive design optimized for mobile browsers
- Authentication with automatic token refresh
- Apollo Client cache for server data management

### UI Guidelines
- **Notifications** - Use snackbars for user feedback (success/error messages)

---

## 3. Backend

### Technologies
- **Apollo Server** - GraphQL server implementation
- **Node.js** - JavaScript runtime environment
- **TypeScript** - Type-safe server-side development
- **esbuild** - Fast bundling for Lambda deployment
- **JWT libraries** - Token verification and Auth0 integration
- **AWS SDK** - DynamoDB client libraries

### Responsibilities
- GraphQL API implementation
- Auth0 JWT token verification
- Business logic and data validation
- Database operations through repository pattern
- User context management and data isolation

### Key Features
- Schema-first GraphQL development
- Authentication middleware for JWT verification
- Repository pattern for database abstraction
- Service layer for business logic and cross-repository operations
- Structured error handling and input validation

### Backend Architecture Pattern

The backend follows a clean three-layer architecture pattern:

```
GraphQL Resolvers → Services → Repositories → Database
```

**Repository Layer:**
- Pure data access operations (CRUD)
- Database-specific implementations
- No business logic or cross-repository dependencies
- Error handling for database operations
- Environment-aware configuration (local DynamoDB vs AWS)

**Service Layer:**
- Business logic and domain rules
- Cross-repository coordination (e.g., transaction validation needs account + category repositories)
- Complex validation logic (currency matching, category type validation)
- Transaction orchestration
- Error transformation and business-specific error messages

**GraphQL Layer:**
- User input validation using Zod schemas
- Authentication and authorization
- API schema definition and documentation
- Request/response transformation
- Calling appropriate service methods

### Input Validation Strategy

**Hybrid Two-Tier Validation Approach:**

The application implements validation at two distinct layers, each with specific responsibilities:

#### 1. GraphQL Layer - Input Validation (Zod Schemas)

**Purpose:** Validate API input structure, format, and basic constraints

**Responsibilities:**
- Schema compliance (required fields, correct data types)
- Format validation (UUID format, date format, email format)
- Range constraints (positive numbers, string length limits)
- Enum validation (predefined values like INCOME/EXPENSE)
- Type safety (generate TypeScript types from schemas)

**Example:**
```typescript
const createTransactionInput = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});
```

#### 2. Service Layer - Business Validation

**Purpose:** Enforce domain rules and entity relationships

**Responsibilities:**
- Entity existence validation (account exists, category exists)
- Business rule enforcement (currency matching, category type consistency)
- Cross-entity validation (transaction requires valid account)
- Domain-specific constraints (prevent account currency changes when transactions exist)
- Data integrity rules (category type must match transaction type)

**Example:**
```typescript
// In TransactionService
const account = await this.accountRepo.findById(input.accountId, userId);
if (!account) throw new BusinessError("Account not found");

if (input.currency !== account.currency) {
  throw new BusinessError("Transaction currency must match account currency");
}
```

#### Benefits of Hybrid Approach

**Fail Fast Principle:**
- Malformed input rejected immediately at API boundary
- Business rule violations caught in appropriate domain context

**Clear Error Messages:**
- Input validation: "Amount must be a positive number"
- Business validation: "Cannot create transaction - account currency (USD) doesn't match transaction currency (EUR)"

**Performance Optimization:**
- Invalid input never reaches service layer
- Service layer focuses on business logic, not format checking

**Reusability with Efficiency:**
- Services remain API-agnostic and reusable
- Each API layer handles its own input format validation

**Testing Clarity:**
- Input validation tested independently from business logic
- Business logic tested with pre-validated inputs
- Clear separation of test responsibilities

### GraphQL Schema Design Principles
- **Internal Fields Hidden:** Archive status, timestamp fields, and user ID are used internally but never exposed in GraphQL schema
- **Human-Readable Fields:** Only business-relevant fields with meaningful names are exposed to frontend
- **User Context Implicit:** User ID is handled automatically through authentication context, not passed as parameters
- **Clean API Surface:** GraphQL schema reflects user-facing functionality, not database implementation details

### Runtime Environment
- **Primary:** AWS Lambda for serverless execution
- **Portable:** Can run on any Node.js hosting platform (Docker, VPS, etc.)

### Dependencies
Apollo Server, GraphQL, esbuild, JWT libraries, AWS SDK, TypeScript

---

## 4. Database

### Technology
- **AWS DynamoDB** - NoSQL document database
- **Scaling** - On-demand billing with automatic scaling

### Data Architecture
- All user data partitioned by internal user ID
- Users created automatically on first sign-in
- Linked to Auth0 account via Auth0 user ID
- Point-in-time recovery enabled for backups

### Vendor Independence
- **Repository Pattern** - Database operations abstracted behind service layer
- **Generic Queries** - Avoid DynamoDB-specific features
- **Migration Ready** - Can switch to PostgreSQL, MongoDB, etc.
- **Portability** - Database design enables future platform changes

---

## 5. Authentication

### Provider
- **Auth0** - Identity service and JWT token management
- **Initial Phase** - Email/password authentication
- **User Creation** - Manual creation in Auth0 dashboard
- **Future Expansion** - Social logins (Google, GitHub, etc.)

### Token Flow
1. User authenticates with Auth0, receives JWT tokens
2. Frontend includes JWT in GraphQL request headers
3. Backend verifies JWT signature and extracts user context
4. Database operations scoped to authenticated user

### Security Features
- JWT signature validation with Auth0 public keys
- Automatic token refresh in frontend
- User data isolation at database level
- Authentication handled in backend code, not AWS services

---

## 6. Infrastructure

### AWS Services
- **S3** - Static website hosting for Vue.js application
- **CloudFront** - CDN for global content delivery
- **Lambda** - Serverless compute for GraphQL API
- **API Gateway** - HTTP API endpoint with rate limiting
- **DynamoDB** - NoSQL database with automatic scaling
- **IAM** - Least-privilege access roles

### CDK Architecture
- **Language** - TypeScript for type-safe infrastructure
- **Stacks** - Separate deployments for frontend and backend
- **Environments** - Support for dev/prod configurations

### Deployment
- **Method** - Manual deployment via shell script
- **Sequence** - Backend infrastructure → Backend code → Frontend infrastructure → Frontend assets
- **Rollback** - Redeploy previous Git commit via deployment script

### Security
- HTTPS enforcement and rate limiting
- Least-privilege IAM policies

### Vendor Independence
- Minimal AWS dependencies to avoid vendor lock-in
- Frontend can be deployed on any static hosting provider (S3, GitHub Pages, nginx)
- Backend can run on any Node.js platform (Lambda, Docker, VPS)

---

## 7. Development Environment

### Local Development
- **Frontend** - Vite dev server with hot reload
- **Backend** - Apollo server with GraphQL playground
- **Database** - DynamoDB Local for offline development
- **Authentication** - Auth0 development tenant

### Code Quality
- **Linting** - ESLint with TypeScript
- **Formatting** - Prettier
- **Testing** - Jest unit tests
- **TypeScript Best Practices**
  - Avoid unnecessary type checks (typeof, non-null, non-undefined) when the provided type is explicit and doesn't require such checks

### Environment Configuration
- Environment-specific configs for Auth0, AWS, and API endpoints
- Separate AWS profiles for dev/prod environments

---

## 8. Technical Rationale

### Technology Choices

**Vue.js over React/Angular:**
- Simpler learning curve for solo development
- Excellent TypeScript integration
- Rich ecosystem with Vuetify
- Smaller bundle size

**GraphQL over REST:**
- Type-safe API development
- Flexible data fetching
- Single endpoint simplifies client code
- Excellent tooling and introspection

**Auth0 over AWS Cognito:**
- Multiple authentication methods support
- Better developer experience
- Future expansion to social logins
- Industry-standard security practices

**DynamoDB over RDS:**
- Serverless architecture alignment
- Pay-per-request pricing model
- Automatic scaling without configuration
- Single-digit millisecond latency

### Key Principles

**Vendor Independence:** Minimal dependencies, portable across hosting providers, repository pattern for database abstraction

**Simplicity:** Manual deployment, no complex CI/CD, straightforward troubleshooting

**Security:** JWT verification, user data isolation, HTTPS enforcement
