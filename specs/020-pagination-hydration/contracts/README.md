# API Contracts

**Feature**: 020-pagination-hydration
**Date**: 2025-12-06

## No External API Changes

This feature modifies an internal backend utility function (`paginateQuery`) and does not change any external API contracts.

### Why No API Contract Changes

**Internal-Only Modification**:
- The pagination utility is infrastructure code used by repositories
- Repositories call the pagination utility, not external clients
- GraphQL schema remains unchanged
- REST endpoints (if any) remain unchanged
- Frontend interfaces remain unchanged

**Repository Layer Change**:
- Changes occur at the repository boundary (internal to backend)
- Validation happens before data reaches service layer
- Service layer and GraphQL resolvers see no API changes

### Internal Contract Change

**Function**: `paginateQuery` in `backend/src/repositories/utils/pagination.ts`

**Before**:
```typescript
export async function paginateQuery<T>({
  client,
  params,
  options = {},
  accumulatedItems = [],
}: {
  client: DynamoDBDocumentClient;
  params: QueryParams;
  options?: PaginationOptions;
  accumulatedItems?: T[];
}): Promise<PaginationResult<T>>
```

**After**:
```typescript
export async function paginateQuery<T>({
  client,
  params,
  options = {},
  schema,  // NEW: Required parameter
  accumulatedItems = [],
}: {
  client: DynamoDBDocumentClient;
  params: QueryParams;
  options?: PaginationOptions;
  schema: z.ZodSchema<T>;  // NEW: Validation schema
  accumulatedItems?: T[];
}): Promise<PaginationResult<T>>
```

**Changes**:
- Added required `schema` parameter of type `z.ZodSchema<T>`
- Return type unchanged
- Behavior change: Now validates items before returning them

**Consumers**:
- AccountRepository
- CategoryRepository
- TransactionRepository
- Any other repositories using pagination

**Migration Required**:
- All repository methods calling `paginateQuery` must add `schema` parameter
- TypeScript compilation enforces this (missing parameter = compile error)

## Error Contract Changes

### New Error Type

**Error**: `ZodError` (from Zod library)

**When Thrown**: Database record fails validation

**Error Structure**:
```typescript
{
  issues: [
    {
      code: "invalid_type" | "invalid_literal" | ...,
      path: string[],  // e.g., ["name"]
      message: string,  // e.g., "Required"
      expected?: string,  // e.g., "string"
      received?: string   // e.g., "undefined"
    }
  ]
}
```

**Propagation**:
- Thrown by pagination utility
- Propagates through repository → service → resolver
- GraphQL resolver catches and returns error to client

**Client Impact**:
- GraphQL clients may see validation errors if corrupted data exists
- Error messages indicate data corruption (not client error)
- Expected to be rare (only when database contains invalid data)

## Summary

No external API contract changes. Internal pagination utility signature changed to require validation schema parameter. All repositories using pagination must be updated (atomic migration). Potential for new error type (`ZodError`) if database contains corrupted data.
