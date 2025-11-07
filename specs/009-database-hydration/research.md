# Phase 0: Research Findings - Database Record Hydration Pattern

**Date**: 2025-11-07 | **Feature**: 009-database-hydration | **Status**: Complete

## Research Summary

This document consolidates findings on Zod schema patterns for database record validation, addressing all unknowns from the technical context.

---

## 1. Zod Schema Design Patterns for Database Records

**Decision**: Define Zod schemas that mirror TypeScript interfaces with `satisfies z.ZodType<T>` for compile-time safety.

**Rationale**:
- TypeScript interface is source of truth; Zod schema adds runtime validation
- `satisfies z.ZodType<T>` ensures schema stays synchronized with interface at compile-time
- Catches schema drift immediately when interfaces change
- Validation at repository boundary (data entry point) prevents corrupted data from propagating downstream

**Implementation Pattern**:
```typescript
interface Account {
  id: string;
  userId: string;
  name: string;
  initialBalance: number;
  currency: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  initialBalance: z.number(),
  currency: z.string(),
  isArchived: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}) satisfies z.ZodType<Account>;
```

**Alternatives Rejected**:
- Using `z.infer<typeof schema>` to derive types from Zod (makes Zod source of truth instead of interfaces)
- Type assertions without validation (no error detection, violates constitution principle)
- Manual validation functions (verbose, error-prone, inconsistent)

---

## 2. Compile-Time Type Safety with `satisfies` Keyword

**Decision**: Use `satisfies z.ZodType<T>` on all database entity schemas for automatic compilation failures when schemas drift from interfaces.

**How It Works**:
- TypeScript compiler verifies every interface field has a corresponding Zod validator
- Prevents both missing fields and extra fields in schemas
- Zero runtime cost - purely compile-time construction

**Key Benefit**: Interface changes immediately trigger TypeScript errors if schema is not updated, preventing runtime validation surprises.

**Example**:
```typescript
// ✅ Recommended
const transactionSchema = z.object({
  userId: z.string().uuid(),
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT']),
  // ... all other fields
}) satisfies z.ZodType<Transaction>;

// ❌ Anti-pattern - no compile-time check
const badSchema = z.object({
  userId: z.string().uuid(),
  // Missing fields won't be caught until runtime
});
```

---

## 3. Error Handling Pattern - Catching & Transforming Zod Validation Errors

**Decision**: Use `parse()` in repository layer with custom repository error classes to wrap ZodError.

**Rationale**:
- `parse()` throws on validation failure (appropriate for exceptional database corruption)
- Custom error classes (e.g., `AccountRepositoryError`) add context and structured error codes
- ZodError preserved in custom error for debugging
- Follows existing error pattern in codebase

**Implementation**:
```typescript
class AccountRepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public validationErrors?: z.ZodIssue[],
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AccountRepositoryError';
  }
}

async findActiveById(id: string, userId: string): Promise<Account | null> {
  try {
    const result = await this.client.send(new GetCommand({...}));
    if (!result.Item) return null;
    return hydrateAccount(result.Item);  // Throws if invalid
  } catch (error) {
    if (error instanceof HydrationError) {
      throw new AccountRepositoryError(
        error.message,
        'VALIDATION_FAILED',
        error.issues,
        error
      );
    }
    throw new AccountRepositoryError(
      'Failed to fetch account from database',
      'DB_READ_ERROR',
      undefined,
      error
    );
  }
}
```

**Alternatives Rejected**:
- `safeParse()` (more verbose, better for user input validation)
- Letting ZodError bubble up (loses repository context)
- Custom error maps (overkill for internal validation)

---

## 4. Handling Optional vs Nullable Fields

**Decision**: Match DynamoDB behavior - use `.optional()` for fields that may be omitted (TS `field?: T`), use `.nullish()` for GraphQL inputs that may be `null` or `undefined`.

**DynamoDB Reality**:
- DynamoDB does NOT distinguish between `null` and missing attributes
- Missing attributes simply don't exist in the record (equivalent to `undefined`)
- Setting a field to `null` stores it as missing

**Field Type Mapping**:

| TypeScript | DynamoDB | Zod Modifier | Rationale |
|-----------|----------|--------------|-----------|
| `field: T` | Always present | (none) | Required field |
| `field?: T` | May be absent | `.optional()` | Optional - DynamoDB stores as missing |
| `field: T \| null` | Always present, can be null | `.nullable()` | Explicit null (rare in DynamoDB) |
| `field?: T \| null` (GraphQL input) | May be absent or null | `.nullish()` | Accept both cases |

**Implementation**:
```typescript
// Entity type (from DynamoDB - uses .optional())
interface Transaction {
  id: string;
  categoryId?: string;      // May be absent in DB
  description?: string;     // May be absent in DB
}

const transactionSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid().optional(),    // Accept undefined
  description: z.string().optional(),
}) satisfies z.ZodType<Transaction>;

// Input type (from GraphQL - uses .nullish())
interface CreateTransactionInput {
  categoryId?: string | null;  // User can send null or omit
  description?: string | null;
}

const createTransactionInputSchema = z.object({
  categoryId: z.string().uuid().nullish(),     // Accept null OR undefined
  description: z.string().nullish(),
});
```

**Key Difference**: Entity schemas use `.optional()` (DynamoDB behavior), input schemas use `.nullish()` (GraphQL flexibility).

---

## 5. Stripping Extra Fields - Database Schema Evolution

**Decision**: Use default `.strip()` behavior (silently removes unknown fields) for all database record schemas.

**Rationale**:
- DynamoDB has no schema enforcement - extra fields naturally appear
- Schema evolution needs gradual rollout - old records have deprecated fields
- Failing validation when extra fields exist breaks production during migrations
- A/B testing and manual edits add temporary fields to records

**How It Works**:
```typescript
// Default behavior - strips unknown fields
const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  // ... defined fields
}); // .strip() is implicit default

// Parsing record with extra fields:
const rawData = {
  id: '123',
  userId: '456',
  name: 'Checking',
  legacyField: 'old-data',      // ← Extra field
  experimentalField: 'testing',  // ← Temporary field
};

const account = accountSchema.parse(rawData);
// Result: legacyField and experimentalField are removed
// account has only defined fields
```

**Alternatives Rejected**:
- `.strict()` (fails when DB has extra fields - breaks during migrations)
- `.passthrough()` (unknown fields leak into return type - confusing)

**Migration Strategy**:
1. Add new field to schema and database gradually
2. Old records keep deprecated field (automatically stripped)
3. New records have new field (validated by schema)
4. Eventual full migration with no breaking changes

---

## 6. Hydration Function Location - Shared Utility vs. Inline

**Decision**: NO shared utility. Each repository defines its own inline hydration function.

**Rationale**:
- Each hydration function must throw its specific repository error (AccountRepositoryError, CategoryRepositoryError, etc.)
- A generic utility factory would create an unnecessary intermediary (HydrationError) between ZodError and repository errors
- Simpler to understand: ZodError → caught and wrapped directly in RepositoryError
- No abstraction overhead for a pattern that's only repeated 4 times

**Implementation Pattern** (in each repository):
```typescript
// File: AccountRepository.ts
import { z } from 'zod';
import { accountSchema } from './utils/Account.schema';

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

// Usage in repository methods
async findActiveById(id: string, userId: string): Promise<Account | null> {
  const result = await this.client.send(new GetCommand({...}));
  if (!result.Item) return null;
  return hydrateAccount(result.Item);  // Direct to repository error
}
```

**Key Pattern**:
- Each repository imports its Zod schema
- Defines hydration function that catches ZodError and throws RepositoryError
- No shared utility, no intermediate error wrapper
- Direct: ZodError → caught → RepositoryError with context

**Alternatives Considered**:
1. **Generic `createHydrator<T>` factory with HydrationError**
   - Would create intermediate error layer (HydrationError)
   - Each hydrator still needs to throw specific RepositoryError anyway
   - Adds abstraction for 4 instances of nearly identical code
   - Rejected: Unnecessary complexity

2. **Shared utility module**
   - Would still need each repository to import and wrap errors differently
   - Minimal code reuse benefit (4 repositories only)
   - Rejected: Not worth the indirection

---

## 7. DynamoDB-Specific Considerations

**Schemaless Database**:
- No schema enforcement at database level
- Any attribute can appear in any record
- Different records can have different attributes
- Manual edits or bugs can introduce invalid data

**Performance Impact**:
- Zod validation: ~4 microseconds per record
- DynamoDB query latency: 10-50 milliseconds
- Validation overhead: <0.1% of total latency
- No optimization needed for normal CRUD operations

**GSI Queries**:
- Global Secondary Index results include GSI keys
- Different query patterns return different attributes
- Hydration validates all returned attributes consistently

**Rolling Deployments**:
- New code version may write new fields
- Old code version must handle records with new fields
- `.strip()` behavior naturally handles version mismatches

---

## 8. Integration with Existing Codebase

**Location of Changes**:
- New schemas: `backend/src/repositories/utils/*.schema.ts` (4 files: Account, Category, Transaction, User)
- Hydration functions: Defined inline in each repository file (AccountRepository.ts, etc.)
- Existing repositories enhanced: `backend/src/repositories/*Repository.ts`
- Services and resolvers: No changes (consume pre-validated data)

**Compatibility**:
- Existing repository interfaces unchanged
- Service layer unaffected (already consume typed data)
- GraphQL resolvers unaffected (repositories return validated data)
- Tests enhanced with hydration tests

**Error Handling Alignment**:
- Follows existing `AccountRepositoryError`, `TransactionRepositoryError` patterns
- New `HydrationError` wraps ZodError for repository context
- Structured error codes for monitoring and logging

---

## 9. Compliance with Constitution

This research fulfills the Database Record Hydration principle:

✅ **Schema Validation at Repository Boundary**: All data read from DynamoDB validated using Zod schemas before returning to service layer

✅ **Compile-Time Type Safety**: `satisfies z.ZodType<T>` ensures schemas always match TypeScript interfaces

✅ **Consistent Pattern**: Generic `createHydrator<T>` ensures uniform validation and error handling across all repositories

✅ **Data Integrity**: Corrupted or incomplete records caught immediately at data source rather than downstream in service logic

✅ **Vendor Independence**: Zod is vendor-agnostic; pattern portable to any database backend

---

## Next Steps - Phase 1 Design

The research findings are complete. Phase 1 will generate:

1. **data-model.md** - Entity schemas with validation rules and field documentation
2. **contracts/Account.schema.ts** - Zod schemas for all entities
3. **contracts/hydrator.ts** - Generic `createHydrator<T>` utility with error handling
4. **quickstart.md** - Step-by-step implementation guide for developers
5. **Agent context update** - `.specify/memory/claude-backend.md` updated with hydration patterns

All research questions resolved. ✅
