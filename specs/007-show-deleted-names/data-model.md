# Data Model: Display Deleted Account/Category Names

**Phase**: 1 - Design
**Date**: 2025-10-27
**Status**: Design Phase

## Entity Overview

This feature leverages existing entities with no new data structures. It exposes the `isArchived` field that already exists in the database and adds query parameters for filtering.

## Entities

### Transaction (No Changes)

**Status**: No changes to Transaction entity
**Purpose**: Represents a user's financial transaction

**Existing Fields**:
```typescript
interface Transaction {
  id: string;              // UUID
  userId: string;          // Partition by user
  accountId: string;       // Reference to Account (may be archived)
  categoryId?: string;     // Optional reference to Category (may be archived)
  amount: number;
  type: TransactionType;   // INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT
  date: string;            // YYYY-MM-DD format
  description: string;
  transferId?: string;     // For linked transfers
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**Why No Changes**:
- Transaction references are immutable (accountId, categoryId don't change when entity is archived)
- Transaction creation date doesn't change
- We look up account/category names at display time via separate queries

### Account (Expose Existing Field)

**Status**: Expose `isArchived` field in GraphQL schema
**Purpose**: Represents a user's bank account or financial account

**Existing Fields** (database):
```typescript
interface Account {
  id: string;              // UUID
  userId: string;          // Partition by user
  name: string;            // Original name (preserved when archived)
  currency: string;        // ISO currency code
  initialBalance: number;
  isArchived: boolean;     // ← EXPOSE THIS in GraphQL (already in DB)
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**GraphQL Schema Change**:
- Add `isArchived: Boolean!` to Account type (was private, now exposed)
- Add `includeArchived: Boolean = false` parameter to accounts query

**Data Integrity Rules**:
- When account is archived: `isArchived` set to true, name preserved as-is
- When account is deleted (soft-delete): no data loss, just flag change
- All transaction references remain valid
- Balance calculation ignores archived flag (historical transactions still count)

### Category (Expose Existing Field)

**Status**: Expose `isArchived` field in GraphQL schema
**Purpose**: Represents a spending/income category

**Existing Fields** (database):
```typescript
interface Category {
  id: string;              // UUID
  userId: string;          // Partition by user
  name: string;            // Original name (preserved when archived)
  type: string;            // INCOME or EXPENSE
  isArchived: boolean;     // ← EXPOSE THIS in GraphQL (already in DB)
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**GraphQL Schema Change**:
- Add `isArchived: Boolean!` to Category type (was private, now exposed)
- Add `includeArchived: Boolean = false` parameter to categories query

**Data Integrity Rules**:
- When category is archived: `isArchived` set to true, name preserved as-is
- When category is deleted (soft-delete): no data loss
- All transaction references remain valid
- Transactions with deleted category still retain categoryId reference

## Relationships

### Transaction → Account (Lookup by ID)

```
Transaction
  └─ accountId (UUID)
      └─ Account (looked up with includeArchived: true)
         └─ name (displayed with strikethrough if isArchived=true)
```

**Behavior**:
1. Transaction has accountId reference
2. Frontend loads accounts with `includeArchived: true`
3. Match accountId to find account entity
4. Display account.name with strikethrough if account.isArchived

### Transaction → Category (Lookup by ID, Optional)

```
Transaction
  └─ categoryId?: (UUID)
      └─ Category (looked up with includeArchived: true, if categoryId exists)
         └─ name (displayed with strikethrough if isArchived=true)
```

**Behavior**:
1. Transaction has optional categoryId reference
2. Frontend loads categories with `includeArchived: true`
3. If categoryId exists, match to find category entity
4. Display category.name with strikethrough if category.isArchived
5. If categoryId is null/undefined: show empty/blank (no strikethrough)

## Query Parameters

### accounts Query

**Before**:
```graphql
query {
  accounts {
    id
    name
    currency
    # isArchived NOT exposed
  }
}
```

**After**:
```graphql
query GetAccounts($includeArchived: Boolean = false) {
  accounts(includeArchived: $includeArchived) {
    id
    name
    currency
    isArchived  # ← NEWLY EXPOSED
  }
}
```

**Parameter Behavior**:
- `includeArchived: false` (default) → returns only active accounts
- `includeArchived: true` → returns all accounts (active + archived)

**Use Cases**:
- Default navigation/UI: `includeArchived: false` (show only active)
- Transaction display: `includeArchived: true` (show archived for lookup)

### categories Query

**Before**:
```graphql
query {
  categories {
    id
    name
    type
    # isArchived NOT exposed
  }
}
```

**After**:
```graphql
query GetCategories($includeArchived: Boolean = false) {
  categories(includeArchived: $includeArchived) {
    id
    name
    type
    isArchived  # ← NEWLY EXPOSED
  }
}
```

**Parameter Behavior**:
- `includeArchived: false` (default) → returns only active categories
- `includeArchived: true` → returns all categories (active + archived)

## Database Impact

**No Schema Changes Required**:
- `isArchived` field already exists in DynamoDB
- No migration needed
- No data modifications

**Query Changes** (backend only):
- Repository methods now accept optional `includeArchived` parameter
- Default behavior: filter out archived (backward compatible)
- When true: include archived in results

**Backward Compatibility**:
- Existing code that doesn't use `includeArchived` works unchanged
- Default behavior (exclude archived) matches current behavior
- No breaking changes to existing operations

## Edge Cases & Validation

### Edge Case 1: Transaction with Deleted Account AND Deleted Category

**Scenario**: Account is archived AND category is archived
**Behavior**: Both names display with strikethrough styling
**Implementation**: Simple - check isArchived flag for each entity independently

### Edge Case 2: Transaction with Deleted Account but NO Category

**Scenario**: Account archived, categoryId is null
**Behavior**: Account name shows with strikethrough, category field stays empty
**Implementation**: Check if categoryId exists before applying strikethrough to category

### Edge Case 3: Transaction with Active Account but Deleted Category

**Scenario**: Account is active, but category is archived
**Behavior**: Account name normal, category name with strikethrough
**Implementation**: CSS class applied only to deleted entity

### Edge Case 4: Transfer Transactions with Deleted Account

**Scenario**: Transfer involves account that's archived (TRANSFER_IN or TRANSFER_OUT)
**Behavior**: Both transaction and linked transfer show original account names
**Implementation**: Single query with `includeArchived: true` shows both pairs

### Edge Case 5: Filtering/Searching Transactions with Deleted Entities

**Scenario**: User filters by account or category that's now deleted
**Behavior**: Transactions still match and display correctly
**Implementation**: Backend filter already handles this - transaction still has accountId/categoryId reference

## Summary of Changes

| Entity | Field | Status | Impact |
|--------|-------|--------|--------|
| Account | isArchived | Expose in GraphQL | Display with strikethrough when true |
| Category | isArchived | Expose in GraphQL | Display with strikethrough when true |
| Query | accounts(includeArchived) | Add parameter | Backend filtering |
| Query | categories(includeArchived) | Add parameter | Backend filtering |
| Transaction | (none) | No changes | Uses existing references |

**Total Breaking Changes**: 0
**Total Data Migrations**: 0
**Total New Database Fields**: 0
