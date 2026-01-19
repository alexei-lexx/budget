# GraphQL API Contract: Exclude Categories from Reports

**Feature Branch**: `028-exclude-non-operating`
**API Version**: Extends existing GraphQL API
**Protocol**: GraphQL over HTTP/HTTPS

---

## Overview

This document defines the GraphQL API changes required to support category exclusion from monthly reports.

---

## Schema Changes

### Modified Type: Category

```graphql
type Category {
  id: ID!
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Whether category is excluded from monthly reports
}
```

**Field: `excludeFromReports`**
- **Type**: `Boolean!` (required, non-nullable)
- **Description**: When `true`, transactions in this category are excluded from monthly income/expense report totals and category breakdowns. When `false`, transactions are included in reports.
- **Default**: None (must be explicitly provided at creation)
- **Constraints**: Must be `true` or `false`

**Backward Compatibility**:
- **Breaking Change**: Existing queries returning `Category` will now include `excludeFromReports` field
- **Migration Required**: Database migration sets field to `false` on all existing records
- **Client Impact**: GraphQL clients must handle new required field in responses

---

### Modified Input: CreateCategoryInput

```graphql
input CreateCategoryInput {
  name: String!
  type: CategoryType!
  excludeFromReports: Boolean!  # NEW: Required at creation
}
```

**Field: `excludeFromReports`**
- **Type**: `Boolean!` (required)
- **Description**: Whether to exclude this category from monthly reports
- **Validation**: Must be explicitly provided (no default value)
- **Example Values**: `true` (exclude), `false` (include)

**Backward Compatibility**:
- **Breaking Change**: Clients must now provide `excludeFromReports` when creating categories
- **Migration Path**: Update client code to include field in `createCategory` mutations

---

### Modified Input: UpdateCategoryInput

```graphql
input UpdateCategoryInput {
  name: String
  excludeFromReports: Boolean  # NEW: Optional - can toggle exclusion status
}
```

**Field: `excludeFromReports`**
- **Type**: `Boolean` (optional)
- **Description**: When provided, updates whether category is excluded from reports
- **Omission Behavior**: If omitted, existing value is preserved
- **Example Usage**: Set to `true` to exclude, `false` to include, or omit to leave unchanged

**Backward Compatibility**:
- **Non-Breaking**: Existing `updateCategory` calls continue to work (field is optional)
- **Enhancement**: Clients can now toggle exclusion status via updates

---

## Query Examples

### Query: Fetch all categories

**Request**:
```graphql
query GetCategories {
  categories {
    id
    name
    type
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "categories": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Groceries",
        "type": "EXPENSE",
        "excludeFromReports": false
      },
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "name": "Investments",
        "type": "EXPENSE",
        "excludeFromReports": true
      }
    ]
  }
}
```

**Behavior**:
- Returns all active (non-archived) categories for authenticated user
- Each category includes `excludeFromReports` field
- Categories with `excludeFromReports: true` will not appear in monthly report totals

---

### Query: Fetch categories by type

**Request**:
```graphql
query GetExpenseCategories {
  categories(type: EXPENSE) {
    id
    name
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "categories": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Groceries",
        "excludeFromReports": false
      },
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "name": "Investments",
        "excludeFromReports": true
      }
    ]
  }
}
```

---

## Mutation Examples

### Mutation: Create category with exclusion

**Request**:
```graphql
mutation CreateExcludedCategory {
  createCategory(input: {
    name: "Investment Purchases"
    type: EXPENSE
    excludeFromReports: true
  }) {
    id
    name
    type
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "createCategory": {
      "id": "323e4567-e89b-12d3-a456-426614174002",
      "name": "Investment Purchases",
      "type": "EXPENSE",
      "excludeFromReports": true
    }
  }
}
```

**Validation Rules**:
- `name`: Required, 1-50 characters
- `type`: Required, must be `INCOME` or `EXPENSE`
- `excludeFromReports`: Required, must be `true` or `false`

**Error Cases**:
- Missing `excludeFromReports`: GraphQL validation error
- Duplicate category name: Business logic error with code `DUPLICATE_NAME`

---

### Mutation: Update category to exclude from reports

**Request**:
```graphql
mutation ExcludeCategoryFromReports {
  updateCategory(
    id: "123e4567-e89b-12d3-a456-426614174000"
    input: {
      excludeFromReports: true
    }
  ) {
    id
    name
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "updateCategory": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Groceries",
      "excludeFromReports": true
    }
  }
}
```

**Behavior**:
- Only updates `excludeFromReports` field (name unchanged)
- Takes effect immediately in monthly reports
- Historical reports recalculate with new exclusion status

---

### Mutation: Update category to include in reports

**Request**:
```graphql
mutation IncludeCategoryInReports {
  updateCategory(
    id: "223e4567-e89b-12d3-a456-426614174001"
    input: {
      excludeFromReports: false
    }
  ) {
    id
    name
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "updateCategory": {
      "id": "223e4567-e89b-12d3-a456-426614174001",
      "name": "Investments",
      "excludeFromReports": false
    }
  }
}
```

---

### Mutation: Update category name without changing exclusion

**Request**:
```graphql
mutation RenameCategoryOnly {
  updateCategory(
    id: "123e4567-e89b-12d3-a456-426614174000"
    input: {
      name: "Grocery Shopping"
    }
  ) {
    id
    name
    excludeFromReports
  }
}
```

**Response**:
```json
{
  "data": {
    "updateCategory": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Grocery Shopping",
      "excludeFromReports": false
    }
  }
}
```

**Behavior**:
- `excludeFromReports` field omitted from input
- Existing `excludeFromReports` value preserved (not changed to `false`)

---

## Monthly Report Behavior

### Before Feature

**Query**:
```graphql
query MonthlyExpenseReport {
  monthlyReport(year: 2026, month: 1, type: EXPENSE) {
    totalIncome
    totalExpense
    categoryBreakdown {
      category {
        id
        name
      }
      total
      percentage
    }
  }
}
```

**Response** (before excluding categories):
```json
{
  "data": {
    "monthlyReport": {
      "totalIncome": 0,
      "totalExpense": 5500,
      "categoryBreakdown": [
        {
          "category": { "id": "...", "name": "Groceries" },
          "total": 500,
          "percentage": 9.09
        },
        {
          "category": { "id": "...", "name": "Investments" },
          "total": 5000,
          "percentage": 90.91
        }
      ]
    }
  }
}
```

---

### After Feature (with Investments excluded)

**Same Query**:
```graphql
query MonthlyExpenseReport {
  monthlyReport(year: 2026, month: 1, type: EXPENSE) {
    totalIncome
    totalExpense
    categoryBreakdown {
      category {
        id
        name
      }
      total
      percentage
    }
  }
}
```

**Response** (after excluding "Investments" category):
```json
{
  "data": {
    "monthlyReport": {
      "totalIncome": 0,
      "totalExpense": 500,
      "categoryBreakdown": [
        {
          "category": { "id": "...", "name": "Groceries" },
          "total": 500,
          "percentage": 100
        }
      ]
    }
  }
}
```

**Key Differences**:
- `totalExpense` decreased from 5500 to 500
- "Investments" category not in breakdown
- "Groceries" percentage recalculated to 100%

**Note**: Monthly report query/response structure unchanged (no breaking changes)

---

## Error Responses

### Missing Required Field (createCategory)

**Request**:
```graphql
mutation CreateCategoryMissingField {
  createCategory(input: {
    name: "New Category"
    type: EXPENSE
    # excludeFromReports missing
  }) {
    id
  }
}
```

**Response**:
```json
{
  "errors": [
    {
      "message": "Field \"CreateCategoryInput.excludeFromReports\" of required type \"Boolean!\" was not provided.",
      "locations": [{ "line": 2, "column": 18 }],
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

---

### Invalid Boolean Value

**Request**:
```graphql
mutation CreateCategoryInvalidValue {
  createCategory(input: {
    name: "New Category"
    type: EXPENSE
    excludeFromReports: "yes"  # Invalid: must be boolean
  }) {
    id
  }
}
```

**Response**:
```json
{
  "errors": [
    {
      "message": "Boolean cannot represent a non boolean value: \"yes\"",
      "locations": [{ "line": 5, "column": 25 }],
      "extensions": {
        "code": "BAD_USER_INPUT"
      }
    }
  ]
}
```

---

## Deprecations

**None**. No fields or operations are deprecated by this change.

---

## Migration Guide for Clients

### Step 1: Update Schema

Frontend clients using code generation (e.g., GraphQL Code Generator):

```bash
cd frontend
npm run codegen:sync-schema  # Sync schema from backend
npm run codegen              # Regenerate TypeScript types
```

### Step 2: Update Create Category Mutations

**Before**:
```typescript
createCategory({
  variables: {
    input: {
      name: "Groceries",
      type: CategoryType.Expense,
    }
  }
});
```

**After**:
```typescript
createCategory({
  variables: {
    input: {
      name: "Groceries",
      type: CategoryType.Expense,
      excludeFromReports: false,  // NEW: Required field
    }
  }
});
```

### Step 3: Update UI to Display/Edit Field

Add toggle switch in category form:
```vue
<v-switch
  v-model="categoryForm.excludeFromReports"
  label="Exclude from reports"
  hint="Transactions in this category will not appear in income/expense reports"
/>
```

### Step 4: Test Monthly Reports

Verify that:
1. Creating excluded categories works correctly
2. Toggling exclusion status updates reports
3. Monthly reports exclude transactions in excluded categories
4. Account balances remain accurate regardless of exclusion status

---

## Summary

**Breaking Changes**:
1. ✅ `Category` type now includes required `excludeFromReports` field
2. ✅ `createCategory` mutation requires `excludeFromReports` input

**Non-Breaking Changes**:
1. ✅ `updateCategory` mutation accepts optional `excludeFromReports` input
2. ✅ `monthlyReport` query response structure unchanged (behavior changed)

**Client Migration Required**: Yes (must update `createCategory` calls to include new required field)

**Database Migration Required**: Yes (sets `excludeFromReports: false` on existing categories)
