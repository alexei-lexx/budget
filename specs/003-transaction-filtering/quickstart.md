# Quickstart Guide: Transaction Filtering Implementation

**Feature**: Transaction Filtering
**Date**: 2025-10-19
**Estimated Time**: 8-12 hours
**Related**: [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/graphql-schema.graphql](./contracts/graphql-schema.graphql)

## Overview

This guide provides step-by-step instructions for implementing the transaction filtering feature. Follow these phases in order for a smooth implementation.

---

## Prerequisites

- ✅ DynamoDB table with existing UserDateIndex and UserCreatedAtIndex GSIs
- ✅ Backend GraphQL API with transactions query
- ✅ Frontend Vue 3 app with Apollo Client
- ✅ Development database running (`cd backend && npm run db:start`)

---

## Phase 1: Backend Schema & Types

### Step 1.1: Update GraphQL Schema

**File**: `backend/src/schema.graphql`

**Action**: Add TransactionFilterInput and extend transactions query

```graphql
# Add this input type
input TransactionFilterInput {
  accountIds: [ID!]
  categoryIds: [ID!]
  includeUncategorized: Boolean
  dateAfter: String
  dateBefore: String
  types: [TransactionType!]
}

# Modify existing transactions query
extend type Query {
  transactions(
    pagination: PaginationInput
    filters: TransactionFilterInput  # ADD THIS LINE
  ): TransactionConnection!
}
```

**Test**: Run `npm run build` in backend to verify schema compiles

---

### Step 1.2: Add TypeScript Types

**File**: `backend/src/models/Transaction.ts`

**Action**: Add TransactionFilterInput interface

```typescript
/**
 * Transaction filter input matching GraphQL schema
 */
export interface TransactionFilterInput {
  accountIds?: string[]
  categoryIds?: string[]
  includeUncategorized?: boolean
  dateAfter?: string  // YYYY-MM-DD
  dateBefore?: string // YYYY-MM-DD
  types?: TransactionType[]
}
```

**Test**: Run `npm run build` to verify types compile

---

## Phase 2: Backend Repository Layer

### Step 2.1: Add Filter Expression Builder

**File**: `backend/src/repositories/TransactionRepository.ts`

**Action**: Add private method to build DynamoDB FilterExpression

```typescript
/**
 * Build FilterExpression for transaction filters.
 * Handles account, category, type filtering with multi-select (IN operator).
 */
private buildFilterExpression(
  filters?: TransactionFilterInput
): {
  expression: string
  attributeNames: Record<string, string>
  attributeValues: Record<string, unknown>
} {
  const conditions: string[] = ['isArchived = :isArchived']
  const attributeNames: Record<string, string> = {}
  const attributeValues: Record<string, unknown> = { ':isArchived': false }

  // Account filter (IN condition for multi-select)
  if (filters?.accountIds && filters.accountIds.length > 0) {
    const placeholders = filters.accountIds.map((_, i) => `:accountId${i}`).join(', ')
    conditions.push(`accountId IN (${placeholders})`)
    filters.accountIds.forEach((id, i) => {
      attributeValues[`:accountId${i}`] = id
    })
  }

  // Category filter (IN condition + optional uncategorized)
  if (filters?.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map((_, i) => `:categoryId${i}`).join(', ')
    const categoryCondition = `categoryId IN (${placeholders})`

    if (filters.includeUncategorized) {
      // Include categories OR uncategorized
      conditions.push(`(${categoryCondition} OR attribute_not_exists(categoryId))`)
    } else {
      conditions.push(categoryCondition)
    }

    filters.categoryIds.forEach((id, i) => {
      attributeValues[`:categoryId${i}`] = id
    })
  } else if (filters?.includeUncategorized) {
    // Only uncategorized (no specific categories selected)
    conditions.push('attribute_not_exists(categoryId)')
  }

  // Type filter (IN condition for multi-select)
  if (filters?.types && filters.types.length > 0) {
    attributeNames['#type'] = 'type' // Reserved word, use attribute name
    const placeholders = filters.types.map((_, i) => `:type${i}`).join(', ')
    conditions.push(`#type IN (${placeholders})`)
    filters.types.forEach((type, i) => {
      attributeValues[`:type${i}`] = type
    })
  }

  return {
    expression: conditions.join(' AND '),
    attributeNames,
    attributeValues,
  }
}
```

---

### Step 2.2: Update findActiveByUserId Method

**File**: `backend/src/repositories/TransactionRepository.ts`

**Action**: Add filters parameter and implement filtering logic

```typescript
async findActiveByUserId(
  userId: string,
  pagination?: PaginationInput,
  filters?: TransactionFilterInput  // ADD THIS PARAMETER
): Promise<TransactionConnection> {
  if (!userId) {
    throw new TransactionRepositoryError(
      'User ID is required',
      'INVALID_USER_ID'
    )
  }

  const first = pagination?.first || DEFAULT_PAGE_SIZE
  const after = pagination?.after

  if (first < MIN_PAGE_SIZE || first > MAX_PAGE_SIZE) {
    throw new TransactionRepositoryError(
      `First parameter must be between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`,
      'INVALID_PAGINATION'
    )
  }

  try {
    // SELECT INDEX: Use UserDateIndex when date filters present, else UserCreatedAtIndex
    const indexName = filters?.dateAfter || filters?.dateBefore
      ? 'UserDateIndex'
      : 'UserCreatedAtIndex'

    // BUILD KEY CONDITION EXPRESSION
    let keyConditionExpression = 'userId = :userId'
    const keyAttributeValues: Record<string, unknown> = { ':userId': userId }
    const keyAttributeNames: Record<string, string> = {}

    // Add date range to KeyConditionExpression if filtering by date
    if (indexName === 'UserDateIndex' && (filters?.dateAfter || filters?.dateBefore)) {
      if (filters.dateAfter && filters.dateBefore) {
        keyConditionExpression += ' AND #date BETWEEN :dateAfter AND :dateBefore'
        keyAttributeValues[':dateAfter'] = filters.dateAfter
        keyAttributeValues[':dateBefore'] = filters.dateBefore
        keyAttributeNames['#date'] = 'date'
      } else if (filters.dateAfter) {
        keyConditionExpression += ' AND #date >= :dateAfter'
        keyAttributeValues[':dateAfter'] = filters.dateAfter
        keyAttributeNames['#date'] = 'date'
      } else if (filters.dateBefore) {
        keyConditionExpression += ' AND #date <= :dateBefore'
        keyAttributeValues[':dateBefore'] = filters.dateBefore
        keyAttributeNames['#date'] = 'date'
      }
    }

    // BUILD FILTER EXPRESSION (account, category, type filters)
    const filterExpr = this.buildFilterExpression(filters)

    // MERGE ATTRIBUTE NAMES AND VALUES
    const expressionAttributeNames = {
      ...keyAttributeNames,
      ...filterExpr.attributeNames,
    }
    const expressionAttributeValues = {
      ...keyAttributeValues,
      ...filterExpr.attributeValues,
    }

    // EXECUTE QUERY
    const { items: transactions, hasNextPage } = await paginateQuery<Transaction>({
      client: this.client,
      params: {
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        FilterExpression: filterExpr.expression,
        ...(Object.keys(expressionAttributeNames).length > 0 && {
          ExpressionAttributeNames: expressionAttributeNames,
        }),
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false, // Descending order (newest first)
        ...(after && {
          ExclusiveStartKey: {
            userId: userId,
            id: decodeCursor(after).id,
            [indexName === 'UserDateIndex' ? 'date' : 'createdAt']:
              decodeCursor(after).createdAt,
          },
        }),
      },
      options: { pageSize: first },
    })

    // BUILD RESPONSE
    const edges: TransactionEdge[] = transactions.map((transaction) => ({
      node: transaction,
      cursor: encodeCursor(transaction),
    }))

    const pageInfo: PageInfo = {
      hasNextPage,
      hasPreviousPage: !!after,
      startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
    }

    const totalCount = await this.countActiveTransactions(userId, filters)

    return {
      edges,
      pageInfo,
      totalCount,
    }
  } catch (error) {
    if (error instanceof TransactionRepositoryError) {
      throw error
    }

    console.error('Error finding paginated transactions:', error)
    throw new TransactionRepositoryError(
      'Failed to find paginated transactions',
      'QUERY_FAILED',
      error
    )
  }
}
```

---

### Step 2.3: Update Count Method (Optional but Recommended)

**File**: `backend/src/repositories/TransactionRepository.ts`

**Action**: Update countActiveTransactions to support filters

```typescript
private async countActiveTransactions(
  userId: string,
  filters?: TransactionFilterInput  // ADD THIS PARAMETER
): Promise<number> {
  try {
    const filterExpr = this.buildFilterExpression(filters)

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'UserCreatedAtIndex',
      KeyConditionExpression: 'userId = :userId',
      FilterExpression: filterExpr.expression,
      ...(Object.keys(filterExpr.attributeNames).length > 0 && {
        ExpressionAttributeNames: filterExpr.attributeNames,
      }),
      ExpressionAttributeValues: {
        ':userId': userId,
        ...filterExpr.attributeValues,
      },
      Select: 'COUNT',
    })

    const result = await this.client.send(command)
    return result.Count || 0
  } catch (error) {
    console.error('Error getting active transaction count:', error)
    throw new TransactionRepositoryError(
      'Failed to get active transaction count',
      'QUERY_FAILED',
      error
    )
  }
}
```

**Test**: Write unit tests for buildFilterExpression with various filter combinations

---

## Phase 3: Backend Service Layer

### Step 3.1: Update Service Method Signature

**File**: `backend/src/services/TransactionService.ts`

**Action**: Add filters parameter to getTransactionsByUser

```typescript
async getTransactionsByUser(
  userId: string,
  pagination?: PaginationInput,
  filters?: TransactionFilterInput  // ADD THIS PARAMETER
): Promise<TransactionConnection> {
  // DATE FORMAT VALIDATION (if date filters provided)
  if (filters?.dateAfter) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateAfter)) {
      throw new BusinessError('dateAfter must be in YYYY-MM-DD format')
    }
  }
  if (filters?.dateBefore) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.dateBefore)) {
      throw new BusinessError('dateBefore must be in YYYY-MM-DD format')
    }
  }

  // PASS FILTERS TO REPOSITORY
  return this.transactionRepository.findActiveByUserId(userId, pagination, filters)
}
```

**Test**: Unit test date format validation

---

## Phase 4: Backend Resolver Layer

### Step 4.1: Add Zod Validation Schema

**File**: `backend/src/resolvers/transactionResolvers.ts`

**Action**: Define transactionFilterInputSchema at top of file

```typescript
import { z } from 'zod'

// ADD THIS SCHEMA
const transactionFilterInputSchema = z.object({
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

### Step 4.2: Update Transactions Resolver

**File**: `backend/src/resolvers/transactionResolvers.ts`

**Action**: Add filters parameter and validation

```typescript
transactions: async (
  _parent: unknown,
  args: { pagination?: unknown; filters?: unknown },  // ADD filters
  context: GraphQLContext
) => {
  // VALIDATE PAGINATION
  const validatedPagination = paginationInputSchema.parse(args.pagination)

  // VALIDATE FILTERS (NEW)
  const validatedFilters = transactionFilterInputSchema.parse(args.filters)

  // AUTHENTICATE
  const user = await getAuthenticatedUser(context)

  // CALL SERVICE WITH FILTERS
  return context.transactionService.getTransactionsByUser(
    user.id,
    validatedPagination,
    validatedFilters  // PASS FILTERS
  )
},
```

**Test**: Test resolver with various filter inputs, verify Zod validation

---

## Phase 5: Frontend Schema Sync & Types

### Step 5.1: Sync GraphQL Schema

**Directory**: `frontend/`

**Commands**:
```bash
cd frontend
npm run codegen:sync-schema  # Syncs schema from backend
npm run codegen              # Generates TypeScript types
```

**Verify**: Check `frontend/src/__generated__/graphql-types.ts` contains TransactionFilterInput

---

### Step 5.2: Update GraphQL Query

**File**: `frontend/src/graphql/transactions.ts`

**Action**: Add filters parameter to query

```typescript
import { gql } from '@apollo/client/core'

export const GET_TRANSACTIONS_PAGINATED = gql`
  query GetTransactionsPaginated(
    $pagination: PaginationInput
    $filters: TransactionFilterInput  # ADD THIS LINE
  ) {
    transactions(pagination: $pagination, filters: $filters) {  # ADD filters argument
      edges {
        node {
          id
          accountId
          categoryId
          type
          amount
          currency
          date
          description
          transferId
          createdAt
          updatedAt
          account {
            id
            name
            currency
          }
          category {
            id
            name
            type
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`
```

**Test**: Run `npm run codegen` again to regenerate composable with filters support

---

## Phase 6: Frontend Filter State Management

### Step 6.1: Create useTransactionFilters Composable

**File**: `frontend/src/composables/useTransactionFilters.ts` (NEW FILE)

**Action**: Create filter state management composable

```typescript
import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { TransactionFilterInput, TransactionType } from '@/__generated__/graphql-types'

export interface TransactionFiltersState {
  // UI State (selected but not yet applied)
  selectedAccountIds: Ref<string[]>
  selectedCategoryIds: Ref<string[]>
  includeUncategorized: Ref<boolean>
  dateAfter: Ref<string | null>
  dateBefore: Ref<string | null>
  selectedTypes: Ref<TransactionType[]>

  // Query State (actually applied)
  appliedFilters: Ref<TransactionFilterInput | null>

  // Computed
  hasSelectedFilters: ComputedRef<boolean>
  hasAppliedFilters: ComputedRef<boolean>

  // Methods
  applyFilters: () => void
  clearFilters: () => void
  resetToApplied: () => void
}

export function useTransactionFilters(): TransactionFiltersState {
  // UI State
  const selectedAccountIds = ref<string[]>([])
  const selectedCategoryIds = ref<string[]>([])
  const includeUncategorized = ref(false)
  const dateAfter = ref<string | null>(null)
  const dateBefore = ref<string | null>(null)
  const selectedTypes = ref<TransactionType[]>([])

  // Query State
  const appliedFilters = ref<TransactionFilterInput | null>(null)

  // Computed
  const hasSelectedFilters = computed(() => {
    return (
      selectedAccountIds.value.length > 0 ||
      selectedCategoryIds.value.length > 0 ||
      includeUncategorized.value ||
      dateAfter.value !== null ||
      dateBefore.value !== null ||
      selectedTypes.value.length > 0
    )
  })

  const hasAppliedFilters = computed(() => {
    return appliedFilters.value !== null
  })

  // Apply selected filters to query
  function applyFilters() {
    const hasFilters = hasSelectedFilters.value

    appliedFilters.value = hasFilters
      ? {
          accountIds: selectedAccountIds.value.length > 0 ? selectedAccountIds.value : undefined,
          categoryIds: selectedCategoryIds.value.length > 0 ? selectedCategoryIds.value : undefined,
          includeUncategorized: includeUncategorized.value || undefined,
          dateAfter: dateAfter.value || undefined,
          dateBefore: dateBefore.value || undefined,
          types: selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
        }
      : null
  }

  // Clear all selected filters
  function clearFilters() {
    selectedAccountIds.value = []
    selectedCategoryIds.value = []
    includeUncategorized.value = false
    dateAfter.value = null
    dateBefore.value = null
    selectedTypes.value = []
  }

  // Reset selected to match applied (cancel changes)
  function resetToApplied() {
    if (appliedFilters.value) {
      selectedAccountIds.value = appliedFilters.value.accountIds || []
      selectedCategoryIds.value = appliedFilters.value.categoryIds || []
      includeUncategorized.value = appliedFilters.value.includeUncategorized || false
      dateAfter.value = appliedFilters.value.dateAfter || null
      dateBefore.value = appliedFilters.value.dateBefore || null
      selectedTypes.value = appliedFilters.value.types || []
    } else {
      clearFilters()
    }
  }

  return {
    selectedAccountIds,
    selectedCategoryIds,
    includeUncategorized,
    dateAfter,
    dateBefore,
    selectedTypes,
    appliedFilters,
    hasSelectedFilters,
    hasAppliedFilters,
    applyFilters,
    clearFilters,
    resetToApplied,
  }
}
```

---

### Step 6.2: Update useTransactions Composable

**File**: `frontend/src/composables/useTransactions.ts`

**Action**: Add filters support

```typescript
import { useGetTransactionsPaginatedQuery } from '@/__generated__/vue-apollo'
import type { TransactionFilterInput } from '@/__generated__/graphql-types'

export function useTransactions(options?: {
  filters?: TransactionFilterInput | null  // ADD THIS
  onTransactionCreated?: () => Promise<void> | void
  // ... other options
}) {
  // Use filters in query variables
  const { result, loading, error, refetch, fetchMore } = useGetTransactionsPaginatedQuery(
    () => ({
      pagination: {},
      filters: options?.filters || undefined,  // PASS FILTERS
    }),
    () => ({ fetchPolicy: 'cache-and-network' })
  )

  // Rest of implementation stays the same...
}
```

---

## Phase 7: Frontend UI Components

### Step 7.1: Create TransactionFilterBar Component

**File**: `frontend/src/components/TransactionFilterBar.vue` (NEW FILE)

**Action**: Create filter UI component

```vue
<template>
  <v-card class="transaction-filter-bar pa-4 mb-4">
    <v-card-title class="text-h6 pa-0 mb-4">Transaction Filters</v-card-title>

    <v-row>
      <!-- Account Filter -->
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="filters.selectedAccountIds.value"
          :items="accounts"
          item-title="name"
          item-value="id"
          label="Account"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          hint="Select one or more accounts"
          persistent-hint
        />
      </v-col>

      <!-- Category Filter -->
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="filters.selectedCategoryIds.value"
          :items="categoryOptions"
          item-title="name"
          item-value="id"
          label="Category"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          hint="Select one or more categories"
          persistent-hint
        />
      </v-col>

      <!-- Date After -->
      <v-col cols="12" sm="6" md="2">
        <v-text-field
          v-model="filters.dateAfter.value"
          type="date"
          label="From Date"
          :disabled="loading"
          clearable
          hint="Inclusive"
          persistent-hint
        />
      </v-col>

      <!-- Date Before -->
      <v-col cols="12" sm="6" md="2">
        <v-text-field
          v-model="filters.dateBefore.value"
          type="date"
          label="To Date"
          :disabled="loading"
          clearable
          hint="Inclusive"
          persistent-hint
        />
      </v-col>

      <!-- Transaction Type Filter -->
      <v-col cols="12" sm="6" md="2">
        <v-select
          v-model="filters.selectedTypes.value"
          :items="transactionTypeOptions"
          item-title="label"
          item-value="value"
          label="Type"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          hint="Select one or more types"
          persistent-hint
        />
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12">
        <v-checkbox
          v-model="filters.includeUncategorized.value"
          label="Include uncategorized transactions"
          :disabled="loading"
          density="compact"
          hide-details
        />
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" class="d-flex gap-2">
        <v-btn
          color="primary"
          @click="handleApply"
          :disabled="loading"
        >
          Apply Filters
        </v-btn>
        <v-btn
          variant="outlined"
          @click="handleClear"
          :disabled="loading || !filters.hasSelectedFilters.value"
        >
          Clear Filters
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Account, Category } from '@/__generated__/graphql-types'
import type { TransactionFiltersState } from '@/composables/useTransactionFilters'

interface Props {
  accounts: Account[]
  categories: Category[]
  filters: TransactionFiltersState
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  apply: []
  clear: []
}>()

// Add "Uncategorized" option to categories
const categoryOptions = computed(() => {
  return [...props.categories]
})

// Transaction type options
const transactionTypeOptions = [
  { label: 'Income', value: 'INCOME' },
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Transfer In', value: 'TRANSFER_IN' },
  { label: 'Transfer Out', value: 'TRANSFER_OUT' },
]

function handleApply() {
  props.filters.applyFilters()
  emit('apply')
}

function handleClear() {
  props.filters.clearFilters()
  props.filters.applyFilters() // Apply empty filters
  emit('clear')
}
</script>
```

---

### Step 7.2: Integrate Filter Bar into Transactions Page

**File**: `frontend/src/views/TransactionsPage.vue` (or wherever transactions are displayed)

**Action**: Add filter bar and wire up filters

```vue
<template>
  <v-container>
    <h1>Transactions</h1>

    <!-- ADD FILTER BAR -->
    <TransactionFilterBar
      :accounts="accounts"
      :categories="categories"
      :filters="transactionFilters"
      :loading="transactionsLoading"
      @apply="handleFiltersApplied"
      @clear="handleFiltersCleared"
    />

    <!-- Existing transaction list -->
    <TransactionList
      :transactions="transactions"
      :loading="transactionsLoading"
      :has-next-page="hasNextPage"
      @load-more="loadMore"
    />
  </v-container>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import { useTransactionFilters } from '@/composables/useTransactionFilters'
import { useAccounts } from '@/composables/useAccounts'
import { useCategories } from '@/composables/useCategories'
import TransactionFilterBar from '@/components/TransactionFilterBar.vue'
import TransactionList from '@/components/TransactionList.vue'

// Filter state
const transactionFilters = useTransactionFilters()

// Fetch accounts and categories for filter options
const { accounts } = useAccounts()
const { categories } = useCategories()

// Fetch transactions with filters
const {
  transactions,
  loading: transactionsLoading,
  hasNextPage,
  loadMore,
  refetch,
} = useTransactions({
  filters: transactionFilters.appliedFilters,  // PASS APPLIED FILTERS
})

// Watch applied filters and refetch when they change
watch(() => transactionFilters.appliedFilters.value, () => {
  refetch()
}, { deep: true })

function handleFiltersApplied() {
  // Filters already applied via applyFilters() in TransactionFilterBar
  // Refetch triggered automatically by watcher
}

function handleFiltersCleared() {
  // Filters already cleared and applied
  // Refetch triggered automatically by watcher
}
</script>
```

---

## Phase 8: Testing

### Step 8.1: Backend Unit Tests

**File**: `backend/src/repositories/__tests__/TransactionRepository.test.ts`

**Action**: Add filter combination tests

```typescript
describe('TransactionRepository - Filtering', () => {
  it('filters by account IDs', async () => {
    const filters: TransactionFilterInput = {
      accountIds: ['account-uuid-1', 'account-uuid-2'],
    }
    const result = await repository.findActiveByUserId('user-id', undefined, filters)
    // Assert results only contain transactions from specified accounts
  })

  it('filters by date range', async () => {
    const filters: TransactionFilterInput = {
      dateAfter: '2024-03-01',
      dateBefore: '2024-03-31',
    }
    const result = await repository.findActiveByUserId('user-id', undefined, filters)
    // Assert all transactions are within March 2024
  })

  it('filters by transaction types', async () => {
    const filters: TransactionFilterInput = {
      types: ['EXPENSE'],
    }
    const result = await repository.findActiveByUserId('user-id', undefined, filters)
    // Assert all transactions are EXPENSE type
  })

  it('combines all filters', async () => {
    const filters: TransactionFilterInput = {
      accountIds: ['account-uuid-1'],
      categoryIds: ['category-uuid-1'],
      includeUncategorized: true,
      dateAfter: '2024-01-01',
      dateBefore: '2024-12-31',
      types: ['EXPENSE'],
    }
    const result = await repository.findActiveByUserId('user-id', undefined, filters)
    // Assert results match ALL filter criteria
  })

  it('handles invalid date range gracefully', async () => {
    const filters: TransactionFilterInput = {
      dateAfter: '2024-12-31',
      dateBefore: '2024-01-01',
    }
    const result = await repository.findActiveByUserId('user-id', undefined, filters)
    expect(result.edges).toHaveLength(0)
  })
})
```

---

### Step 8.2: Frontend Component Tests

**File**: `frontend/src/components/__tests__/TransactionFilterBar.spec.ts`

**Action**: Test filter UI interactions

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionFilterBar from '@/components/TransactionFilterBar.vue'
import { useTransactionFilters } from '@/composables/useTransactionFilters'

describe('TransactionFilterBar', () => {
  it('renders all filter inputs', () => {
    const filters = useTransactionFilters()
    const wrapper = mount(TransactionFilterBar, {
      props: { accounts: [], categories: [], filters, loading: false },
    })

    expect(wrapper.find('[label="Account"]').exists()).toBe(true)
    expect(wrapper.find('[label="Category"]').exists()).toBe(true)
    expect(wrapper.find('[label="From Date"]').exists()).toBe(true)
    expect(wrapper.find('[label="To Date"]').exists()).toBe(true)
    expect(wrapper.find('[label="Type"]').exists()).toBe(true)
  })

  it('emits apply event when Apply button clicked', async () => {
    const filters = useTransactionFilters()
    const wrapper = mount(TransactionFilterBar, {
      props: { accounts: [], categories: [], filters, loading: false },
    })

    await wrapper.find('button:contains("Apply")').trigger('click')
    expect(wrapper.emitted('apply')).toBeTruthy()
  })

  it('clears filters when Clear button clicked', async () => {
    const filters = useTransactionFilters()
    filters.selectedAccountIds.value = ['account-1']

    const wrapper = mount(TransactionFilterBar, {
      props: { accounts: [], categories: [], filters, loading: false },
    })

    await wrapper.find('button:contains("Clear")').trigger('click')
    expect(filters.selectedAccountIds.value).toHaveLength(0)
  })
})
```

---

### Step 8.3: E2E Testing

**Manual Test Scenarios**:
1. Filter by single account → verify results
2. Filter by multiple accounts → verify results
3. Filter by date range → verify results
4. Filter by transaction type → verify results
5. Combine all filters → verify results
6. Clear filters → verify all transactions shown
7. Click Load More with filters active → verify additional matching transactions loaded

---

## Deployment Checklist

### Backend Deployment

- [ ] Run all tests: `cd backend && npm test`
- [ ] Build backend: `npm run build`
- [ ] Build Lambda bundle: `npm run build:bundle`
- [ ] Deploy backend CDK: `cd ../backend-cdk && npm run deploy`
- [ ] Verify GraphQL Playground shows new filters parameter

### Frontend Deployment

- [ ] Sync schema: `cd frontend && npm run codegen:sync-schema`
- [ ] Generate types: `npm run codegen`
- [ ] Run all tests: `npm test`
- [ ] Type check: `npm run type-check`
- [ ] Build frontend: `npm run build`
- [ ] Deploy frontend: `cd ../frontend-cdk && npm run deploy`
- [ ] Upload assets: `./deploy.sh` (from root)

### Verification

- [ ] Test filtering in production
- [ ] Verify performance (<1s response time)
- [ ] Check CloudWatch logs for errors
- [ ] Monitor DynamoDB read capacity

---

## Rollback Plan

If issues arise after deployment:

1. **Frontend Rollback**: Deploy previous frontend version (backend remains backward compatible)
2. **Backend Rollback**: Revert backend deployment (filters parameter is optional, so existing frontend continues working)

---

## Performance Monitoring

After deployment, monitor:
- **Query latency**: CloudWatch Insights on Lambda execution time
- **DynamoDB RCU**: Check consumed read capacity units
- **Error rates**: Monitor GraphQL errors in CloudWatch

Expected metrics:
- p50 latency: <50ms
- p95 latency: <200ms
- RCU per query: 1-5

---

## Troubleshooting

**Problem**: Filters not working
- Check browser console for GraphQL errors
- Verify schema sync completed successfully
- Check backend logs for validation errors

**Problem**: Slow query performance
- Check which index is being used (UserDateIndex vs UserCreatedAtIndex)
- Verify date filters are formatted correctly (YYYY-MM-DD)
- Check transaction count (should be <10k per user)

**Problem**: Type errors after schema sync
- Re-run `npm run codegen` in frontend
- Restart TypeScript server in IDE
- Clear `node_modules/.cache` and rebuild

---

## Next Steps

After successful implementation:
1. Add amount range filtering (Phase 2)
2. Add description text search (Phase 2)
3. Add saved filter presets (Phase 2)
4. Implement filter-based analytics (Phase 2)
