# Research: Database Record Hydration in Pagination Utility

**Date**: 2025-12-06
**Feature**: 020-pagination-hydration
**Phase**: Phase 0 - Research & Technical Decisions

## Codebase Analysis

### Existing Infrastructure (ALREADY IN PLACE)

**Schemas**: `backend/src/repositories/utils/*.schema.ts`
- `Account.schema.ts` - exports `accountSchema`
- `Category.schema.ts` - exports `categorySchema`
- `Transaction.schema.ts` - exports `transactionSchema`
- `User.schema.ts` - exports `userSchema`

**Hydrate Function**: `backend/src/repositories/utils/hydrate.ts`
```typescript
export function hydrate<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
```

**Current Repository Usage**:
- ✅ `GetCommand` results: `hydrate(accountSchema, result.Item)` (AccountRepository:144)
- ✅ `BatchGetCommand` results: `hydrate(accountSchema, item)` (AccountRepository:184-186)
- ✅ `UpdateCommand` results: `hydrate(accountSchema, result.Attributes)` (AccountRepository:289)
- ❌ **`paginateQuery` results: NOT HYDRATED** (AccountRepository:94-106) **← THE VIOLATION**

### Pagination Usage Analysis

**Total paginateQuery calls found**: 9
- AccountRepository: 1 call
- CategoryRepository: 2 calls
- TransactionRepository: 6 calls

All calls return unvalidated data directly.

## Research Questions

### 1. How to integrate validation into the pagination utility?

**Decision**: Use the EXISTING `hydrate()` function.

**Rationale**:
- Codebase already has `hydrate()` function for validation
- All other repository methods already use `hydrate()`
- Schemas already exist for all entities
- Pagination is the ONLY place not using hydrate
- Consistency with established codebase patterns

**Implementation**:
```typescript
// Add to pagination.ts imports
import { z } from 'zod';
import { hydrate } from './hydrate';

// Change line 50 from:
const newItems = (result.Items || []) as T[];

// To:
const newItems = (result.Items || []).map(item => hydrate(schema, item));
```

### 2. What signature should the schema parameter have?

**Decision**: `schema: z.ZodType<T>` - matches existing `hydrate()` signature.

**Rationale**:
- Maintains consistency with `hydrate()` function signature
- `z.ZodType<T>` is broader than `z.ZodSchema<T>` (works with all Zod types)
- Existing schemas use `.satisfies z.ZodType<Entity>` pattern

**Example from existing schema**:
```typescript
export const accountSchema = z.object({
  id: z.uuid(),
  // ...
}) satisfies z.ZodType<Account>;
```

### 3. Do schemas need to be created?

**Decision**: NO - schemas already exist and are already imported by repositories.

**Finding**:
- All repositories already import their schemas: `import { accountSchema } from './utils/Account.schema'`
- Schemas already used for single-item and batch hydration
- No new schemas needed

### 4. How to handle validation errors?

**Decision**: No special handling - let Zod errors propagate (via `hydrate()`).

**Rationale**:
- `hydrate()` calls `schema.parse()` which throws `ZodError` on failure
- Existing repository methods already let these errors propagate
- Consistent with current error handling pattern
- Meets fail-fast requirement

### 5. How to ensure all repositories are updated?

**Decision**: TypeScript compilation enforces it.

**Rationale**:
- Adding required `schema` parameter causes compilation errors for missing parameter
- 9 calls to `paginateQuery` must all be updated
- TypeScript ensures no calls are missed

**Migration Checklist**:
```bash
# Find all usage (already done)
grep -r "paginateQuery" backend/src/repositories/*.ts | grep -v test

# Results:
- AccountRepository.ts: 1 call → add schema: accountSchema
- CategoryRepository.ts: 2 calls → add schema: categorySchema
- TransactionRepository.ts: 6 calls → add schema: transactionSchema
```

### 6. What about error messages?

**Decision**: Use Zod's default error format (unchanged from current single-item pattern).

**Rationale**:
- `hydrate()` already uses `schema.parse()` which provides good errors
- Single-item reads already use this pattern - keep consistency
- Zod errors include:
  - Field paths (e.g., `["name"]`)
  - Expected types
  - Received values
  - Validation messages
- No custom error wrapping needed

## Technical Summary

**What Already Exists**:
1. ✅ `hydrate()` function in `backend/src/repositories/utils/hydrate.ts`
2. ✅ Schemas in `backend/src/repositories/utils/*.schema.ts`
3. ✅ Repositories import both `hydrate` and their schemas
4. ✅ Pattern of using `hydrate()` for all non-pagination reads

**What Needs to Change**:
1. ❌ Add `schema` parameter to `paginateQuery()`
2. ❌ Import `hydrate` in `pagination.ts`
3. ❌ Replace `as T[]` cast with `.map(item => hydrate(schema, item))`
4. ❌ Update 9 `paginateQuery()` calls in 3 repositories to pass schema
5. ❌ Add tests for pagination validation

**No New Code Needed**:
- No new schemas to create
- No new hydrate function to write
- No new error handling patterns
- Just integrate existing patterns into pagination

## Performance Considerations

**Overhead**: Same as existing single-item hydration
- Zod validation: ~1ms per record
- Already accepted in codebase (used everywhere else)
- Trade-off: data integrity > performance

## Summary

This is a straightforward integration of EXISTING codebase patterns. The `hydrate()` function and schemas already exist and are already used everywhere except pagination. Fix is simple: make pagination use the same pattern as the rest of the codebase.

**Estimated effort**: 30-45 minutes
- 10 min: Update pagination utility
- 15 min: Update 9 repository calls
- 15 min: Add tests
- 5 min: Verify compilation and run tests
