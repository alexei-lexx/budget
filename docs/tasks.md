# Implementation Tasks

## Instructions for Adding New Tasks

When creating new implementation tasks in this file, follow these guidelines:

1. **Structure**: Use GitHub markdown ordered lists with checkboxes `[ ]`
2. **Numbering**: Use format `1.2.3` (maximum 3 levels) where:
   - `1` = Task number
   - `2` = Subtask number
   - `3` = Step number
3. **Definitions**:
   - **Task**: A major user-facing feature or business capability that delivers value. Written from user/product owner perspective describing what functionality will be available. Uses single-digit numbering (e.g., "Task 1"). Exception: purely technical tasks that enable other features.
   - **Subtask**: A specific subfeature or user capability within the main task. Each subtask should deliver standalone value that users can directly benefit from. Written from user perspective (e.g., "Delete Account", "Export Data"). Uses two-digit numbering format `X.Y` (e.g., "1.1", "1.2").
   - **Step**: The technical implementation details and specific work items needed to deliver the subtask. Uses three-digit numbering format `X.Y.Z` (e.g., "1.1.1"). This is where technical implementation details belong.
4. **Content to include**:
   - Objective and current state analysis
   - Target architecture description
   - Implementation plan with numbered phases
   - Success criteria
5. **Progress tracking**: Mark completed tasks by changing `[ ]` to `[x]`

---

## Task 1: Unified CloudFront Infrastructure

**Objective:** Implement a unified CloudFront distribution that serves both the frontend assets and GraphQL API through a single domain, replacing the current separate infrastructure.

### Current State Analysis

**Backend Infrastructure (`backend-cdk/`):**
- Lambda function with direct function URL (no API Gateway)
- No cross-stack outputs or imports
- Function URL bypasses CloudFront integration

**Frontend Infrastructure (`frontend-cdk/`):**
- S3 bucket with separate CloudFront distribution
- No API integration or routing
- Independent deployment pipeline

**Deployment Process:**
- Sequential independent deployments
- No communication between stacks
- Manual S3 sync for frontend assets

### Target Architecture

**Unified Single-Domain Setup:**
```
https://example.cloudfront.net/
├── /                    → Frontend (S3 origin)
├── /graphql        → GraphQL API (API Gateway origin)
└── /assets/*           → Frontend assets (S3 origin)
```

### Implementation Plan

- [x] **1.1 Backend Infrastructure Updates**
  - [x] **1.1.1 Add API Gateway to Backend Stack**
    - [x] 1.1.1.1 Replace Lambda function URL with API Gateway REST API
    - [x] 1.1.1.2 Configure API Gateway with `/graphql` endpoint
    - [x] 1.1.1.3 Update Lambda integration to use API Gateway proxy
  - [x] **1.1.2 Export Backend Outputs**
    - [x] 1.1.2.1 Export API Gateway domain name
    - [x] 1.1.2.2 Export API Gateway stage URL
    - [x] 1.1.2.3 Make these available for frontend stack consumption
  - [x] **1.1.3 Testing**
    - [x] 1.1.3.1 Verify API Gateway endpoints respond correctly
    - [x] 1.1.3.2 Validate Lambda integration works through API Gateway

- [x] **1.2 Frontend Infrastructure Updates**
  - [x] 1.2.1 Import API Gateway domain from backend stack
  - [x] 1.2.2 Configure CloudFront to use API Gateway as origin
  - [x] 1.2.3 Add behavior for `/graphql*` routes → API Gateway origin
  - [x] 1.2.4 Keep default behavior for `/*` routes → S3 origin
  - [x] 1.2.5 Configure appropriate caching policies for each origin
  - [x] 1.2.6 Set up proper security headers
  - [x] 1.2.7 Test CloudFront routing works for both `/` and `/graphql*`
  - [x] 1.2.8 Test that frontend can make GraphQL requests
  - [x] 1.2.9 Verify caching behavior is appropriate

- [x] **1.3 Frontend-Backend Integration**
  - [x] 1.3.1 Configure Apollo Client in Vue.js frontend
  - [x] 1.3.2 Set up environment-specific API endpoints:
    - [x] 1.3.2.1 Local development: `http://localhost:4000/graphql` (backend dev server)
    - [x] 1.3.2.2 Production: `/graphql` (unified CloudFront domain - same origin)
  - [x] 1.3.3 Implement GraphQL queries in Vue components
  - [x] 1.3.4 Update UI components to display data from GraphQL API
  - [x] 1.3.5 Test integration in local development environment
  - [x] 1.3.6 Test integration in deployed production environment

### Success Criteria

- ✅ Single CloudFront domain serves both frontend and API
- ✅ GraphQL endpoint accessible at `/graphql`
- ✅ Frontend can make same-origin API requests
- ✅ Deployment process works reliably with new architecture
- ✅ Performance is maintained or improved
- ✅ All existing functionality continues to work

---

## Task 2: Auth0 Authentication Integration

**Objective:** Integrate Auth0 authentication with Vue.js frontend, providing sign in/sign out functionality with environment-specific configuration.

### Current State Analysis

**Frontend Authentication:**
- No authentication system implemented
- No user session management
- No protected routes or authentication guards

**Backend Authentication:**
- ✅ Existing Auth0 JWT verification in GraphQL context (out of scope)
- ✅ User context extraction from JWT tokens (out of scope)
- ✅ Database operations scoped to authenticated users (out of scope)

### Target Architecture

**Frontend Authentication Flow:**
```
User → Auth0 Login → JWT Token → Vue App State
                                    ↓
                              UI Updates & Token Storage
```

### Implementation Plan

- [x] **2.1 Environment and Dependencies Setup**
  - [x] 2.1.1 Check existing Auth0 dependencies in package.json
  - [x] 2.1.2 Review any existing Auth0 configuration files
  - [x] 2.1.3 Check current frontend structure and routing
  - [x] 2.1.4 Install @auth0/auth0-vue package if not present
  - [x] 2.1.5 Verify version compatibility with Vue 3
  - [x] 2.1.6 Create .env.example file with Auth0 config template
  - [x] 2.1.7 Create .env.local for development Auth0 config (not in git)
  - [x] 2.1.8 Configure production environment variables
  - [x] 2.1.9 Set up same Auth0 client ID for dev/prod initially

- [x] **2.2 Auth0 Vue Integration**
  - [x] 2.2.1 Create Auth0 configuration object with domain and clientId
  - [x] 2.2.2 Configure redirect URIs for dev/prod environments
  - [x] 2.2.3 Set up audience for GraphQL API
  - [x] 2.2.4 Configure Auth0 plugin in main.ts
  - [x] 2.2.5 Initialize Auth0 with environment-specific config

- [x] **2.3 Authentication State Management**
  - [x] 2.3.1 Create useAuth composable for authentication state
  - [x] 2.3.2 Expose login, logout, and user state
  - [x] 2.3.3 Handle loading states and errors
  - [x] 2.3.4 Configure token storage and retrieval
  - [x] 2.3.5 Set up automatic token refresh
  - [x] 2.3.6 Handle token expiration

- [x] **2.4 UI Components**
  - [x] 2.4.1 Create LoginButton component
  - [x] 2.4.2 Create LogoutButton component
  - [x] 2.4.3 Add loading states and error handling
  - [x] 2.4.4 Update main layout/header to include auth buttons
  - [x] 2.4.5 Show appropriate button based on authentication state
  - [x] 2.4.6 Display user information when authenticated


### Success Criteria

- [x] Users can sign in using Auth0
- [x] Users can sign out and clear their session
- [x] Authentication state persists across page reloads
- [?] Environment-specific configuration works for dev/prod
- [x] UI appropriately shows authentication status
- [?] Error states are handled gracefully
- [?] JWT tokens are stored and available for future GraphQL integration

---

## Task 3: User Onboarding and Database Integration

**Objective:** Implement automatic user creation in internal database upon successful Auth0 authentication, with complete development and production database setup.

### Current State Analysis

**Authentication Status:**
- ❌ Auth0 JWT verification NOT implemented in backend
- ✅ Frontend Auth0 integration complete (can obtain JWT tokens)
- ❌ User context extraction from JWT tokens missing
- ❌ JWT tokens not sent from frontend to backend

**Database Status:**
- ❌ No user management in internal database
- ❌ No user creation mechanism
- ❌ No development database setup
- ❌ All operations assume existing users

**Backend GraphQL:**
- ❌ Only health check query implemented
- ❌ No user-related mutations or queries
- ❌ No database integration

### Target Architecture

**User Creation Flow:**
```
Auth0 Login → Frontend → GraphQL Request → ensureUser Mutation → DynamoDB
     ↓            ↓              ↓              ↓                ↓
JWT Token → Apollo Client → Auth Header → Check Existence → Create User
```

**Database Schema:**
```typescript
interface User {
  id: string;           // UUID v4 primary key
  auth0UserId: string;  // Auth0 sub claim (unique)
  email: string;        // Normalized lowercase email
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

### Implementation Plan

- [x] **3.1 Development Database Setup**
  - [x] 3.1.1 Create Docker Compose configuration for DynamoDB Local
  - [x] 3.1.2 Add npm scripts for database management
  - [x] 3.1.3 Create table creation scripts for development
  - [x] 3.1.4 Update development documentation

- [x] **3.2 Production Database Configuration**
  - [x] 3.2.1 Update backend-cdk to create Users table
  - [x] 3.2.2 Configure proper partition key (id) and GSI (auth0UserId)
  - [x] 3.2.3 Set up point-in-time recovery
  - [x] 3.2.4 Configure appropriate billing mode
  - [x] 3.2.5 Add IAM permissions for Lambda

- [x] **3.3 Backend User Management**
  - [x] 3.3.1 Use built-in crypto.randomUUID() for internal user ID generation
  - [x] 3.3.2 Create User model and types
  - [x] 3.3.3 Implement UserRepository with findByAuth0UserId and create operations
  - [x] 3.3.4 Add user existence checking by Auth0 user ID only
  - [x] 3.3.5 Implement user creation with validation

- [x] **3.4 JWT Authentication Setup**
  - [x] 3.4.1 Install JWT verification libraries (jsonwebtoken, jwks-rsa)
  - [x] 3.4.2 Add JWT verification to Apollo Server context
  - [x] 3.4.3 Extract user info from verified JWT tokens
  - [x] 3.4.4 Handle authentication errors and edge cases

- [ ] **3.5 GraphQL Schema and Resolvers**
  - [ ] 3.5.1 Define User type in GraphQL schema
  - [ ] 3.5.2 Add ensureUser mutation
  - [ ] 3.5.3 Implement ensureUser resolver with existence checking
  - [ ] 3.5.4 Add input validation and error handling

- [ ] **3.6 Frontend Integration**
  - [ ] 3.6.1 Configure Apollo Client to send JWT tokens in headers
  - [ ] 3.6.2 Add ensureUser mutation call to frontend
  - [ ] 3.6.3 Call ensureUser immediately after successful Auth0 login
  - [ ] 3.6.4 Add loading states and error handling for user creation
  - [ ] 3.6.5 Test complete flow from login to user creation

### Success Criteria

- [ ] Development database runs locally with Docker Compose
- [ ] Production DynamoDB table created automatically via CDK
- [ ] Users automatically created on first authenticated request
- [ ] Duplicate user creation handled gracefully
- [ ] Auth0 user ID used as primary identifier
- [ ] Email addresses normalized to lowercase
- [ ] Complete error handling for all failure scenarios
- [ ] Frontend shows appropriate loading/error states during onboarding
