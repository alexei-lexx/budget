# Quickstart: Display Deleted Account/Category Names Implementation Guide

**Phase**: 1 - Design
**Date**: 2025-10-27
**Audience**: Backend and Frontend developers implementing this feature

## Quick Summary

Implement the ability to show original account and category names on transaction cards even after those entities are deleted. This involves:

1. **Backend**: Expose `isArchived` field + add `includeArchived` parameter to queries
2. **Frontend**: Update queries, composables, and add strikethrough styling
3. **No data migration or database changes required**

**Estimated Effort**: 2-3 development days (backend + frontend + testing)

## Implementation Sequence

### Phase 1: Backend Schema Changes (1-2 hours)

#### Step 1.1: Update GraphQL Schema

**File**: `backend/src/schema.graphql`

Add `isArchived: Boolean!` field to Account type:
```graphql
type Account {
  id: ID!
  name: String!
  currency: String!
  initialBalance: Float!
  isArchived: Boolean!  # ← ADD THIS
}
```

Add `isArchived: Boolean!` field to Category type:
```graphql
type Category {
  id: ID!
  name: String!
  type: String!
  isArchived: Boolean!  # ← ADD THIS
}
```

Add `includeArchived` parameter to Query type:
```graphql
type Query {
  accounts(includeArchived: Boolean = false): [Account!]!
  categories(includeArchived: Boolean = false): [Category!]!
}
```

### Phase 2: Backend Repository Updates (1-2 hours)

#### Step 2.1: Update AccountRepository

**File**: `backend/src/repositories/AccountRepository.ts`

Add `includeArchived` option to `findByUserId` method:

```typescript
async findByUserId(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<Account[]> {
  const includeArchived = options?.includeArchived ?? false;

  const params = {
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  };

  // Add filter for archived status if not including them
  if (!includeArchived) {
    params.FilterExpression = 'isArchived = :false';
    params.ExpressionAttributeValues[':false'] = false;
  }

  const result = await this.dynamoDb.query(params).promise();
  return result.Items.map(item => this.mapFromDb(item));
}
```

#### Step 2.2: Update CategoryRepository

**File**: `backend/src/repositories/CategoryRepository.ts`

Same pattern as AccountRepository - add `includeArchived` option:

```typescript
async findByUserId(
  userId: string,
  options?: { includeArchived?: boolean }
): Promise<Category[]> {
  const includeArchived = options?.includeArchived ?? false;

  // Implementation follows same pattern as AccountRepository
  // ...
}
```

### Phase 3: Backend Resolver Updates (1 hour)

#### Step 3.1: Update Account Query Resolver

**File**: `backend/src/resolvers/account.ts`

Pass `includeArchived` parameter to repository:

```typescript
// In accounts query resolver
const accountsResolver = async (
  _: any,
  args: { includeArchived?: boolean },
  ctx: GraphQLContext
) => {
  const includeArchived = args.includeArchived ?? false;
  return ctx.accountRepository.findByUserId(ctx.auth.userId, { includeArchived });
};
```

#### Step 3.2: Update Category Query Resolver

**File**: `backend/src/resolvers/category.ts`

Same pattern for categories:

```typescript
// In categories query resolver
const categoriesResolver = async (
  _: any,
  args: { includeArchived?: boolean },
  ctx: GraphQLContext
) => {
  const includeArchived = args.includeArchived ?? false;
  return ctx.categoryRepository.findByUserId(ctx.auth.userId, { includeArchived });
};
```

### Phase 4: Backend Testing (1-2 hours)

#### Step 4.1: Add Repository Tests

**File**: `backend/tests/repositories/AccountRepository.test.ts`

```typescript
describe('AccountRepository.findByUserId', () => {
  test('should exclude archived by default', async () => {
    // Create active account
    // Create archived account
    // Query without includeArchived parameter
    // Verify only active account returned
  });

  test('should include archived when includeArchived=true', async () => {
    // Create active account
    // Create archived account
    // Query with includeArchived: true
    // Verify both accounts returned
  });
});
```

#### Step 4.2: Test GraphQL Queries

**File**: `backend/tests/resolvers/account.test.ts`

```typescript
describe('accounts query', () => {
  test('should filter out archived by default', async () => {
    const result = await graphql(schema, `
      query {
        accounts {
          id
          name
          isArchived
        }
      }
    `, null, context);

    // Verify no archived accounts in result
  });

  test('should include archived when requested', async () => {
    const result = await graphql(schema, `
      query {
        accounts(includeArchived: true) {
          id
          name
          isArchived
        }
      }
    `, null, context);

    // Verify both active and archived accounts returned
  });
});
```

### Phase 5: Generate Backend Types (30 min)

#### Step 5.1: Run GraphQL CodeGen

```bash
cd backend
npm run codegen
```

This generates TypeScript types from the updated schema.

### Phase 6: Frontend GraphQL Query Updates (1 hour)

#### Step 6.1: Update GET_ACCOUNTS Query

**File**: `frontend/src/graphql/accounts.ts`

```typescript
import { gql } from '@apollo/client';

export const GET_ACCOUNTS = gql`
  query GetAccounts($includeArchived: Boolean = false) {
    accounts(includeArchived: $includeArchived) {
      id
      name
      currency
      initialBalance
      isArchived
    }
  }
`;
```

#### Step 6.2: Update GET_CATEGORIES Query

**File**: `frontend/src/graphql/categories.ts`

```typescript
import { gql } from '@apollo/client';

export const GET_CATEGORIES = gql`
  query GetCategories($includeArchived: Boolean = false) {
    categories(includeArchived: $includeArchived) {
      id
      name
      type
      isArchived
    }
  }
`;
```

### Phase 7: Frontend Composable Updates (1 hour)

#### Step 7.1: Update useAccounts Composable

**File**: `frontend/src/composables/useAccounts.ts`

```typescript
interface UseAccountsOptions {
  includeArchived?: boolean;
}

export function useAccounts(options?: UseAccountsOptions) {
  const { includeArchived = false } = options ?? {};

  const { result, loading, error } = useGetAccountsQuery({
    variables: { includeArchived },
  });

  return {
    accounts: computed(() => result.value?.accounts ?? []),
    loading,
    error,
  };
}
```

#### Step 7.2: Update useCategories Composable

**File**: `frontend/src/composables/useCategories.ts`

```typescript
interface UseCategoriesOptions {
  includeArchived?: boolean;
}

export function useCategories(options?: UseCategoriesOptions) {
  const { includeArchived = false } = options ?? {};

  const { result, loading, error } = useGetCategoriesQuery({
    variables: { includeArchived },
  });

  return {
    categories: computed(() => result.value?.categories ?? []),
    loading,
    error,
  };
}
```

### Phase 8: Frontend Type Generation (15 min)

#### Step 8.1: Sync Schema and Generate Types

```bash
cd frontend
npm run codegen:sync-schema
npm run codegen
```

Or simpler, just run dev/build which does both automatically:
```bash
npm run dev
```

### Phase 9: Update Transactions View (1-2 hours)

#### Step 9.1: Update Transactions.vue Page

**File**: `frontend/src/pages/Transactions.vue`

Update composable calls to include deleted entities:

```typescript
import { useAccounts } from '@/composables/useAccounts';
import { useCategories } from '@/composables/useCategories';

export default {
  setup() {
    // Fetch with includeArchived: true to get deleted entities for lookup
    const { accounts } = useAccounts({ includeArchived: true });
    const { categories } = useCategories({ includeArchived: true });
    const { transactions } = useTransactions();

    // Helper functions to check if entities are deleted
    const isAccountDeleted = (accountId: string) => {
      const account = accounts.value.find(a => a.id === accountId);
      return account?.isArchived ?? false;
    };

    const isCategoryDeleted = (categoryId?: string) => {
      if (!categoryId) return false;
      const category = categories.value.find(c => c.id === categoryId);
      return category?.isArchived ?? false;
    };

    return {
      transactions,
      accounts,
      categories,
      isAccountDeleted,
      isCategoryDeleted,
    };
  },
};
```

### Phase 10: Update TransactionCard Component (1 hour)

#### Step 10.1: Add Strikethrough Styling

**File**: `frontend/src/components/TransactionCard.vue`

```vue
<template>
  <div class="transaction-card">
    <!-- Account name with strikethrough if deleted -->
    <span :class="{ 'text-deleted': isAccountDeleted }">
      {{ getAccountName() }}
    </span>

    <!-- Category with strikethrough if deleted -->
    <span v-if="transaction.categoryId" :class="{ 'text-deleted': isCategoryDeleted }">
      {{ getCategoryName() }}
    </span>

    <!-- Amount and other details -->
    <span>${{ transaction.amount }}</span>
  </div>
</template>

<script>
export default {
  props: {
    transaction: { type: Object, required: true },
    accounts: { type: Array, required: true },
    categories: { type: Array, required: true },
    isAccountDeleted: { type: Boolean, required: true },
    isCategoryDeleted: { type: Boolean, required: true },
  },
  methods: {
    getAccountName() {
      const account = this.accounts.find(a => a.id === this.transaction.accountId);
      return account?.name ?? 'Unknown Account';
    },
    getCategoryName() {
      if (!this.transaction.categoryId) return '';
      const category = this.categories.find(c => c.id === this.transaction.categoryId);
      return category?.name ?? 'Unknown Category';
    },
  },
};
</script>

<style scoped>
.text-deleted {
  text-decoration: line-through;
  opacity: 0.7;
  color: rgba(0, 0, 0, 0.5);
}
</style>
```

### Phase 11: Frontend Testing (1-2 hours)

#### Step 11.1: Test Composables

**File**: `frontend/tests/composables/useAccounts.test.ts`

```typescript
describe('useAccounts', () => {
  test('should fetch without archived by default', async () => {
    const { accounts } = useAccounts();
    // Verify only active accounts
  });

  test('should include archived when requested', async () => {
    const { accounts } = useAccounts({ includeArchived: true });
    // Verify both active and archived accounts
  });
});
```

#### Step 11.2: Test Component Styling

**File**: `frontend/tests/components/TransactionCard.test.ts`

```typescript
describe('TransactionCard', () => {
  test('should apply strikethrough to deleted account', () => {
    const wrapper = mount(TransactionCard, {
      props: {
        transaction: { accountId: '123', amount: 100 },
        isAccountDeleted: true,
      },
    });

    expect(wrapper.find('.text-deleted').exists()).toBe(true);
  });

  test('should not apply strikethrough to active account', () => {
    const wrapper = mount(TransactionCard, {
      props: {
        transaction: { accountId: '123', amount: 100 },
        isAccountDeleted: false,
      },
    });

    expect(wrapper.find('.text-deleted').exists()).toBe(false);
  });
});
```

### Phase 12: Integration Testing (1-2 hours)

#### Step 12.1: End-to-End Test

```typescript
describe('Show Deleted Account/Category Names', () => {
  test('should display original account name after deletion', async () => {
    // 1. Create account
    // 2. Create transaction with account
    // 3. Delete account
    // 4. Navigate to transactions
    // 5. Verify account name shows with strikethrough
  });

  test('should display original category name after deletion', async () => {
    // Similar flow for categories
  });

  test('should handle account and category both deleted', async () => {
    // Verify both show strikethrough
  });
});
```

## Development Workflow

### Step-by-Step Development

```bash
# 1. Start with backend schema changes
# Edit backend/src/schema.graphql

# 2. Update backend code
# Edit repositories and resolvers

# 3. Test backend changes
cd backend
npm run test

# 4. Run backend codegen
npm run codegen

# 5. Sync frontend schema and run codegen
cd ../frontend
npm run codegen:sync-schema && npm run codegen

# 6. Update frontend queries
# Edit frontend/src/graphql/*.ts

# 7. Update frontend composables
# Edit frontend/src/composables/use*.ts

# 8. Update components
# Edit frontend/src/pages/Transactions.vue
# Edit frontend/src/components/TransactionCard.vue

# 9. Test frontend changes
npm run test

# 10. Start dev server to verify everything works
npm run dev
```

### Testing Locally

1. **Start backend dev server**: `cd backend && npm run dev`
2. **Start frontend dev server**: `cd frontend && npm run dev`
3. **Test in browser**:
   - Create account with transaction
   - Delete the account
   - View transactions
   - Verify original account name shows with strikethrough

## Deployment Order

**Critical**: Deploy backend BEFORE frontend

```bash
# 1. Deploy backend (schema + code changes)
cd backend-cdk
npm run deploy

# 2. Deploy frontend (updated queries + styling)
cd ../frontend-cdk
npm run deploy

# 3. Deploy frontend assets
cd ../frontend
npm run build
# ... deploy to S3
```

## Success Criteria Checklist

- [ ] Account type exposes `isArchived` field in schema
- [ ] Category type exposes `isArchived` field in schema
- [ ] `accounts` query accepts `includeArchived` parameter
- [ ] `categories` query accepts `includeArchived` parameter
- [ ] Backend repository methods filter by `isArchived` correctly
- [ ] Frontend GET_ACCOUNTS query requests `isArchived` field
- [ ] Frontend GET_CATEGORIES query requests `isArchived` field
- [ ] Composables accept `includeArchived` option
- [ ] Transactions page calls composables with `includeArchived: true`
- [ ] TransactionCard displays deleted accounts with strikethrough
- [ ] TransactionCard displays deleted categories with strikethrough
- [ ] Deleted accounts/categories don't show in normal account/category lists
- [ ] All tests pass
- [ ] Manual testing confirms feature works end-to-end

## Common Pitfalls to Avoid

1. **Forgetting isArchived in GraphQL query** - Frontend will request it but backend won't return it
2. **Forgetting to pass includeArchived to repository** - Queries won't filter correctly
3. **Using old composable signatures** - Must update useAccounts/useCategories to accept options
4. **Breaking existing queries** - Default value of false ensures backward compatibility
5. **Forgetting codegen** - Type generation won't happen automatically if you edit schema manually
6. **Deploying frontend first** - Backend must be deployed first so queries work

## Questions / Issues?

Refer to:
- `specs/007-show-deleted-names/data-model.md` - Entity definitions
- `specs/007-show-deleted-names/contracts/graphql-schema.md` - Exact schema changes
- `specs/007-show-deleted-names/research.md` - Design decisions
- `CLAUDE.md` - Project architecture and patterns
