# Data Model: Transaction Filtering

**Feature**: Transaction Filtering
**Date**: 2025-10-19
**Related**: [plan.md](./plan.md), [research.md](./research.md)

## Overview

This document defines all data structures, types, and schemas for the transaction filtering feature across backend (GraphQL, TypeScript, DynamoDB) and frontend (Vue 3, TypeScript).

---

## GraphQL Schema

### Input Types

#### TransactionFilterInput

Filter criteria for querying transactions. All fields are optional - empty object means no filtering.

```graphql
"""
Input type for filtering transactions by multiple dimensions.
All fields are optional. Filters are combined with AND logic across
different filter types, and OR logic within the same multi-select filter.
"""
input TransactionFilterInput {
  """
  Filter by account IDs (multi-select).
  Returns transactions where accountId matches ANY of the provided IDs.
  """
  accountIds: [ID!]

  """
  Filter by category IDs (multi-select).
  Returns transactions where categoryId matches ANY of the provided IDs.
  """
  categoryIds: [ID!]

  """
  Include transactions without a category (uncategorized).
  When true and categoryIds is provided: returns transactions matching categoryIds OR uncategorized.
  When true and categoryIds is empty: returns only uncategorized transactions.
  When false or omitted: only returns transactions with categories (if categoryIds filter present).
  """
  includeUncategorized: Boolean

  """
  Filter by transaction date after (inclusive).
  Format: YYYY-MM-DD (e.g., "2024-01-01")
  Returns transactions where date >= dateAfter.
  """
  dateAfter: String

  """
  Filter by transaction date before (inclusive).
  Format: YYYY-MM-DD (e.g., "2024-12-31")
  Returns transactions where date <= dateBefore.
  """
  dateBefore: String

  """
  Filter by transaction types (multi-select).
  Returns transactions where type matches ANY of the provided types.
  """
  types: [TransactionType!]
}
```

### Query Extensions

```graphql
extend type Query {
  """
  Fetch paginated transactions with optional filtering.

  @param pagination - Cursor-based pagination parameters (first, after)
  @param filters - Optional filter criteria (all fields optional)
  @returns TransactionConnection with edges, pageInfo, and totalCount

  Examples:
  - No filters: Returns all active transactions
  - Date range only: transactions(filters: { dateAfter: "2024-03-01", dateBefore: "2024-03-31" })
  - Multi-filter: transactions(filters: { accountIds: ["id1", "id2"], types: [EXPENSE] })
  """
  transactions(
    pagination: PaginationInput
    filters: TransactionFilterInput
  ): TransactionConnection!
}
```

### Existing Types (Reference)

These types already exist in the schema and are referenced by the filtering feature:

```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
}

type Transaction {
  id: ID!
  userId: ID!
  accountId: ID!
  categoryId: ID
  type: TransactionType!
  amount: Float!
  currency: String!
  date: String!        # YYYY-MM-DD format
  description: String
  transferId: ID
  isArchived: Boolean!
  createdAt: String!   # ISO 8601 timestamp
  updatedAt: String!   # ISO 8601 timestamp
}

type TransactionEdge {
  node: Transaction!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type TransactionConnection {
  edges: [TransactionEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

input PaginationInput {
  first: Int
  after: String
}
```

---

## Backend TypeScript Types

### Filter Input Type

```typescript
/**
 * Transaction filter criteria matching GraphQL TransactionFilterInput.
 * All fields optional - empty object = no filtering.
 */
export interface TransactionFilterInput {
  /** Filter by account IDs (OR logic) */
  accountIds?: string[]

  /** Filter by category IDs (OR logic) */
  categoryIds?: string[]

  /** Include uncategorized transactions */
  includeUncategorized?: boolean

  /** Filter by date >= dateAfter (YYYY-MM-DD) */
  dateAfter?: string

  /** Filter by date <= dateBefore (YYYY-MM-DD) */
  dateBefore?: string

  /** Filter by transaction types (OR logic) */
  types?: TransactionType[]
}
```

### Repository Method Signature

```typescript
/**
 * TransactionRepository.findActiveByUserId with filters
 */
async findActiveByUserId(
  userId: string,
  pagination?: PaginationInput,
  filters?: TransactionFilterInput
): Promise<TransactionConnection>
```

### Service Method Signature

```typescript
/**
 * TransactionService.getTransactionsByUser with filters
 */
async getTransactionsByUser(
  userId: string,
  pagination?: PaginationInput,
  filters?: TransactionFilterInput
): Promise<TransactionConnection>
```

### Zod Validation Schema

```typescript
import { z } from 'zod'

/**
 * Zod schema for TransactionFilterInput validation in resolver.
 * Validates format but NOT business logic (e.g., doesn't check if account exists).
 */
export const transactionFilterInputSchema = z.object({
  accountIds: z.array(z.string().uuid()).optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
  includeUncategorized: z.boolean().optional(),
  dateAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  types: z.array(
    z.enum(['INCOME', 'EXPENSE', 'TRANSFER_IN', 'TRANSFER_OUT'])
  ).optional(),
}).optional()
```

---

## DynamoDB Query Structure

### FilterExpression Builder Output

```typescript
interface FilterExpressionResult {
  /** Combined FilterExpression string (e.g., "isArchived = :isArchived AND accountId IN (:accountId0, :accountId1)") */
  expression: string

  /** Attribute name mappings for reserved words (e.g., { "#type": "type", "#date": "date" }) */
  attributeNames: Record<string, string>

  /** Attribute value bindings (e.g., { ":isArchived": false, ":accountId0": "uuid1", ":accountId1": "uuid2" }) */
  attributeValues: Record<string, unknown>
}
```

### Query Parameters Example

```typescript
// Example: Filter by date range + account + type
{
  TableName: "TransactionsTable",
  IndexName: "UserDateIndex",
  KeyConditionExpression: "userId = :userId AND #date BETWEEN :dateAfter AND :dateBefore",
  FilterExpression: "isArchived = :isArchived AND accountId IN (:accountId0, :accountId1) AND #type IN (:type0)",
  ExpressionAttributeNames: {
    "#date": "date",
    "#type": "type"
  },
  ExpressionAttributeValues: {
    ":userId": "user-uuid",
    ":dateAfter": "2024-03-01",
    ":dateBefore": "2024-03-31",
    ":isArchived": false,
    ":accountId0": "account-uuid-1",
    ":accountId1": "account-uuid-2",
    ":type0": "EXPENSE"
  },
  ScanIndexForward: false,  // Descending order (newest first)
  Limit: 20                  // Page size
}
```

---

## Frontend Types

### Vue Composable State

```typescript
/**
 * Frontend filter state management (useTransactionFilters composable).
 * Maintains separation between selected (UI) and applied (query) filters.
 */
export interface TransactionFiltersState {
  // UI State (selected but not yet applied)
  selectedAccountIds: Ref<string[]>
  selectedCategoryIds: Ref<string[]>
  includeUncategorized: Ref<boolean>
  dateAfter: Ref<string | null>        // YYYY-MM-DD or null
  dateBefore: Ref<string | null>       // YYYY-MM-DD or null
  selectedTypes: Ref<TransactionType[]>

  // Query State (actually applied to GraphQL query)
  appliedFilters: Ref<TransactionFilterInput | null>

  // Computed
  hasSelectedFilters: ComputedRef<boolean>  // Any selections made?
  hasAppliedFilters: ComputedRef<boolean>   // Any filters active in query?

  // Methods
  applyFilters: () => void        // Apply selected filters to query
  clearFilters: () => void        // Clear all selected filters
  resetToApplied: () => void      // Reset selected to match applied
}
```

### Filter UI Props

```typescript
/**
 * Props for TransactionFilterBar.vue component
 */
export interface TransactionFilterBarProps {
  /** Available accounts for filtering */
  accounts: Account[]

  /** Available categories for filtering */
  categories: Category[]

  /** Loading state (disable inputs while query in flight) */
  loading?: boolean
}

/**
 * Emits for TransactionFilterBar.vue component
 */
export interface TransactionFilterBarEmits {
  /** Emitted when user clicks Apply button */
  (e: 'apply', filters: TransactionFilterInput): void

  /** Emitted when user clicks Clear button */
  (e: 'clear'): void
}
```

### Generated Apollo Types (Auto-generated)

```typescript
/**
 * Generated by @graphql-codegen after schema sync.
 * Located in frontend/src/__generated__/graphql-types.ts
 */

// Input types
export type TransactionFilterInput = {
  accountIds?: InputMaybe<Array<Scalars['ID']['input']>>
  categoryIds?: InputMaybe<Array<Scalars['ID']['input']>>
  includeUncategorized?: InputMaybe<Scalars['Boolean']['input']>
  dateAfter?: InputMaybe<Scalars['String']['input']>
  dateBefore?: InputMaybe<Scalars['String']['input']>
  types?: InputMaybe<Array<TransactionType>>
}

// Query variables type
export type GetTransactionsPaginatedQueryVariables = Exact<{
  pagination?: InputMaybe<PaginationInput>
  filters?: InputMaybe<TransactionFilterInput>  // NEW
}>

// Generated composable
export function useGetTransactionsPaginatedQuery(
  variables?: GetTransactionsPaginatedQueryVariables | VueCompositionApi.Ref<GetTransactionsPaginatedQueryVariables>,
  options?: VueApolloComposable.UseQueryOptions<GetTransactionsPaginatedQuery, GetTransactionsPaginatedQueryVariables>
)
```

---

## Data Flow

### Complete Request Flow

```
1. User Interaction (Frontend)
   ├─> User selects filters in TransactionFilterBar.vue
   ├─> selectedAccountIds.value = ["uuid1", "uuid2"]
   ├─> selectedTypes.value = ["EXPENSE"]
   ├─> User clicks "Apply" button
   └─> applyFilters() called

2. State Update (Frontend Composable)
   ├─> useTransactionFilters.applyFilters()
   ├─> Builds TransactionFilterInput from selected values
   └─> appliedFilters.value = { accountIds: ["uuid1", "uuid2"], types: ["EXPENSE"] }

3. GraphQL Query (Frontend)
   ├─> useTransactions composable watches appliedFilters
   ├─> Triggers GraphQL query with filters variable
   └─> Query: transactions(filters: { accountIds: [...], types: [...] })

4. Resolver (Backend)
   ├─> transactionResolvers.ts: transactions resolver
   ├─> Validates filters with transactionFilterInputSchema (Zod)
   ├─> Extracts authenticated user from context
   └─> Calls context.transactionService.getTransactionsByUser(userId, pagination, filters)

5. Service Layer (Backend)
   ├─> TransactionService.getTransactionsByUser()
   ├─> Validates date format (YYYY-MM-DD)
   └─> Calls transactionRepository.findActiveByUserId(userId, pagination, filters)

6. Repository Layer (Backend)
   ├─> TransactionRepository.findActiveByUserId()
   ├─> Determines index: dateAfter/dateBefore → UserDateIndex, else → UserCreatedAtIndex
   ├─> Builds KeyConditionExpression (userId + optional date BETWEEN)
   ├─> Builds FilterExpression (accountIds IN, types IN, isArchived = false)
   └─> Executes DynamoDB query via paginateQuery utility

7. DynamoDB Query
   ├─> Scans items matching KeyConditionExpression (userId + date range)
   ├─> Applies FilterExpression (account + type filters)
   ├─> Returns matching items + pagination metadata
   └─> Example: Scans 400 items (March), returns 150 matching EXPENSE from selected accounts

8. Response Construction (Backend)
   ├─> Maps DynamoDB items to Transaction objects
   ├─> Encodes cursors for pagination
   ├─> Builds TransactionConnection response
   └─> Returns { edges, pageInfo, totalCount }

9. UI Update (Frontend)
   ├─> Apollo cache updated with filtered results
   ├─> useTransactions composable reactively updates
   ├─> TransactionList.vue re-renders with filtered transactions
   └─> User sees filtered results
```

---

## Validation Rules

### Backend Validation (Zod + Service Layer)

| Field | Format Validation (Zod) | Business Validation (Service) |
|-------|-------------------------|-------------------------------|
| `accountIds` | Array of UUIDs | None (non-existent IDs simply return no results) |
| `categoryIds` | Array of UUIDs | None (non-existent IDs simply return no results) |
| `includeUncategorized` | Boolean | None |
| `dateAfter` | YYYY-MM-DD regex | Valid date format (additional check in service) |
| `dateBefore` | YYYY-MM-DD regex | Valid date format (additional check in service) |
| `types` | Array of TransactionType enum | None (enum validation sufficient) |

**Important**: Do NOT validate `dateAfter < dateBefore` - per requirements, allow invalid ranges (return empty results).

### Frontend Validation

| Field | Validation | Implementation |
|-------|-----------|----------------|
| `accountIds` | Must be from available accounts | v-select :items binding |
| `categoryIds` | Must be from available categories | v-select :items binding |
| `dateAfter` | Valid date format | Native date picker (browser) |
| `dateBefore` | Valid date format | Native date picker (browser) |
| `types` | Must be valid TransactionType | v-select with enum options |

**Frontend relies on component constraints** - no custom validation needed.

---

## Edge Cases

### Empty Filters

```typescript
// Empty object = no filtering
filters: {}
// Result: All active transactions returned
```

### Invalid Date Range

```typescript
// dateAfter > dateBefore
filters: {
  dateAfter: "2024-12-31",
  dateBefore: "2024-01-01"
}
// Result: Empty result set (no transactions match), "No transactions found" message
// Per requirement: Do NOT validate or error - allow and return empty
```

### Uncategorized Only

```typescript
// Include only uncategorized transactions
filters: {
  includeUncategorized: true,
  categoryIds: []  // or undefined
}
// FilterExpression: attribute_not_exists(categoryId)
```

### Uncategorized + Specific Categories

```typescript
// Include specific categories AND uncategorized
filters: {
  categoryIds: ["cat-uuid-1", "cat-uuid-2"],
  includeUncategorized: true
}
// FilterExpression: (categoryId IN (:categoryId0, :categoryId1) OR attribute_not_exists(categoryId))
```

### All Transaction Types

```typescript
// All types selected = equivalent to no type filter
filters: {
  types: ["INCOME", "EXPENSE", "TRANSFER_IN", "TRANSFER_OUT"]
}
// Optimization: Could omit type filter entirely, but safe to include
```

### Non-Existent IDs

```typescript
// Filtering by account/category that doesn't exist
filters: {
  accountIds: ["non-existent-uuid"]
}
// Result: Empty result set (no transactions match)
// No error thrown - graceful handling
```

---

## Performance Considerations

### Index Selection Logic

```typescript
function selectIndex(filters?: TransactionFilterInput): string {
  // Use date index when date filters present (most selective)
  if (filters?.dateAfter || filters?.dateBefore) {
    return "UserDateIndex"
  }
  // Otherwise use recency index
  return "UserCreatedAtIndex"
}
```

### Filter Selectivity Impact

| Filter Combination | Index Used | Items Scanned | Typical Result Size |
|--------------------|-----------|---------------|---------------------|
| Date only | UserDateIndex | 100-500 (month) | 100-500 |
| Date + Account | UserDateIndex | 100-500 (month) | 50-200 |
| Date + Category | UserDateIndex | 100-500 (month) | 20-50 |
| Date + Type | UserDateIndex | 100-500 (month) | 50-250 |
| Date + All filters | UserDateIndex | 100-500 (month) | 10-50 |
| Type only | UserCreatedAtIndex | 5,000 (all) | 2,500 |
| Account only | UserCreatedAtIndex | 5,000 (all) | 1,000-2,500 |
| No filters | UserCreatedAtIndex | 5,000 (all) | 5,000 |

**Insight**: Date filtering dramatically reduces scan size, improving performance.

---

## Testing Data Structures

### Test Fixtures

```typescript
// Example test filter inputs
export const testFilters = {
  dateRangeOnly: {
    dateAfter: "2024-03-01",
    dateBefore: "2024-03-31"
  },

  multiAccount: {
    accountIds: ["account-uuid-1", "account-uuid-2"]
  },

  expensesOnly: {
    types: ["EXPENSE"]
  },

  combinedFilters: {
    accountIds: ["account-uuid-1"],
    categoryIds: ["category-uuid-1", "category-uuid-2"],
    includeUncategorized: true,
    dateAfter: "2024-01-01",
    dateBefore: "2024-12-31",
    types: ["EXPENSE"]
  },

  emptyFilters: {}
}
```

---

## Migration Notes

**No Database Migration Required** - All filtering uses existing table structure and GSIs.

**Schema Migration** - Backward compatible:
- Old clients: `transactions(pagination: {...})` continues to work
- New clients: `transactions(pagination: {...}, filters: {...})` uses filtering

**Deployment Safe** - Backend can be deployed independently, frontend updated after.

---

## Future Extensions

### Potential Future Filter Fields

```graphql
# Not in current scope - examples for future
input TransactionFilterInput {
  # Existing fields...

  # Future additions (no schema migration needed with FilterExpression approach):
  amountMin: Float              # Minimum amount filter
  amountMax: Float              # Maximum amount filter
  description: String           # Text search in description
  tags: [String!]               # Tag-based filtering (if tags added)
  merchantName: String          # Merchant name search (if added)
  isRecurring: Boolean          # Recurring transaction flag (if added)
}
```

All future filters work with existing DynamoDB structure using FilterExpression - no new GSIs needed.
