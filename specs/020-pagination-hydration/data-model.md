# Data Model: Database Record Hydration in Pagination Utility

**Date**: 2025-12-06
**Feature**: 020-pagination-hydration
**Phase**: Phase 1 - Design

## Overview

This feature modifies the pagination utility infrastructure to enforce database record validation. The data model focuses on the validation schema mechanism and its integration with the pagination utility, rather than entity schemas (which remain repository-specific).

## Core Entities

### PaginationOptions

**Purpose**: Configuration for pagination behavior
**Location**: `backend/src/repositories/utils/pagination.ts`

**Fields**:
- `pageSize?: number` - Number of items per page (undefined = fetch all)

**Relationships**: Passed to pagination utility

**Validation**: None (internal configuration object)

**Changes**: None (existing interface)

### PaginationResult<T>

**Purpose**: Return type for paginated queries
**Location**: `backend/src/repositories/utils/pagination.ts`

**Fields**:
- `items: T[]` - Validated items of generic type T
- `hasNextPage: boolean` - Whether more pages exist

**Relationships**: Returned by pagination utility

**Validation**: Items validated via schema parameter

**Changes**: None to interface (validation behavior changes internally)

### QueryParams

**Purpose**: DynamoDB query parameters
**Location**: `backend/src/repositories/utils/pagination.ts`

**Type**: Alias for `QueryCommandInput` from @aws-sdk/lib-dynamodb

**Changes**: None (existing type)

## New Validation Mechanism

### Schema Parameter (New)

**Purpose**: Enable runtime validation of database records at repository boundary

**Type Signature**:
```typescript
schema: z.ZodSchema<T>
```

**Constraints**:
- MUST be compatible with generic type T
- MUST validate all required fields of type T
- MUST be provided by calling repository (no defaults)

**Validation Rules**:
- Enforced at compile time via TypeScript generic constraint
- Applied at runtime via Zod `.parse()`
- Fail-fast: First validation failure throws error

**Error Behavior**:
- Throws `ZodError` on validation failure
- Error contains:
  - Field paths (e.g., `["name"]`)
  - Expected types (e.g., `"string"`)
  - Received values (e.g., `undefined`)
  - Validation messages (e.g., `"Required"`)
- Does NOT include full record data (privacy)
- Does NOT include record position (per clarification)

## Repository Schema Definitions

### Pattern

Each repository using pagination MUST define a Zod schema for its entity type:

```typescript
import { z } from 'zod';

class ExampleRepository {
  // Define schema matching entity type
  private readonly entitySchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    name: z.string().min(1),
    createdAt: z.string().datetime(),
    // ... all entity fields
  });

  async findByUserId(userId: string): Promise<Entity[]> {
    const result = await paginateQuery<Entity>({
      client: this.dynamoClient,
      params: { /* ... */ },
      schema: this.entitySchema,  // Required parameter
    });
    return result.items;
  }
}
```

### Repository-Specific Schemas

**AccountRepository**:
- Schema: Account entity fields
- Fields: id, userId, name, currency, balance, etc.
- Existing schema: May already exist for GraphQL validation

**CategoryRepository**:
- Schema: Category entity fields
- Fields: id, userId, name, type, isArchived, etc.
- Existing schema: May already exist for GraphQL validation

**TransactionRepository**:
- Schema: Transaction entity fields
- Fields: id, userId, accountId, categoryId, amount, date, description, etc.
- Existing schema: May already exist for GraphQL validation

**Note**: Actual schema definitions are repository-specific and out of scope for this feature. Repositories will create/reuse schemas as part of migration.

## Validation Flow

### Data Flow Through Pagination

```
┌─────────────────────────────────────────────────────────────┐
│ Repository calls paginateQuery with schema parameter        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Pagination utility queries DynamoDB                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ DynamoDB returns Items array (unknown type)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ For each item: schema.parse(item)                           │
│   ✓ Valid → typed item added to results                     │
│   ✗ Invalid → ZodError thrown (fail-fast)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Recursive pagination continues if needed                    │
│   (validation occurs on each batch)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Return PaginationResult<T> with validated items             │
└─────────────────────────────────────────────────────────────┘
```

### Error Propagation

```
┌─────────────────────────────────────────────────────────────┐
│ schema.parse(item) fails validation                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ throws ZodError
┌─────────────────────────────────────────────────────────────┐
│ Pagination utility does NOT catch                           │
│   (error propagates to caller)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ propagates
┌─────────────────────────────────────────────────────────────┐
│ Repository method throws to service layer                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ propagates
┌─────────────────────────────────────────────────────────────┐
│ Service layer throws to GraphQL resolver                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ propagates
┌─────────────────────────────────────────────────────────────┐
│ GraphQL resolver returns error to client                    │
└─────────────────────────────────────────────────────────────┘
```

## Type Safety Guarantees

### Compile-Time Checks

1. **Schema-Type Compatibility**:
   ```typescript
   schema: z.ZodSchema<T>
   ```
   - TypeScript ensures schema validates type T
   - Mismatched schema/type causes compilation error

2. **Required Parameter**:
   ```typescript
   schema: z.ZodSchema<T>  // NOT optional
   ```
   - Repositories MUST provide schema
   - Missing schema causes compilation error

3. **Return Type Safety**:
   ```typescript
   Promise<PaginationResult<T>>
   ```
   - Return type guaranteed to contain items of type T
   - Validated items maintain type safety through call chain

### Runtime Checks

1. **Record Validation**:
   - Each database record validated via `schema.parse()`
   - Invalid records rejected immediately (fail-fast)

2. **Schema Correctness**:
   - Repository responsible for providing correct schema
   - Zod validates schema matches actual data structure

## Schema Location Strategy

### Option 1: Co-located with Repository (Recommended)

```typescript
// backend/src/repositories/AccountRepository.ts
import { z } from 'zod';

const accountSchema = z.object({
  // ... fields
});

export class AccountRepository {
  private schema = accountSchema;

  async findByUserId(userId: string): Promise<Account[]> {
    return paginateQuery<Account>({
      // ...
      schema: this.schema,
    });
  }
}
```

**Pros**:
- Schema near usage
- Private to repository
- Easy to maintain

**Cons**:
- Schema may be duplicated if used elsewhere

### Option 2: Shared Schema Module

```typescript
// backend/src/models/schemas/account.schema.ts
import { z } from 'zod';

export const accountSchema = z.object({
  // ... fields
});

// backend/src/repositories/AccountRepository.ts
import { accountSchema } from '../models/schemas/account.schema';
```

**Pros**:
- Reusable across repositories and GraphQL validation
- Single source of truth

**Cons**:
- Additional file structure
- May not be necessary if schemas already exist

**Decision**: Use existing schema location pattern in codebase. If schemas exist for GraphQL validation, reuse them. If not, co-locate with repositories.

## Migration Impact

### Breaking Changes

**Pagination Utility Signature**:
- **Before**: `schema` parameter does not exist
- **After**: `schema` parameter required
- **Impact**: All repositories using `paginateQuery` MUST be updated

### Non-Breaking Changes

- Pagination behavior unchanged (still supports pageSize, recursion, etc.)
- Return type unchanged (`PaginationResult<T>`)
- DynamoDB query logic unchanged

### Backward Compatibility

**None** - Atomic migration required per clarification. All repositories updated simultaneously before deployment.

## Validation Schema Requirements

For each entity using pagination:

1. **Required**: Schema MUST validate all entity fields
2. **Required**: Schema MUST use Zod validation library
3. **Required**: Schema MUST be compatible with entity TypeScript type
4. **Optional**: Schema MAY reuse existing GraphQL validation schemas
5. **Optional**: Schema MAY include additional runtime validations beyond type checking

## Summary

The data model introduces a validation mechanism via Zod schemas passed as parameters to the pagination utility. This enforces the Database Record Hydration constitutional principle at the repository boundary with fail-fast validation and clear error messages. Type safety is maintained through TypeScript generic constraints and runtime validation.
