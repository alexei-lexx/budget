# Quickstart: Email-Based User Lookup

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Branch**: 023-email-user-lookup
**Date**: 2025-12-29

Quick reference guide for implementing email-based user authentication.

---

## TL;DR

Migrate backend authentication from Auth0 user ID lookups to email-based lookups. This is a backend-only change - no frontend or GraphQL schema modifications required.

**Core Changes**:
1. Add EmailIndex GSI to Users table (DynamoDB)
2. Add `findByEmail()` repository method
3. Update `AuthContext` to use email instead of auth0UserId
4. Update JWT processing to extract and validate email claim
5. Update resolvers to use email-based user lookup

---

## Quick Implementation Guide

### 1. Add Email Normalization Utility

**Create**: `backend/src/utils/email.ts`

```typescript
import validator from 'validator';

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }
  return email.trim().toLowerCase().normalize('NFC');
}

export function validateEmail(email: string): boolean {
  if (email.length > 254) return false;
  const [localPart] = email.split('@');
  if (localPart && localPart.length > 64) return false;
  return validator.isEmail(email);
}

export function normalizeAndValidateEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!validateEmail(normalized)) {
    throw new Error(`Invalid email address: ${email}`);
  }
  return normalized;
}
```

**Install dependency**: `npm install validator && npm install -D @types/validator`

### 2. Update DynamoDB Schema (CDK)

**File**: `backend-cdk/lib/backend-cdk-stack.ts`

```typescript
// Add email to attribute definitions
const usersTable = new dynamodb.Table(this, "UsersTable", {
  tableName: process.env.USERS_TABLE_NAME || "",
  partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
  ...commonTableOptions,
});

// Keep existing Auth0UserIdIndex
usersTable.addGlobalSecondaryIndex({
  indexName: "Auth0UserIdIndex",
  partitionKey: { name: "auth0UserId", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

// ADD THIS: EmailIndex GSI
usersTable.addGlobalSecondaryIndex({
  indexName: "EmailIndex",
  partitionKey: { name: "email", type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

**Also update**: `backend/src/scripts/table-definitions.ts` for local development

### 3. Update User Repository

**File**: `backend/src/repositories/user-repository.ts`

```typescript
import { normalizeEmail } from '../utils/email';

// ADD THIS METHOD
async findByEmail(email: string): Promise<User | null> {
  try {
    const normalizedEmail = normalizeEmail(email);

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": normalizedEmail,
      },
    });

    const result = await this.client.send(command);

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    if (result.Items.length > 1) {
      throw new Error(
        `Data integrity error: Multiple users found for email ${normalizedEmail}`
      );
    }

    return hydrate(userSchema, result.Items[0]);
  } catch (error) {
    console.error("Error finding user by email:", error);
    throw new Error("Failed to find user");
  }
}

// UPDATE THIS METHOD
async ensureUser(auth0UserId: string, email: string): Promise<User> {
  // Change from findByAuth0UserId to findByEmail
  const existingUser = await this.findByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  return this.create({ auth0UserId, email });
}
```

**Update interface**: `backend/src/models/user.ts`

```typescript
export interface IUserRepository {
  findByAuth0UserId(auth0UserId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>; // ADD THIS
  findAll(): Promise<User[]>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(auth0UserId: string, email: string): Promise<User>;
}
```

### 4. Update JWT Auth Service

**File**: `backend/src/auth/jwt-auth.ts`

```typescript
import { normalizeAndValidateEmail } from '../utils/email';

// UPDATE INTERFACE: email is now required
export interface JwtPayload {
  sub: string;
  email: string;  // Remove ? (no longer optional)
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
}

// UPDATE INTERFACE: use email instead of auth0UserId
export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    email: string;  // Changed from auth0UserId
  };
}

// UPDATE METHOD
async getAuthContext(authHeader?: string): Promise<AuthContext> {
  if (!authHeader) {
    return { isAuthenticated: false };
  }

  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return { isAuthenticated: false };
  }

  const token = tokenMatch[1];

  try {
    const payload = await this.verifyToken(token);

    // Validate email claim exists
    if (!payload.email) {
      throw new Error('Email claim missing in JWT token');
    }

    // Normalize and validate email
    const normalizedEmail = normalizeAndValidateEmail(payload.email);

    return {
      isAuthenticated: true,
      user: {
        email: normalizedEmail,  // Return email instead of auth0UserId
      },
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { isAuthenticated: false };
  }
}
```

### 5. Update Resolver Helpers

**File**: `backend/src/resolvers/shared.ts`

```typescript
// UPDATE RETURN TYPE
export function requireAuthentication(context: GraphQLContext): { email: string } {
  if (!context.auth.isAuthenticated || !context.auth.user) {
    throw new GraphQLError("Authentication required", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }
  return context.auth.user;  // Now returns { email }
}

// UPDATE IMPLEMENTATION
export async function getAuthenticatedUser(
  context: GraphQLContext,
): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Use findByEmail instead of findByAuth0UserId
    const user = await context.userRepository.findByEmail(authUser.email);

    if (!user) {
      throw new GraphQLError("User not found", {
        extensions: { code: "USER_NOT_FOUND" }
      });
    }

    return user;
  } catch (error) {
    console.error("Error getting user:", error);
    if (error instanceof GraphQLError) {
      throw error;
    }
    throw new GraphQLError("Failed to authenticate user", {
      extensions: { code: "AUTHENTICATION_ERROR" }
    });
  }
}
```

### 6. Add Repository Tests

**File**: `backend/src/repositories/user-repository.test.ts`

Add test suite for `findByEmail()`:

```typescript
describe("findByEmail", () => {
  it("should find user by exact email match (lowercase)", async () => {
    const input = fakeCreateUserInput({ email: "user@example.com" });
    await repository.create(input);

    const result = await repository.findByEmail("user@example.com");

    expect(result).toBeDefined();
    expect(result?.email).toBe("user@example.com");
  });

  it("should find user with uppercase email (case-insensitive)", async () => {
    const input = fakeCreateUserInput({ email: "user@example.com" });
    await repository.create(input);

    const result = await repository.findByEmail("USER@EXAMPLE.COM");

    expect(result).toBeDefined();
    expect(result?.email).toBe("user@example.com");
  });

  it("should trim whitespace from email", async () => {
    const input = fakeCreateUserInput({ email: "user@example.com" });
    await repository.create(input);

    const result = await repository.findByEmail("  user@example.com  ");

    expect(result).toBeDefined();
  });

  it("should return null when email does not exist", async () => {
    const result = await repository.findByEmail("nonexistent@example.com");
    expect(result).toBeNull();
  });
});
```

See [research.md](./research.md#3-testing-strategy-for-case-insensitive-email-lookups) for complete test scenarios.

---

## Deployment Checklist

### Pre-Deployment

- [ ] Install validator package: `npm install validator @types/validator`
- [ ] Create `backend/src/utils/email.ts` with normalization functions
- [ ] Update `backend-cdk/lib/backend-cdk-stack.ts` to add EmailIndex GSI
- [ ] Update `backend/src/scripts/table-definitions.ts` for local development
- [ ] Add `findByEmail()` to UserRepository
- [ ] Update `ensureUser()` to use email lookup
- [ ] Update JWT auth service to extract and validate email claim
- [ ] Update resolver helpers to use email instead of auth0UserId
- [ ] Add comprehensive repository tests (32 scenarios)
- [ ] Run all tests: `npm test`
- [ ] Verify TypeScript compilation: `npx tsc --noEmit`

### CDK Deployment

```bash
cd backend-cdk
npm run build
npx dotenvx run -- npx cdk deploy
```

**Note**: GSI creation is online operation; no downtime required

### Post-Deployment Verification

- [ ] Monitor CloudWatch logs for authentication errors
- [ ] Verify email lookups use EmailIndex GSI (check DynamoDB metrics)
- [ ] Test authentication flow with valid JWT tokens
- [ ] Verify case-insensitive email matching works
- [ ] Check for any "email claim missing" errors
- [ ] Monitor response times (should be <50ms per requirement SC-003)

---

## Common Issues & Solutions

### Issue: Email claim missing in JWT token

**Symptom**: "Email claim missing in JWT token" errors

**Solution**:
- Verify Auth0 is configured to include email claim
- Check Auth0 rule/action that adds email to token
- Confirm frontend is requesting correct scopes

### Issue: Multiple users found for same email

**Symptom**: "Data integrity error: Multiple users found"

**Solution**:
- Critical data integrity issue
- Check production data for duplicate emails
- Run verification query before deployment (see data-model.md)

### Issue: Tests failing with DynamoDB connection errors

**Symptom**: "Cannot connect to DynamoDB Local"

**Solution**:
```bash
npm run test:db:setup  # Ensure DynamoDB Local is running
docker ps | grep dynamodb  # Verify container is running
```

### Issue: Email normalization inconsistencies

**Symptom**: Same email creates multiple users with different cases

**Solution**:
- Ensure `normalizeEmail()` is called in ALL code paths
- Verify `create()`, `findByEmail()`, and `ensureUser()` all normalize
- Check JWT processing normalizes email before setting context

---

## Performance Considerations

**Expected Performance**:
- Email lookups via GSI: 1-5ms (comparable to primary key lookups)
- GSI overhead per request: ~0.5 RCU (negligible cost)
- Storage overhead: ~100 bytes per user (minimal)

**Cost Impact**:
- Estimated $0.075/month for 10K users + 100K lookups/month
- See [research.md](./research.md#2-dynamodb-gsi-performance-and-cost) for detailed cost analysis

---

## Related Documentation

- [spec.md](./spec.md) - Feature specification with user stories and requirements
- [plan.md](./plan.md) - Implementation plan with technical context
- [research.md](./research.md) - Detailed research findings
- [data-model.md](./data-model.md) - Entity definitions and schema changes
- [contracts/](./contracts/) - API contract documentation

---

## Support & Questions

For questions or issues during implementation:
1. Review [research.md](./research.md) for detailed technical decisions
2. Check [data-model.md](./data-model.md) for entity specifications
3. See [contracts/typescript-interfaces.md](./contracts/typescript-interfaces.md) for interface changes
