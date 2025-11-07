# Phase 1: Data Model - Database Record Hydration Pattern

**Date**: 2025-11-07 | **Feature**: 009-database-hydration | **Status**: Design

## Entity Schemas with Validation Rules

This document defines Zod validation schemas for all entities in the database. Each schema validates data at the repository boundary before it reaches service or resolver layers.

---

## 1. User Entity

**TypeScript Interface**:
```typescript
export interface User {
  id: string;           // UUID, primary key
  auth0Id: string;      // Auth0 user identifier from JWT
  createdAt: string;    // ISO 8601 datetime string
  updatedAt: string;    // ISO 8601 datetime string
}
```

**Validation Rules**:
- `id`: UUID format (v4), required, primary key
- `auth0Id`: Non-empty string, required, unique
- `createdAt`: ISO 8601 datetime string, required
- `updatedAt`: ISO 8601 datetime string, required

**Zod Schema**:
```typescript
const userSchema = z.object({
  id: z.string().uuid(),
  auth0Id: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<User>;
```

**Schema File** (File: `backend/src/repositories/utils/User.schema.ts`):
Exports `userSchema` object with `satisfies z.ZodType<User>`

**Hydration** (defined inline in UserRepository):
Each repository defines its own `hydrate<Entity>` function that catches ZodError and throws repository-specific error

**Database Behavior**:
- No soft-deletion for User (only system-wide deletion)
- Created once during first GraphQL request
- Updates only auth0Id lookup on login

---

## 2. Account Entity

**TypeScript Interface**:
```typescript
export interface Account {
  id: string;              // UUID, primary key
  userId: string;          // UUID, partition key (FK to User)
  name: string;            // Account name (e.g., "Checking", "Savings")
  initialBalance: number;  // Starting balance in account currency
  currency: string;        // ISO 4217 currency code (e.g., "USD", "EUR")
  isArchived: boolean;     // Soft-deletion flag
  createdAt: string;       // ISO 8601 datetime string
  updatedAt: string;       // ISO 8601 datetime string
}
```

**Validation Rules**:
- `id`: UUID format, required, primary key
- `userId`: UUID format, required, partition key
- `name`: Non-empty string, required, max 255 characters
- `initialBalance`: Number (positive, negative, or zero), required
- `currency`: 3-character currency code (e.g., "USD"), required
- `isArchived`: Boolean, required (never null)
- `createdAt`: ISO 8601 datetime string, required
- `updatedAt`: ISO 8601 datetime string, required

**Zod Schema**:
```typescript
const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  initialBalance: z.number(),
  currency: z.string().length(3).toUpperCase(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Account>;
```

**Schema File** (File: `backend/src/repositories/utils/Account.schema.ts`):
Exports `accountSchema` object with `satisfies z.ZodType<Account>`

**Hydration** (defined inline in AccountRepository):
Each repository defines its own `hydrate<Entity>` function that catches ZodError and throws repository-specific error

**Database Behavior**:
- Soft-deleted via `isArchived` flag
- No hard deletion - historical data preserved
- Currency enforced per account (prevents mixed-currency transfers)
- Balance calculated from transactions at query time

---

## 3. Category Entity

**TypeScript Interface**:
```typescript
export interface Category {
  id: string;              // UUID, primary key
  userId: string;          // UUID, partition key (FK to User)
  name: string;            // Category name (e.g., "Groceries", "Transport")
  type: CategoryType;      // 'INCOME' | 'EXPENSE'
  description?: string;    // Optional description
  isArchived: boolean;     // Soft-deletion flag
  createdAt: string;       // ISO 8601 datetime string
  updatedAt: string;       // ISO 8601 datetime string
}

export type CategoryType = 'INCOME' | 'EXPENSE';
```

**Validation Rules**:
- `id`: UUID format, required, primary key
- `userId`: UUID format, required, partition key
- `name`: Non-empty string, required, max 255 characters
- `type`: One of 'INCOME' or 'EXPENSE', required
- `description`: Optional string, max 1000 characters
- `isArchived`: Boolean, required (never null)
- `createdAt`: ISO 8601 datetime string, required
- `updatedAt`: ISO 8601 datetime string, required

**Zod Schema**:
```typescript
const categorySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().max(1000).optional(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Category>;
```

**Schema File** (File: `backend/src/repositories/utils/Category.schema.ts`):
Exports `categorySchema` object with `satisfies z.ZodType<Category>`

**Hydration** (defined inline in CategoryRepository):
Each repository defines its own `hydrate<Entity>` function that catches ZodError and throws repository-specific error

**Database Behavior**:
- Soft-deleted via `isArchived` flag
- Type is immutable (prevent accidental income/expense category switches)
- Description is optional (many categories have no description)

---

## 4. Transaction Entity

**TypeScript Interface**:
```typescript
export interface Transaction {
  id: string;              // UUID, primary key
  userId: string;          // UUID, partition key (FK to User)
  accountId: string;       // UUID, (FK to Account)
  amount: number;          // Transaction amount (positive value)
  type: TransactionType;   // 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  currency: string;        // ISO 4217 currency code
  date: string;            // YYYY-MM-DD format date
  description?: string;    // Optional description
  categoryId?: string;     // UUID, optional (FK to Category)
  transferId?: string;     // UUID, optional (links paired transfer transactions)
  isArchived: boolean;     // Soft-deletion flag
  createdAt: string;       // ISO 8601 datetime string
  updatedAt: string;       // ISO 8601 datetime string
}

export type TransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT';
```

**Validation Rules**:
- `id`: UUID format, required, primary key
- `userId`: UUID format, required, partition key
- `accountId`: UUID format, required
- `amount`: Positive number, required
- `type`: One of 'INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT', required
- `currency`: 3-character currency code, required
- `date`: YYYY-MM-DD format, required
- `description`: Optional string, max 500 characters
- `categoryId`: Optional UUID (only for INCOME/EXPENSE, not transfers)
- `transferId`: Optional UUID (only for TRANSFER_IN/TRANSFER_OUT pairs)
- `isArchived`: Boolean, required (never null)
- `createdAt`: ISO 8601 datetime string, required
- `updatedAt`: ISO 8601 datetime string, required

**Zod Schema**:
```typescript
const transactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT']),
  currency: z.string().length(3).toUpperCase(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  transferId: z.string().uuid().optional(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Transaction>;
```

**Schema File** (File: `backend/src/repositories/utils/Transaction.schema.ts`):
Exports `transactionSchema` object with `satisfies z.ZodType<Transaction>`

**Hydration** (defined inline in TransactionRepository):
Each repository defines its own `hydrate<Entity>` function that catches ZodError and throws repository-specific error

**Database Behavior**:
- Soft-deleted via `isArchived` flag
- Amount always positive (sign determined by type)
- Currency matches account currency
- Category required for INCOME/EXPENSE, omitted for transfers
- TransferId links paired TRANSFER_IN and TRANSFER_OUT transactions
- Date stored as string YYYY-MM-DD for DynamoDB compatibility

---

## Validation Layers

### Repository Boundary (Hydration)
- **Where**: Repository read methods
- **What**: Validate raw DynamoDB data against Zod schemas
- **Why**: Catch database corruption/schema drift immediately
- **How**: Hydration function catches ZodError and throws repository-specific error

### Service Layer
- **Where**: Service methods (TransactionService, AccountService, etc.)
- **What**: Business logic validation (currency matching, category type consistency, etc.)
- **Why**: Enforce domain rules and cross-entity constraints
- **How**: Service methods throw BusinessError for validation failures

### GraphQL Resolver Input
- **Where**: GraphQL resolver input parameter validation
- **What**: Zod schema validation of user-provided input
- **Why**: Catch user input errors before service layer
- **How**: Use `parse()` and catch ZodError to return GraphQL error

---

## Error Handling Strategy

### Hydration Error Flow (Repository Boundary)
```
Database Query
      ↓
Zod Validation via schema.parse()
      ↓
ZodError caught → Repository throws AccountRepositoryError
      ↓
Service Layer receives validated data or handles error
```

**Example**:
```typescript
function hydrateAccount(data: unknown): Account {
  try {
    return accountSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AccountRepositoryError(
        `Invalid Account record from database: ${error.issues[0].message}`,
        'VALIDATION_FAILED',
        error.issues,
        error
      );
    }
    throw error;
  }
}
```

### Field-Level Validation Details
Zod provides detailed validation information preserved in the error:
- **code**: Type of validation failure (invalid_type, invalid_literal, too_small, etc.)
- **path**: Array showing field location (e.g., ['initialBalance'])
- **message**: Human-readable description
- **expected/received**: For type errors, shows what was expected vs. received

All this information is captured in the ZodIssue array passed to AccountRepositoryError.

---

## Type Safety Guarantees

### Compile-Time Checking
```typescript
// ✅ Schema matches interface
interface Account { id: string; name: string; }
const schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
}) satisfies z.ZodType<Account>;

// ❌ Schema missing field
interface Account { id: string; name: string; currency: string; }
const schema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // Missing currency - TypeScript error!
}) satisfies z.ZodType<Account>;
```

### Runtime Guarantees
```typescript
const account = hydrateAccount(rawData);
// account is guaranteed to have all required fields
// account.id: string (UUID)
// account.name: string (min 1, max 255)
// account is NOT Account | null - it IS Account
```

---

## Database Schema Evolution

### Adding Optional Field
```typescript
// Step 1: Add to TypeScript interface
interface Account {
  notes?: string;  // New field
}

// Step 2: Add to Zod schema
const accountSchema = z.object({
  // ... existing fields
  notes: z.string().optional(),  // New validation
}) satisfies z.ZodType<Account>;

// Old records: missing notes field → validated as undefined
// New records: notes provided → validated as string
// No breaking changes
```

### Removing Field
```typescript
// Step 1: Remove from TypeScript interface
interface Account {
  // legacyField removed
}

// Step 2: Remove from Zod schema
const accountSchema = z.object({
  // legacyField not in schema
  // ... other fields
}) satisfies z.ZodType<Account>;

// Old records: have legacyField → stripped during validation
// New records: don't have legacyField → validated normally
// No breaking changes
```

---

## Next Steps

Phase 1 design continues with:

1. **contracts/SPECIFICATION.md** - Design specification for implementation
2. **quickstart.md** - Step-by-step implementation guide for developers

Deliverables:
- Entity schemas with validation rules fully documented
- Error handling patterns clarified
- Implementation approach simplified (no shared utility, inline hydration in each repository)
- Design ready for Phase 2 implementation tasks ✅
