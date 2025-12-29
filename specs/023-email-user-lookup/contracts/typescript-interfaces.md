# TypeScript Interface Contracts

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Date**: 2025-12-29

This document defines TypeScript interface changes for email-based authentication.

---

## 1. AuthContext Interface

**File**: `/home/alex/workspace/budget2/backend/src/auth/jwt-auth.ts`

**Current Interface**:
```typescript
export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    auth0UserId: string;
  };
}
```

**New Interface**:
```typescript
export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    email: string;  // Normalized email extracted from JWT
  };
}
```

**Breaking Change**: Yes (internal only - not exposed to external clients)

**Migration Impact**:
- All resolvers using `context.auth.user.auth0UserId` must be updated to use `context.auth.user.email`
- `getAuthenticatedUser()` helper function updated to use email-based lookup

---

## 2. JwtPayload Interface

**File**: `/home/alex/workspace/budget2/backend/src/auth/jwt-auth.ts`

**Current Interface**:
```typescript
export interface JwtPayload {
  sub: string;        // Auth0 user ID
  email?: string;     // User email (optional)
  iss: string;        // Issuer
  aud: string | string[];  // Audience
  exp: number;        // Expiration
  iat: number;        // Issued at
}
```

**Updated Interface**:
```typescript
export interface JwtPayload {
  sub: string;        // Auth0 user ID (still used for logging/debugging)
  email: string;      // User email (NOW REQUIRED - remove ?)
  iss: string;        // Issuer
  aud: string | string[];  // Audience
  exp: number;        // Expiration
  iat: number;        // Issued at
}
```

**Breaking Change**: Yes (email claim now required instead of optional)

**Validation**:
- JWT tokens without email claim must be rejected
- Email claim must be validated as non-empty string
- Email format validation before database lookup

---

## 3. IUserRepository Interface

**File**: `/home/alex/workspace/budget2/backend/src/models/user.ts`

**Current Interface**:
```typescript
export interface IUserRepository {
  findByAuth0UserId(auth0UserId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(auth0UserId: string, email: string): Promise<User>;
}
```

**Updated Interface**:
```typescript
export interface IUserRepository {
  // Existing methods (unchanged)
  findByAuth0UserId(auth0UserId: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;

  // Modified method - behavior changes to email-based lookup
  ensureUser(auth0UserId: string, email: string): Promise<User>;

  // NEW method
  findByEmail(email: string): Promise<User | null>;
}
```

**New Method Signature**:

```typescript
/**
 * Find a user by email address.
 * Email is automatically normalized (trimmed, lowercased, NFC) before lookup.
 *
 * @param email - Email address to search for (normalization applied internally)
 * @returns User if found, null if not found
 * @throws Error if email is empty or invalid format
 * @throws Error if multiple users found with same email (data integrity issue)
 * @throws Error on database query failures
 */
findByEmail(email: string): Promise<User | null>;
```

**Updated Method Behavior: ensureUser()**

```typescript
/**
 * Find existing user by email, or create new user if not found.
 * BEHAVIOR CHANGE: Now looks up by email instead of auth0UserId.
 *
 * @param auth0UserId - Auth0 user ID (used only for new user creation)
 * @param email - Email address (normalized internally, used for lookup)
 * @returns Existing user or newly created user
 * @throws Error on database failures
 */
ensureUser(auth0UserId: string, email: string): Promise<User>;
```

**Breaking Change**: Internal behavior change (method signature unchanged)

---

## 4. GraphQLContext Interface

**File**: `/home/alex/workspace/budget2/backend/src/server.ts`

**Current Interface**:
```typescript
export interface GraphQLContext {
  auth: AuthContext;
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  categoryRepository: ICategoryRepository;
  transactionRepository: ITransactionRepository;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
}
```

**Updated Interface**: No changes to structure

**Behavior Change**:
- `auth` field now contains email instead of auth0UserId
- `userRepository` now has `findByEmail()` method available

---

## 5. Helper Functions

### requireAuthentication()

**File**: `/home/alex/workspace/budget2/backend/src/resolvers/shared.ts`

**Current Signature**:
```typescript
function requireAuthentication(context: GraphQLContext): { auth0UserId: string }
```

**New Signature**:
```typescript
function requireAuthentication(context: GraphQLContext): { email: string }
```

**Return Value Change**: Returns email instead of auth0UserId

---

### getAuthenticatedUser()

**File**: `/home/alex/workspace/budget2/backend/src/resolvers/shared.ts`

**Current Implementation**:
```typescript
export async function getAuthenticatedUser(
  context: GraphQLContext,
): Promise<User> {
  const authUser = requireAuthentication(context);

  const user = await context.userRepository.findByAuth0UserId(
    authUser.auth0UserId
  );

  if (!user) {
    throw new GraphQLError("User not found", {
      extensions: { code: "USER_NOT_FOUND" }
    });
  }

  return user;
}
```

**New Implementation**:
```typescript
export async function getAuthenticatedUser(
  context: GraphQLContext,
): Promise<User> {
  const authUser = requireAuthentication(context);

  // Lookup by email instead of auth0UserId
  const user = await context.userRepository.findByEmail(
    authUser.email
  );

  if (!user) {
    throw new GraphQLError("User not found", {
      extensions: { code: "USER_NOT_FOUND" }
    });
  }

  return user;
}
```

**Behavior Change**: Uses `findByEmail()` instead of `findByAuth0UserId()`

---

## 6. Email Normalization Utility

**New Utility Function** (to be added):

**File**: `/home/alex/workspace/budget2/backend/src/utils/email.ts` (NEW FILE)

```typescript
/**
 * Normalizes an email address for storage and lookup.
 * Applies trimming, lowercasing, and Unicode NFC normalization.
 *
 * @param email - Raw email address
 * @returns Normalized email address
 * @throws Error if email is empty or invalid
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  // 1. Trim leading/trailing whitespace
  let normalized = email.trim();

  // 2. Convert to lowercase
  normalized = normalized.toLowerCase();

  // 3. Apply Unicode NFC normalization
  normalized = normalized.normalize('NFC');

  return normalized;
}

/**
 * Validates email format according to RFC 5322 standards.
 * Uses validator.js for RFC-compliant validation.
 *
 * @param email - Email address to validate (should be normalized first)
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  // Email length: RFC 5321 allows max 254 characters
  if (email.length > 254) {
    return false;
  }

  // Local part (before @) max 64 characters
  const [localPart] = email.split('@');
  if (localPart && localPart.length > 64) {
    return false;
  }

  // Use validator.js for RFC-compliant validation
  return validator.isEmail(email);
}
```

**Dependency**: Requires `validator` npm package

---

## Type Safety Guarantees

All interface changes maintain type safety:

1. **Compile-time checks**: TypeScript will flag any code using old `auth0UserId` field
2. **Runtime validation**: Zod schemas validate email claim exists in JWT
3. **Repository hydration**: User schema validates all database records

---

## Migration Checklist

Before deployment:
- [ ] Update AuthContext interface in jwt-auth.ts
- [ ] Update JwtPayload interface (email required)
- [ ] Add findByEmail() to IUserRepository interface
- [ ] Update requireAuthentication() return type
- [ ] Update getAuthenticatedUser() implementation
- [ ] Create normalizeEmail() utility function
- [ ] Install validator npm package
- [ ] Update all resolver code using auth0UserId
- [ ] Run TypeScript compiler to catch breaking changes
- [ ] Update tests to use email-based mocking
