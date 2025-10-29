# Phase 1 Data Model: Mark Deleted Accounts and Categories

**Date**: 2025-10-29
**Purpose**: Define data structures, component interfaces, and data flow for archived transaction references

## Data Flow Overview

```
GraphQL Query (Transaction)
    ↓
Apollo Client Cache
    ↓
Transactions.vue View
    ↓
Props: transaction.account.isArchived, transaction.category.isArchived
    ↓
TransactionCard.vue Component
    ↓
Conditional Styling + aria-label
    ↓
Rendered HTML with strikethrough (if archived)
```

## GraphQL Types (Existing - No Changes Required)

### TransactionEmbeddedAccount

```graphql
type TransactionEmbeddedAccount {
  id: ID!
  name: String!
  isArchived: Boolean!
}
```

**Fields**:
- `id`: Unique account identifier (UUID)
- `name`: Account name (e.g., "Checking Account", "Savings", "Credit Card")
- `isArchived`: Boolean flag indicating if account is deleted/archived

**Validation Rules**:
- `name` must not be empty when displayed
- `isArchived` is read-only from transaction perspective
- `id` uniqueness guaranteed by backend

### TransactionEmbeddedCategory

```graphql
type TransactionEmbeddedCategory {
  id: ID!
  name: String!
  isArchived: Boolean!
}
```

**Fields**:
- `id`: Unique category identifier (UUID)
- `name`: Category name (e.g., "Groceries", "Transportation", "Salary")
- `isArchived`: Boolean flag indicating if category is deleted/archived

**Validation Rules**:
- `name` must not be empty when displayed
- `isArchived` is read-only from transaction perspective
- `id` uniqueness guaranteed by backend
- `isArchived` value may be true even if category is used in multiple transactions

### Transaction (Using Embedded Types)

```graphql
type Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  # ... other fields
}
```

**Relationship**:
- Every transaction has exactly one embedded account
- Every transaction has zero or one embedded category (optional)
- Embedded objects contain current archived status at query time
- Accounts and categories may be archived without affecting stored transaction names

## Component Interface

### TransactionCard.vue Props

```typescript
interface TransactionCardProps {
  // Existing props (continue using)
  transaction: Transaction;
  isExpanded: boolean;

  // DEPRECATED (to be removed in refactor)
  accountName: string;
  categoryName?: string;

  // NEW (to be added)
  accountIsArchived: boolean;
  categoryIsArchived?: boolean;
}
```

**Migration Path**:
1. Add new `accountIsArchived` and `categoryIsArchived` props
2. Update parent (Transactions.vue) to pass archived flags
3. Modify template to use conditional styling
4. Optionally: Refactor to use full transaction object directly (future improvement)

### TransactionCard.vue Template Changes

**Current Structure**:
```vue
<h4 class="text-h6 mb-0 text-truncate">
  {{ formattedDate }} • {{ accountName
  }}<span v-if="categoryName"> • {{ categoryName }}</span>
</h4>
```

**New Structure**:
```vue
<h4 class="text-h6 mb-0 text-truncate">
  {{ formattedDate }} •
  <span
    :class="{ 'account-archived': accountIsArchived }"
    :aria-label="accountIsArchived ? `Deleted: ${accountName}` : undefined"
    :title="accountIsArchived ? 'Archived account' : ''"
  >
    {{ accountName }}
  </span>
  <span v-if="categoryName">
    •
    <span
      :class="{ 'category-archived': categoryIsArchived }"
      :aria-label="categoryIsArchived ? `Deleted: ${categoryName}` : undefined"
      :title="categoryIsArchived ? 'Archived category' : ''"
    >
      {{ categoryName }}
    </span>
  </span>
</h4>
```

**Styling Classes**:
```css
<style scoped>
.account-archived,
.category-archived {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--v-theme-on-surface-variant);
}
</style>
```

## Data Flow Diagrams

### View → Component Data Flow

```
Transactions.vue
├─ Receives: Array<Transaction> from GraphQL
├─ Transforms: Maps transaction to props
│  ├─ accountName = transaction.account.name
│  ├─ accountIsArchived = transaction.account.isArchived
│  ├─ categoryName = transaction.category?.name
│  └─ categoryIsArchived = transaction.category?.isArchived
└─ Passes to TransactionCard.vue
    └─ Renders with conditional styling
```

### Conditional Rendering Logic

```
For each transaction:
  account.name is always displayed
  If account.isArchived = true:
    → Add 'account-archived' CSS class
    → Set aria-label = "Deleted: [name]"
    → Set title = "Archived account"

  If category exists:
    category.name is displayed
    If category.isArchived = true:
      → Add 'category-archived' CSS class
      → Set aria-label = "Deleted: [name]"
      → Set title = "Archived category"
    Else:
      → No additional attributes
```

## State Management

**No new state required**. The feature uses:
- Existing Apollo Client cache with `isArchived` field
- Existing parent component state for `isExpanded` flag
- Conditional rendering in templates (Vue reactivity)

**Reactivity**:
- When a transaction is fetched/updated, `isArchived` flag comes from GraphQL
- Vue automatically updates component rendering when props change
- No additional watchers or computed properties needed

## Affected Components

### Primary Modification
- **TransactionCard.vue** - Add archived status props, conditional styling, accessibility attributes

### Secondary Changes
- **Transactions.vue** - Pass `accountIsArchived` and `categoryIsArchived` props to TransactionCard

### No Changes Required
- **GraphQL Queries** - Already select `isArchived` field
- **Apollo Client** - Already caches the data
- **Backend Resolvers** - No changes needed
- **Database** - No schema changes

## Styling Rules Summary

| Scenario | Visual Treatment |
|----------|-----------------|
| Account active, category active | Normal text, no styling |
| Account archived, category active | Account: strikethrough + reduced opacity |
| Account active, category archived | Category: strikethrough + reduced opacity |
| Account archived, category archived | Both: strikethrough + reduced opacity |
| No category (optional field) | Account styling rules apply |

## Accessibility Compliance

**WCAG 2.1 Level AA Requirements Met**:
- ✅ `aria-label` attributes for screen reader users ("Deleted: [name]")
- ✅ `title` attributes for hover tooltip context
- ✅ Color not the only indicator (text-decoration: line-through)
- ✅ Sufficient contrast (reduced opacity + Vuetify theme color)
- ✅ No interactive elements affected (styling-only)

**Testing Checklist**:
- [ ] Screen reader announces "Deleted: [account name]" for archived account
- [ ] Visual strikethrough clearly visible on desktop and mobile
- [ ] Hover tooltip appears with "Archived account" / "Archived category" text
- [ ] Styling persists in expanded and collapsed transaction views
- [ ] No disruption to existing transaction operations (edit, delete)
