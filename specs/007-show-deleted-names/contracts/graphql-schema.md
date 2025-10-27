# GraphQL Schema Contract: Display Deleted Account/Category Names

**Phase**: 1 - Design
**Date**: 2025-10-27
**Status**: Schema specifications for implementation

## Overview

This document defines the minimal GraphQL schema changes required to support displaying deleted account and category names on transaction cards. Changes are additive and backward-compatible.

## Schema Additions

### 1. Account Type - Add isArchived Field

**File**: `backend/src/schema.graphql`

**Current**:
```graphql
type Account {
  id: ID!
  name: String!
  currency: String!
  initialBalance: Float!
  # isArchived is NOT exposed
}
```

**After**:
```graphql
type Account {
  id: ID!
  name: String!
  currency: String!
  initialBalance: Float!
  isArchived: Boolean!  # ← ADD THIS FIELD
}
```

**Type**: Boolean (non-nullable)
**Default**: false (new accounts are not archived)
**Source**: Existing DynamoDB field `isArchived`
**Frontend Usage**: Determine if strikethrough styling should apply

### 2. Category Type - Add isArchived Field

**File**: `backend/src/schema.graphql`

**Current**:
```graphql
type Category {
  id: ID!
  name: String!
  type: String!
  # isArchived is NOT exposed
}
```

**After**:
```graphql
type Category {
  id: ID!
  name: String!
  type: String!
  isArchived: Boolean!  # ← ADD THIS FIELD
}
```

**Type**: Boolean (non-nullable)
**Default**: false (new categories are not archived)
**Source**: Existing DynamoDB field `isArchived`
**Frontend Usage**: Determine if strikethrough styling should apply

### 3. Query Type - Add includeArchived Parameter to accounts

**File**: `backend/src/schema.graphql`

**Current**:
```graphql
type Query {
  accounts: [Account!]!
}
```

**After**:
```graphql
type Query {
  accounts(includeArchived: Boolean = false): [Account!]!
  #                 ↑ ADD THIS PARAMETER with default
}
```

**Parameter**: `includeArchived: Boolean = false`
**Type**: Boolean (nullable with default false)
**Default**: false
**Behavior**:
- When false: Return only accounts where `isArchived = false`
- When true: Return all accounts regardless of `isArchived` value
- Default ensures backward compatibility (current behavior unchanged)

**Implementation Responsibility**: AccountRepository.findByUserId()

### 4. Query Type - Add includeArchived Parameter to categories

**File**: `backend/src/schema.graphql`

**Current**:
```graphql
type Query {
  categories: [Category!]!
}
```

**After**:
```graphql
type Query {
  categories(includeArchived: Boolean = false): [Category!]!
  #               ↑ ADD THIS PARAMETER with default
}
```

**Parameter**: `includeArchived: Boolean = false`
**Type**: Boolean (nullable with default false)
**Default**: false
**Behavior**:
- When false: Return only categories where `isArchived = false`
- When true: Return all categories regardless of `isArchived` value
- Default ensures backward compatibility (current behavior unchanged)

**Implementation Responsibility**: CategoryRepository.findByUserId()

## Complete Schema Fragments

### Account Type (Minimal Addition)

```graphql
type Account {
  id: ID!
  name: String!
  currency: String!
  initialBalance: Float!
  isArchived: Boolean!  # ← NEW FIELD
}
```

### Category Type (Minimal Addition)

```graphql
type Category {
  id: ID!
  name: String!
  type: String!
  isArchived: Boolean!  # ← NEW FIELD
}
```

### Query Type (Parameter Additions)

```graphql
type Query {
  # ... other queries

  accounts(includeArchived: Boolean = false): [Account!]!  # ← UPDATED
  categories(includeArchived: Boolean = false): [Category!]!  # ← UPDATED

  # ... rest of queries
}
```

## Resolver Implementation Requirements

### Account Query Resolver

**File**: `backend/src/resolvers/account.ts`

**Changes**:
1. Extract `includeArchived` parameter from args
2. Pass to `repository.findByUserId(userId, { includeArchived })`

**Code Pattern**:
```typescript
// In accounts query resolver
const { includeArchived = false } = args;
const accounts = await ctx.accountRepository.findByUserId(
  ctx.auth.userId,
  { includeArchived }  // ← Pass parameter
);
return accounts;
```

### Category Query Resolver

**File**: `backend/src/resolvers/category.ts`

**Changes**:
1. Extract `includeArchived` parameter from args
2. Pass to `repository.findByUserId(userId, { includeArchived })`

**Code Pattern**:
```typescript
// In categories query resolver
const { includeArchived = false } = args;
const categories = await ctx.categoryRepository.findByUserId(
  ctx.auth.userId,
  { includeArchived }  // ← Pass parameter
);
return categories;
```

## Repository Implementation Requirements

### AccountRepository.findByUserId()

**File**: `backend/src/repositories/AccountRepository.ts`

**Current Signature**:
```typescript
async findByUserId(userId: string): Promise<Account[]>
```

**Updated Signature**:
```typescript
async findByUserId(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<Account[]>
```

**Implementation Logic**:
```typescript
async findByUserId(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<Account[]> {
  const includeArchived = options?.includeArchived ?? false;

  // DynamoDB query
  const params = {
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };

  // If not including archived, add filter
  if (!includeArchived) {
    params.FilterExpression = 'isArchived = :false';
    params.ExpressionAttributeValues[':false'] = false;
  }

  // Execute query and return results
  const result = await this.dynamoDb.query(params).promise();
  return result.Items.map(item => this.mapFromDb(item));
}
```

### CategoryRepository.findByUserId()

**File**: `backend/src/repositories/CategoryRepository.ts`

**Current Signature**:
```typescript
async findByUserId(userId: string): Promise<Category[]>
```

**Updated Signature**:
```typescript
async findByUserId(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<Category[]>
```

**Implementation Logic**: Same pattern as AccountRepository

## Frontend GraphQL Query Changes

### GET_ACCOUNTS Query

**File**: `frontend/src/graphql/accounts.ts`

**Current**:
```graphql
query GetAccounts {
  accounts {
    id
    name
    currency
  }
}
```

**Updated** (with variable support):
```graphql
query GetAccounts($includeArchived: Boolean = false) {
  accounts(includeArchived: $includeArchived) {
    id
    name
    currency
    isArchived  # ← NEWLY REQUESTED
  }
}
```

### GET_CATEGORIES Query

**File**: `frontend/src/graphql/categories.ts`

**Current**:
```graphql
query GetCategories {
  categories {
    id
    name
    type
  }
}
```

**Updated** (with variable support):
```graphql
query GetCategories($includeArchived: Boolean = false) {
  categories(includeArchived: $includeArchived) {
    id
    name
    type
    isArchived  # ← NEWLY REQUESTED
  }
}
```

## Backward Compatibility

### Breaking Changes
**None** - All changes are additive and include defaults

### Deprecations
**None** - Existing queries continue to work unchanged

### Migration Path
**None** - No data migration required

### Default Behavior
- Existing code that doesn't specify `includeArchived` uses default (false)
- Default behavior matches current behavior exactly
- No breaking changes to existing functionality

## Type Generation Impact

### Generated TypeScript Types

After schema change, GraphQL CodeGen will:

1. **Update Account Type**:
```typescript
interface Account {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  isArchived: boolean;  // ← NEW FIELD
}
```

2. **Update Category Type**:
```typescript
interface Category {
  id: string;
  name: string;
  type: string;
  isArchived: boolean;  // ← NEW FIELD
}
```

3. **Update GetAccountsQuery**:
```typescript
interface GetAccountsQueryVariables {
  includeArchived?: boolean;  // ← NEW VARIABLE
}
```

4. **Update GetCategoriesQuery**:
```typescript
interface GetCategoriesQueryVariables {
  includeArchived?: boolean;  // ← NEW VARIABLE
}
```

### Auto-Updated Composables

Vue Apollo composables automatically update:
```typescript
// Auto-generated from codegen
useGetAccountsQuery(variables?: { includeArchived?: boolean })
useGetCategoriesQuery(variables?: { includeArchived?: boolean })
```

## Validation Rules

### Schema Validation
- ✅ Boolean type is standard GraphQL scalar
- ✅ Default values are compatible with parameter type
- ✅ No circular type dependencies
- ✅ All references are properly defined

### Data Integrity
- ✅ isArchived flag is boolean (no null values)
- ✅ Existing data already has isArchived field in DynamoDB
- ✅ No constraint violations
- ✅ All transactions remain valid regardless of archive status

## Rollout Steps

1. **Step 1**: Update `backend/src/schema.graphql` with type additions
2. **Step 2**: Update resolver code to accept includeArchived parameter
3. **Step 3**: Update repository methods to filter by includeArchived
4. **Step 4**: Run backend tests to validate new schema and queries
5. **Step 5**: Run codegen to generate new frontend types
6. **Step 6**: Update frontend queries to use new schema features
7. **Step 7**: Update frontend composables to pass variables
8. **Step 8**: Deploy backend first, then frontend

## Testing Checkpoints

- [ ] GraphQL schema validates without errors
- [ ] Backend query resolvers accept includeArchived parameter
- [ ] Repository filtering works correctly
- [ ] Frontend codegen generates new types without errors
- [ ] Frontend queries execute with new variables
- [ ] Default behavior (includeArchived=false) matches current behavior
- [ ] includeArchived=true returns both active and archived entities
