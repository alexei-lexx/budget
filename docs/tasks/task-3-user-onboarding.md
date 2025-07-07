# Task 3: User Onboarding and Database Integration

**Objective:** Implement automatic user creation in internal database upon successful Auth0 authentication, with complete development and production database setup.

## Current State Analysis

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

## Target Architecture

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

## Implementation Plan

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

- [x] **3.5 GraphQL Schema and Resolvers**
  - [x] 3.5.1 Define User type in GraphQL schema
  - [x] 3.5.2 Add ensureUser mutation
  - [x] 3.5.3 Implement ensureUser resolver with existence checking
  - [x] 3.5.4 Add input validation and error handling

- [x] **3.6 Frontend Integration**
  - [x] 3.6.1 Configure Apollo Client to send JWT tokens in headers
  - [x] 3.6.2 Add ensureUser mutation call to frontend
  - [x] 3.6.3 Call ensureUser immediately after successful Auth0 login
  - [x] 3.6.4 Add loading states and error handling for user creation
  - [x] 3.6.5 Test complete flow from login to user creation

## Success Criteria

- [x] Development database runs locally with Docker Compose
- [x] Production DynamoDB table created automatically via CDK
- [x] Users automatically created on first authenticated request
- [x] Duplicate user creation handled gracefully
- [x] Auth0 user ID used as primary identifier
- [x] Email addresses normalized to lowercase
- [x] Complete error handling for all failure scenarios
- [x] Frontend shows appropriate loading/error states during onboarding