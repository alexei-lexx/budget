# Data Model: Email-Based User Lookup

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Branch**: 023-email-user-lookup
**Date**: 2025-12-29

This document defines the data entities and their modifications for email-based user authentication.

---

## Entities

### 1. User (Modified Existing Entity)

**Description**: Represents an application user identified by email address.

**Storage**: DynamoDB Users table

**Primary Key**: `id` (UUID v4)

**Indexes**:
- **Auth0UserIdIndex** (GSI - EXISTING): Partition key on `auth0UserId` - Will be deprecated after Cognito migration
- **EmailIndex** (GSI - NEW): Partition key on `email` - Primary lookup mechanism

**Fields**:

| Field | Type | Required | Constraints | Notes |
|-------|------|----------|-------------|-------|
| `id` | String (UUID v4) | Yes | Primary key | Unchanged |
| `auth0UserId` | String | Yes | Unique via GSI | Will be deprecated; kept for migration |
| `email` | String | Yes | Unique, normalized, indexed | **CRITICAL**: Must be normalized (trimmed, lowercase, NFC) |
| `transactionPatternsLimit` | Number | No | Positive integer | Unchanged |
| `createdAt` | String (ISO 8601) | Yes | Valid timestamp | Unchanged |
| `updatedAt` | String (ISO 8601) | Yes | Valid timestamp | Unchanged |

**Validation Rules**:
- Email must be valid RFC 5322 format
- Email max length: 254 characters
- Email local part max length: 64 characters
- Email normalization: `email.trim().toLowerCase().normalize('NFC')`
- Email uniqueness enforced at application layer (DynamoDB doesn't support unique constraints on GSI)

**State Transitions**: Not applicable (users are created and updated, not transitioned through states)

**Relationships**:
- One-to-many with Accounts (via `userId` foreign key)
- One-to-many with Categories (via `userId` foreign key)
- One-to-many with Transactions (via `userId` foreign key)

**Example Record**:
```json
{
  "id": "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789",
  "auth0UserId": "auth0|507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "transactionPatternsLimit": 50,
  "createdAt": "2025-12-29T10:30:00.000Z",
  "updatedAt": "2025-12-29T10:30:00.000Z"
}
```

**Migration Notes**:
- Email field already exists in production data
- Adding EmailIndex GSI does not require data backfill
- Email values must already be normalized (verify before deployment)

---

### 2. JWT Token (Transient, Not Persisted)

**Description**: Auth0-issued JWT token containing user identity claims.

**Storage**: Not stored; validated on every request

**Required Claims**:

| Claim | Type | Required | Validation |
|-------|------|----------|------------|
| `sub` | String | Yes | Auth0 user ID (format: `auth0\|...`) |
| `email` | String | **Yes (NEW)** | Valid email address, will be normalized before lookup |
| `iss` | String | Yes | Must match `https://{AUTH0_DOMAIN}/` |
| `aud` | String/Array | Yes | Must match `AUTH0_AUDIENCE` |
| `exp` | Number | Yes | Must be in the future |
| `iat` | Number | Yes | Issued at timestamp |

**Validation Requirements**:
- Token signature verified against Auth0 public keys
- Email claim must exist (reject if missing)
- Email claim must be valid format
- Email normalized before database lookup

**Example Decoded Payload**:
```json
{
  "sub": "auth0|507f1f77bcf86cd799439011",
  "email": "User@Example.COM",
  "iss": "https://your-tenant.auth0.com/",
  "aud": "your-api-identifier",
  "exp": 1735475400,
  "iat": 1735471800
}
```

**Processing Flow**:
1. Extract token from `Authorization: Bearer <token>` header
2. Verify signature and claims
3. Extract `email` claim
4. Normalize email: `email.trim().toLowerCase().normalize('NFC')`
5. Lookup user via `findByEmail(normalizedEmail)`

---

### 3. AuthContext (Modified Interface)

**Description**: Authentication context passed to GraphQL resolvers.

**Storage**: Request-scoped, not persisted

**Fields** (CHANGED):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `isAuthenticated` | Boolean | Yes | Unchanged |
| `user.email` | String | Yes (if authenticated) | **NEW**: Replaces `user.auth0UserId` |

**Old Interface** (to be removed):
```typescript
interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    auth0UserId: string;  // DEPRECATED
  };
}
```

**New Interface**:
```typescript
interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    email: string;  // NEW: Normalized email from JWT
  };
}
```

**Usage in Resolvers**:
- Extract via `requireAuthentication(context)` helper
- Pass to `getAuthenticatedUser(context)` to fetch full User record
- Use email for user lookup instead of auth0UserId

---

## Database Schema Changes

### DynamoDB Table: Users

**Current Schema**:
- Partition Key: `id`
- GSI: `Auth0UserIdIndex` on `auth0UserId`

**New Schema**:
- Partition Key: `id` (unchanged)
- GSI: `Auth0UserIdIndex` on `auth0UserId` (unchanged, will be deprecated later)
- GSI: **`EmailIndex` on `email`** (NEW)

**EmailIndex Configuration**:
```typescript
{
  IndexName: "EmailIndex",
  KeySchema: [
    { AttributeName: "email", KeyType: "HASH" }
  ],
  Projection: {
    ProjectionType: "ALL"  // Project all attributes for full user lookup
  }
}
```

**Attribute Definitions** (DynamoDB requirement):
```typescript
AttributeDefinitions: [
  { AttributeName: "id", AttributeType: "S" },
  { AttributeName: "auth0UserId", AttributeType: "S" },
  { AttributeName: "email", AttributeType: "S" }  // ADD THIS
]
```

---

## Repository Interface Changes

### IUserRepository (Modified)

**New Method**:
```typescript
interface IUserRepository {
  // Existing methods (unchanged)
  findByAuth0UserId(auth0UserId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(auth0UserId: string, email: string): Promise<User>;

  // NEW METHOD
  findByEmail(email: string): Promise<User | null>;
}
```

**Method Specification: findByEmail()**

**Parameters**:
- `email` (string): Email address to lookup (will be normalized internally)

**Returns**: `Promise<User | null>`
- User object if found
- null if not found
- Throws error if multiple users found (data integrity issue)

**Behavior**:
1. Normalize email: `email.trim().toLowerCase().normalize('NFC')`
2. Query EmailIndex GSI with normalized email
3. Validate exactly 0 or 1 results
4. Hydrate result with userSchema
5. Return user or null

**Error Conditions**:
- Throws if email is empty or invalid format
- Throws if multiple users found with same email
- Throws on database query failures

**Updated Method: ensureUser()**

**Current Signature**:
```typescript
ensureUser(auth0UserId: string, email: string): Promise<User>
```

**Behavior Change**:
- OLD: Lookup by `auth0UserId`, create if not found
- NEW: Lookup by `email`, create if not found
- Email parameter still used, now as primary lookup key

---

## Data Flow Diagrams

### Current Flow (Auth0 ID Lookup)

```
JWT Token
  ↓
Extract auth0UserId from `sub` claim
  ↓
Query Users table via Auth0UserIdIndex GSI
  ↓
Return User or null
```

### New Flow (Email Lookup)

```
JWT Token
  ↓
Extract email from `email` claim
  ↓
Normalize email (trim, lowercase, NFC)
  ↓
Query Users table via EmailIndex GSI
  ↓
Return User or null
```

---

## Data Integrity Constraints

### Enforced by Database
- Primary key uniqueness on `id`
- GSI partition key indexed (but not unique constraint)

### Enforced by Application Layer

**Critical Constraints**:
1. **Email Uniqueness**: Prevent duplicate emails through conditional writes
   ```typescript
   ConditionExpression: 'attribute_not_exists(email)'
   ```

2. **Email Normalization Consistency**: All code paths must normalize identically
   - Repository.create()
   - Repository.findByEmail()
   - Repository.ensureUser()
   - JWT token processing

3. **Email Validation**: Reject invalid emails at entry points
   - RFC 5322 format validation
   - Length constraints (254 total, 64 local part)

4. **Data Integrity Detection**: Throw error if multiple users found with same email
   - Indicates data corruption
   - Should trigger alerts

### Migration Validation

Before deployment, verify:
- [ ] All existing users have non-null email values
- [ ] All existing emails are already normalized (lowercase)
- [ ] No duplicate emails exist in production data

**Verification Query**:
```typescript
// Scan all users and check for duplicates
const users = await userRepository.findAll();
const emailCounts = users.reduce((acc, user) => {
  const normalizedEmail = normalizeEmail(user.email);
  acc[normalizedEmail] = (acc[normalizedEmail] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const duplicates = Object.entries(emailCounts)
  .filter(([_, count]) => count > 1);

if (duplicates.length > 0) {
  console.error("CRITICAL: Duplicate emails found:", duplicates);
  throw new Error("Cannot deploy with duplicate emails");
}
```

---

## Summary

**Key Changes**:
1. Add `EmailIndex` GSI to Users table
2. Add `findByEmail()` method to UserRepository
3. Update `AuthContext` to use email instead of auth0UserId
4. Ensure email normalization at all entry points
5. Update `ensureUser()` to lookup by email

**No Changes**:
- User entity fields (email field already exists)
- Primary key structure
- Relationships with other entities
- GraphQL schema (User.email already exposed)

**Critical Requirements**:
- Email normalization must be consistent: `trim().toLowerCase().normalize('NFC')`
- Email uniqueness enforced at application layer
- Validate email format before storage
- Verify no duplicate emails before deployment
