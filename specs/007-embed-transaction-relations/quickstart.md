# Quick Start: Embed Account and Category Into Transaction GraphQL

**Feature Branch**: `007-embed-transaction-relations`
**Status**: Implementation Planning
**Estimated Scope**: 1-2 sprints

---

## Feature Overview

This feature extends the GraphQL Transaction type to embed account and category objects directly, eliminating N+1 queries and client-side data joining. Expected result: 97% query reduction (101 queries → 3 queries for 50 transactions).

### What's Changing

**Before**:
```graphql
query GetTransactions {
  transactions {
    id
    accountId       # Just ID, separate lookup required
    categoryId      # Just ID, separate lookup required
  }
  accounts { ... }  # Separate query
  categories { ... } # Separate query
}
```

**After**:
```graphql
query GetTransactions {
  transactions {
    id
    account {       # Embedded object
      id name isArchived
    }
    category {      # Embedded object (nullable)
      id name isArchived
    }
  }
  # No separate account/category queries needed!
}
```

---

## Implementation Layers

### Backend Changes (GraphQL API)

**Files to Create**:
- `backend/src/dataloaders/accountLoader.ts` - Batch load accounts
- `backend/src/dataloaders/categoryLoader.ts` - Batch load categories
- `backend/src/dataloaders/index.ts` - Export barrel

**Files to Modify**:
- `backend/src/schema.graphql` - Add new types, extend Transaction
- `backend/src/resolvers/Transaction.ts` - Add account/category field resolvers
- `backend/src/resolvers/Mutation.ts` - Add cache invalidation after mutations
- `backend/src/server.ts` - Update GraphQLContext, initialize DataLoaders
- `backend/src/resolvers/index.ts` - Export new Transaction resolvers
- `backend/package.json` - Add `dataloader` dependency

**Implementation Checklist**:
- [ ] Install `dataloader` npm package
- [ ] Create DataLoader batch functions with DynamoDB BatchGetItem
- [ ] Update GraphQL schema with new types
- [ ] Add field resolvers for Transaction.account and Transaction.category
- [ ] Initialize DataLoaders in context creation
- [ ] Invalidate cache after mutations
- [ ] Test with GraphQL Playground
- [ ] Run `npm run codegen` to update backend types

### Frontend Changes (Vue 3 Components)

**Files to Create**:
- None (use existing fragment files)

**Files to Modify**:
- `frontend/src/graphql/fragments.ts` - Update TRANSACTION_FRAGMENT with embedded fields
- `frontend/src/views/Transactions.vue` - Remove useAccounts/useCategories, remove lookup functions
- `frontend/src/components/transactions/TransactionCard.vue` - Use embedded fields directly
- `frontend/src/components/transactions/**/*.vue` - Update any other transaction components as needed
- Test files using mocked transactions

**Implementation Checklist**:
- [ ] Run `npm run codegen:sync-schema` to fetch updated schema
- [ ] Run `npm run codegen` to generate new types
- [ ] Update TRANSACTION_FRAGMENT to include account/category nested fields
- [ ] Update component prop interfaces to remove lookup function parameters
- [ ] Replace prop-passed lookup values with direct embedded access
- [ ] Remove `getAccountName()` and `getCategoryName()` helper functions
- [ ] Remove `useAccounts()` and `useCategories()` calls where only used for lookups
- [ ] Update template usage: `accountName` → `transaction.account.name`
- [ ] Update test mocks to include embedded field structure
- [ ] Test component rendering with null category
- [ ] Verify Apollo cache reactivity with embedded updates

---

## Step-by-Step Implementation

### Phase 1: Backend Setup (2-3 hours)

```bash
# 1. Install dependency
cd backend
npm install dataloader

# 2. Create DataLoaders
touch src/dataloaders/{accountLoader,categoryLoader,index}.ts
# (See implementation template below)

# 3. Update schema.graphql
# Add TransactionEmbeddedAccount and TransactionEmbeddedCategory types
# Extend Transaction with account/category fields
# Mark accountId/categoryId as @deprecated

# 4. Update server.ts context
# - Import DataLoaders
# - Add loaders to GraphQLContext interface
# - Initialize in createContext function

# 5. Add Transaction resolvers
# Create Transaction field resolvers for account and category

# 6. Update mutations for cache invalidation
# After updateAccount/deleteAccount/createTransaction, clear affected loaders

# 7. Test
npm run build
npm run dev
# Visit http://localhost:4000/graphql
# Test query with nested account/category fields
```

### Phase 2: Frontend Schema Sync & Codegen (1 hour)

```bash
# 1. Sync schema from backend
cd frontend
npm run codegen:sync-schema

# 2. Generate types
npm run codegen

# 3. Update fragments
# Update TRANSACTION_FRAGMENT to include:
# account { id name isArchived }
# category { id name isArchived }
```

### Phase 3: Component Updates (3-4 hours)

```bash
# 1. Update parent components (bottom-up)
# - TransactionCard.vue: Access transaction.account.name directly
# - Transactions.vue: Remove lookup functions and separate queries
# - Any other components using transaction data

# 2. Remove lookup helper functions
# - getAccountName()
# - getCategoryName()

# 3. Update test files
# - Mock structure now includes embedded fields
# - Update component props

# 4. Verify
npm run dev
# Test transaction list display
# Test null category handling
# Test archive state display
# Test cache updates
```

### Phase 4: Testing & Verification (2-3 hours)

```bash
# 1. Backend tests
cd backend
npm run test

# 2. Frontend tests
cd frontend
npm run test

# 3. Manual testing
cd frontend
npm run dev
# Create transaction with account and category
# Verify both display in transaction list
# Archive account/category and verify isArchived updates
# Delete category and verify null handling
# Test pagination (batch loading within page)

# 4. Performance verification
# Monitor network requests - should see 1 transaction query + 1 account batch + 1 category batch
# Compare with before (3 separate queries)
```

---

## Code Templates

### Backend: DataLoader Batch Function

```typescript
// backend/src/dataloaders/accountLoader.ts
import { BatchGetItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Account } from '../models/Account';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

export async function batchLoadAccounts(
  accountIds: readonly string[]
): Promise<(Account | null)[]> {
  if (accountIds.length === 0) return [];

  try {
    const command = new BatchGetItemCommand({
      RequestItems: {
        [process.env.ACCOUNTS_TABLE_NAME!]: {
          Keys: accountIds.map(id => ({ id: { S: id } })),
        },
      },
    });

    const response = await client.send(command);
    const items = response.Responses?.[process.env.ACCOUNTS_TABLE_NAME!] || [];
    const accounts = items.map(item => unmarshall(item) as Account);
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    return accountIds.map(id => {
      const account = accountMap.get(id);
      if (!account) {
        console.warn(`Account not found: ${id}`);
      }
      return account ?? null;
    });
  } catch (error) {
    console.error('Error batch loading accounts:', error);
    throw error;
  }
}
```

### Backend: Transaction Field Resolver

```typescript
// backend/src/resolvers/Transaction.ts
export const TransactionResolvers = {
  account: async (
    parent: Transaction,
    _args: unknown,
    context: GraphQLContext
  ): Promise<TransactionEmbeddedAccount | null> => {
    if (!parent.accountId) return null;
    const account = await context.loaders.accountLoader.load(parent.accountId);
    return account ? {
      id: account.id,
      name: account.name,
      isArchived: account.isArchived,
    } : null;
  },

  category: async (
    parent: Transaction,
    _args: unknown,
    context: GraphQLContext
  ): Promise<TransactionEmbeddedCategory | null> => {
    if (!parent.categoryId) return null;
    const category = await context.loaders.categoryLoader.load(parent.categoryId);
    return category ? {
      id: category.id,
      name: category.name,
      isArchived: category.isArchived,
    } : null;
  },
};
```

### Frontend: Updated Fragment

```graphql
# frontend/src/graphql/fragments.ts
export const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on Transaction {
    id
    type
    amount
    currency
    date
    description
    transferId
    account {
      id
      name
      isArchived
    }
    category {
      id
      name
      isArchived
    }
  }
`;
```

### Frontend: Updated Component

```vue
<!-- TransactionCard.vue -->
<template>
  <div :class="{ 'is-expanded': isExpanded }">
    <div class="transaction-row" @click="toggleExpand">
      <span class="date">{{ formattedDate }}</span>
      <span class="account" :class="{ archived: transaction.account?.isArchived }">
        {{ transaction.account?.name }}
      </span>
      <span v-if="transaction.category" class="category">
        {{ transaction.category.name }}
      </span>
      <span class="amount">{{ formattedAmount }}</span>
    </div>

    <div v-if="isExpanded" class="transaction-details">
      <p v-if="transaction.description">{{ transaction.description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Transaction } from '@/__generated__/graphql-types';

interface Props {
  transaction: Transaction;
  isExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isExpanded: false,
});

const isExpanded = ref(props.isExpanded);

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const formattedDate = computed(() => {
  const date = new Date(props.transaction.date);
  return date.toLocaleDateString();
});

const formattedAmount = computed(() => {
  return `${props.transaction.currency} ${props.transaction.amount}`;
});
</script>
```

---

## Deployment Strategy

### Coordinated Deployment (Required)

This is a **breaking change** - accountId and categoryId fields are removed from GraphQL schema.

**Deployment Order**:
1. Deploy backend with new schema and embedded fields
2. Immediately deploy frontend with updated queries and components
3. No staggered deployment (would cause runtime errors)

**Communication**:
- Notify team before deployment
- Test both together in staging
- Have rollback plan ready

---

## Verification Checklist

### Backend Verification
- [ ] Schema has TransactionEmbeddedAccount and TransactionEmbeddedCategory types
- [ ] Transaction type has `account: TransactionEmbeddedAccount!` field
- [ ] Transaction type has `category: TransactionEmbeddedCategory` field
- [ ] accountId field is marked @deprecated
- [ ] categoryId field is marked @deprecated
- [ ] Field resolvers use DataLoaders (not direct repository calls)
- [ ] GraphQL Playground query works: `{ transactions { account { name } } }`
- [ ] Query count is 3 (not 101) for 50 transactions

### Frontend Verification
- [ ] TypeScript compiles without errors
- [ ] TRANSACTION_FRAGMENT includes nested fields
- [ ] Component prop interfaces updated
- [ ] Lookup functions removed
- [ ] Template uses `transaction.account.name` (not prop-passed value)
- [ ] Null category handling works (no console errors)
- [ ] Archived account display shows isArchived flag
- [ ] Tests updated with embedded field mocks

### Performance Verification
- [ ] Network tab shows 1 transaction query (not 3 separate queries)
- [ ] GraphQL response includes embedded account/category data
- [ ] No "undefined" errors in console for lookups
- [ ] Apollo cache working: updating account updates all references

---

## Common Issues & Solutions

### Issue: "Cannot find field accountId on Query.transactions"

**Cause**: Frontend still requesting accountId field that was removed

**Solution**: Update TRANSACTION_FRAGMENT to use account.id instead

```graphql
# WRONG
fragment TransactionFields on Transaction {
  accountId        # This field no longer exists
}

# RIGHT
fragment TransactionFields on Transaction {
  account {
    id             # Access ID through embedded object
  }
}
```

---

### Issue: "account is null" in component

**Cause**: Data integrity issue - transaction references missing account

**Solution**: Use optional chaining and provide fallback

```typescript
// Good
const accountName = transaction.account?.name ?? 'Account not found';

// Bad - will crash if account is null
const accountName = transaction.account.name;
```

---

### Issue: Apollo cache not updating when account changes

**Cause**: Using direct references instead of Apollo normalized cache

**Solution**: Ensure query uses AccountFields fragment; Apollo handles normalization

```graphql
# Correct - uses fragments for normalization
fragment TransactionFields on Transaction {
  account {
    ...AccountFields
  }
}

fragment AccountFields on Account {
  id
  name
  isArchived
}
```

---

## Timeline Estimate

| Phase | Task | Hours | Notes |
|-------|------|-------|-------|
| 1 | Backend DataLoaders setup | 2-3 | Create batch functions |
| 1 | Backend schema update | 1 | GraphQL type additions |
| 1 | Backend resolvers | 1 | Field resolver implementation |
| 1 | Backend testing | 1 | GraphQL Playground tests |
| 2 | Frontend schema sync | 0.5 | Run codegen |
| 2 | Fragment updates | 0.5 | Update TRANSACTION_FRAGMENT |
| 3 | Component updates | 3-4 | Remove lookups, update templates |
| 3 | Test updates | 1-2 | Update mocks |
| 4 | Integration testing | 2-3 | End-to-end verification |
| 4 | Deployment planning | 0.5 | Coordination |
| **Total** | | **12-17 hours** | **1-2 sprints** |

---

## Next Steps

1. Review data-model.md for detailed entity definitions
2. Review contracts/graphql-schema.graphql for exact schema changes
3. Start Phase 1 (Backend) using provided code templates
4. Run `/speckit.tasks` to generate detailed task breakdown
5. Begin implementation following task order
