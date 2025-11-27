# GraphQL API Contract: REFUND Transaction Type

**Feature**: Minimal Refund Transaction Type
**Branch**: `012-minimal-refund`
**Date**: 2025-11-27
**API Version**: Incremental (backward compatible)

## Overview

This document specifies the GraphQL schema changes required to support REFUND transaction type. All changes are backward compatible additions to the existing schema.

## Schema Changes

### 1. TransactionType Enum (MODIFIED)

**Location**: `backend/src/schema.graphql`

**Before**:
```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
}
```

**After**:
```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
  REFUND
}
```

**Breaking Change**: No
**Rationale**: Adding enum value is backward compatible; existing queries continue to work

### 2. Mutations (NO CHANGES)

**Existing Mutations**:
```graphql
type Mutation {
  createTransaction(input: CreateTransactionInput!): Transaction!
  updateTransaction(id: ID!, input: UpdateTransactionInput!): Transaction!
  deleteTransaction(id: ID!): Transaction!
}
```

**Status**: No modifications required

**Input Types**:
```graphql
input CreateTransactionInput {
  accountId: ID!
  categoryId: ID
  type: TransactionType!  # Now accepts REFUND
  amount: Float!
  date: String!
  description: String
}

input UpdateTransactionInput {
  accountId: ID
  categoryId: ID
  type: TransactionType  # Now accepts REFUND
  amount: Float
  date: String
  description: String
}
```

**Note**: Input types remain unchanged; REFUND is automatically supported via enum extension

### 3. Queries (NO CHANGES)

**Existing Queries**:
```graphql
type Query {
  transaction(id: ID!): Transaction!
  transactions(
    pagination: PaginationInput
    filters: TransactionFilterInput
  ): TransactionConnection!
}
```

**Filter Input**:
```graphql
input TransactionFilterInput {
  accountIds: [ID!]
  categoryIds: [ID!]
  includeUncategorized: Boolean
  dateAfter: String
  dateBefore: String
  types: [TransactionType!]  # Now accepts REFUND in array
}
```

**Status**: No modifications required; REFUND automatically supported in `types` filter

### 4. Transaction Type (NO CHANGES)

**Existing Type**:
```graphql
type Transaction {
  id: ID!
  account: Account!
  category: Category
  type: TransactionType!  # Can now return REFUND
  amount: Float!
  date: String!
  description: String
  createdAt: String!
  updatedAt: String!
}
```

**Status**: No modifications required; REFUND value supported via enum

### 5. Report Queries (NO CHANGES)

**Existing Queries**:
```graphql
type Query {
  monthlyReport(year: Int!, month: Int!, type: TransactionType!): MonthlyReport!
  monthlyWeekdayReport(
    year: Int!
    month: Int!
    type: TransactionType!
    excludeOutliers: Boolean = false
  ): MonthlyWeekdayReport!
}
```

**Status**: No modifications required

**Behavior**: Reports will continue to query with `type: EXPENSE`, automatically excluding REFUND transactions

## Usage Examples

### Example 1: Create REFUND Transaction

**Request**:
```graphql
mutation CreateRefund {
  createTransaction(input: {
    accountId: "acc-123"
    categoryId: "cat-groceries-456"
    type: REFUND
    amount: 25.50
    date: "2025-11-27"
    description: "Returned expired milk"
  }) {
    id
    type
    amount
    account {
      id
      name
      balance
    }
    category {
      id
      name
      type
    }
    createdAt
  }
}
```

**Response**:
```json
{
  "data": {
    "createTransaction": {
      "id": "txn-789",
      "type": "REFUND",
      "amount": 25.50,
      "account": {
        "id": "acc-123",
        "name": "Checking Account",
        "balance": 1025.50
      },
      "category": {
        "id": "cat-groceries-456",
        "name": "Groceries",
        "type": "EXPENSE"
      },
      "createdAt": "2025-11-27T10:30:00Z"
    }
  }
}
```

### Example 2: Create REFUND without Category

**Request**:
```graphql
mutation CreateUncategorizedRefund {
  createTransaction(input: {
    accountId: "acc-123"
    type: REFUND
    amount: 15.00
    date: "2025-11-27"
    description: "Amazon refund"
  }) {
    id
    type
    amount
    category {
      id
      name
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "createTransaction": {
      "id": "txn-790",
      "type": "REFUND",
      "amount": 15.00,
      "category": null
    }
  }
}
```

### Example 3: Update Transaction to REFUND

**Request**:
```graphql
mutation ConvertToRefund {
  updateTransaction(
    id: "txn-existing-123"
    input: {
      type: REFUND
      categoryId: "cat-shopping-789"
    }
  ) {
    id
    type
    category {
      name
      type
    }
  }
}
```

**Response**:
```json
{
  "data": {
    "updateTransaction": {
      "id": "txn-existing-123",
      "type": "REFUND",
      "category": {
        "name": "Shopping",
        "type": "EXPENSE"
      }
    }
  }
}
```

### Example 4: Filter Transactions by REFUND Type

**Request**:
```graphql
query GetRefundTransactions {
  transactions(
    pagination: { first: 20 }
    filters: {
      types: [REFUND]
    }
  ) {
    edges {
      node {
        id
        type
        amount
        date
        description
        account {
          name
        }
        category {
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Response**:
```json
{
  "data": {
    "transactions": {
      "edges": [
        {
          "node": {
            "id": "txn-789",
            "type": "REFUND",
            "amount": 25.50,
            "date": "2025-11-27",
            "description": "Returned expired milk",
            "account": {
              "name": "Checking Account"
            },
            "category": {
              "name": "Groceries"
            }
          }
        }
      ],
      "pageInfo": {
        "hasNextPage": false,
        "endCursor": "cursor-abc"
      },
      "totalCount": 1
    }
  }
}
```

### Example 5: Filter by Multiple Types Including REFUND

**Request**:
```graphql
query GetIncomeAndRefunds {
  transactions(
    pagination: { first: 50 }
    filters: {
      types: [INCOME, REFUND]
    }
  ) {
    edges {
      node {
        id
        type
        amount
        date
      }
    }
    totalCount
  }
}
```

**Response**:
```json
{
  "data": {
    "transactions": {
      "edges": [
        {
          "node": {
            "id": "txn-100",
            "type": "INCOME",
            "amount": 3000.00,
            "date": "2025-11-01"
          }
        },
        {
          "node": {
            "id": "txn-789",
            "type": "REFUND",
            "amount": 25.50,
            "date": "2025-11-27"
          }
        }
      ],
      "totalCount": 2
    }
  }
}
```

### Example 6: Error - Invalid Category Type

**Request**:
```graphql
mutation CreateRefundWithIncomeCategory {
  createTransaction(input: {
    accountId: "acc-123"
    categoryId: "cat-salary-999"  # Income category
    type: REFUND
    amount: 50.00
    date: "2025-11-27"
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
      "message": "Category type \"INCOME\" doesn't match transaction type \"REFUND\"",
      "extensions": {
        "code": "INVALID_CATEGORY_TYPE"
      }
    }
  ],
  "data": {
    "createTransaction": null
  }
}
```

## Validation Rules

### Input Validation (GraphQL Layer)

| Field | Type | Validation |
|-------|------|------------|
| `type` | TransactionType | Must be one of: INCOME, EXPENSE, REFUND (TRANSFER types not allowed in mutations) |
| `amount` | Float | Must be > 0 |
| `date` | String | Must match YYYY-MM-DD format |
| `accountId` | ID | Must be valid UUID format |
| `categoryId` | ID (optional) | Must be valid UUID format if provided |

### Business Validation (Service Layer)

| Rule | Error Code | Trigger |
|------|------------|---------|
| Category type must match transaction type | `INVALID_CATEGORY_TYPE` | REFUND with INCOME category |
| Account must exist | `ACCOUNT_NOT_FOUND` | Invalid accountId |
| Category must exist | `CATEGORY_NOT_FOUND` | Invalid categoryId |
| Account must belong to user | `UNAUTHORIZED` | Account owned by different user |
| Category must belong to user | `UNAUTHORIZED` | Category owned by different user |

## Error Codes

| Code | HTTP Status | Description | Example |
|------|-------------|-------------|---------|
| `INVALID_CATEGORY_TYPE` | 400 | Category type doesn't match transaction type | REFUND with INCOME category |
| `ACCOUNT_NOT_FOUND` | 404 | Account not found or unauthorized | Invalid accountId |
| `CATEGORY_NOT_FOUND` | 404 | Category not found or unauthorized | Invalid categoryId |
| `UNAUTHORIZED` | 401 | Resource belongs to different user | Cross-user access attempt |
| `BAD_USER_INPUT` | 400 | Input validation failed | Invalid date format, negative amount |

## Backward Compatibility

### Client Compatibility

**Old Clients** (before REFUND support):
- ✓ Can continue creating INCOME/EXPENSE transactions
- ✓ Can continue querying transactions (will receive REFUND in results)
- ✓ Can filter by INCOME/EXPENSE (won't see REFUND transactions)
- ⚠️ May display REFUND as unknown type (client UI issue, not API issue)

**New Clients** (with REFUND support):
- ✓ Can create REFUND transactions
- ✓ Can filter by REFUND type
- ✓ Can display REFUND in UI with proper styling

### Schema Evolution

**Version Strategy**: No API versioning required
- GraphQL enum extension is non-breaking
- Existing queries continue to work
- Clients gracefully handle unknown enum values

## Frontend Code Generation

After schema update, frontend must regenerate types:

```bash
cd frontend
npm run codegen:sync-schema  # Sync schema from backend
npm run codegen              # Generate TypeScript types and composables
```

**Generated Types** (frontend/src/generated/graphql.ts):
```typescript
export enum TransactionType {
  Income = 'INCOME',
  Expense = 'EXPENSE',
  TransferIn = 'TRANSFER_IN',
  TransferOut = 'TRANSFER_OUT',
  Refund = 'REFUND',  // New
}
```

**Generated Composables**:
- `useCreateTransactionMutation` - Updated to accept REFUND type
- `useUpdateTransactionMutation` - Updated to accept REFUND type
- `useTransactionsQuery` - Returns transactions including REFUND type

## Testing Strategy

### GraphQL Resolver Tests (Optional)

Test cases:
- Create REFUND transaction with expense category → Success
- Create REFUND transaction without category → Success
- Create REFUND transaction with income category → Error INVALID_CATEGORY_TYPE
- Update transaction type from EXPENSE to REFUND → Success
- Filter transactions by REFUND type → Returns only REFUND transactions
- Query all transactions → Includes REFUND in results

### Integration Tests

End-to-end scenarios:
1. Create REFUND → Verify account balance increases
2. Delete REFUND → Verify account balance decreases
3. Filter by REFUND → Verify only REFUND transactions returned
4. Query monthly expense report → Verify REFUND excluded

## Summary

**Schema Changes**: 1 modification (TransactionType enum)
**Breaking Changes**: None
**New Queries**: None
**New Mutations**: None
**New Types**: None
**Backward Compatible**: Yes

The GraphQL contract extends the existing API with minimal changes, maintaining full backward compatibility while enabling REFUND transaction support.
