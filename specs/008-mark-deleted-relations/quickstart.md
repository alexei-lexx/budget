# Quickstart Guide: Implement Archived Account & Category Display

**For**: Implementation team
**Purpose**: Quick reference for implementing strikethrough styling for deleted accounts/categories

## Quick Summary

Add visual indicators (strikethrough + aria-label) to transaction account/category names when they are archived.

**Files to Modify**: 2
- `frontend/src/components/transactions/TransactionCard.vue`
- `frontend/src/views/Transactions.vue`

**Time Estimate**: 1-2 hours
**Complexity**: Low (UI changes only, no logic/backend changes)

---

## Implementation Checklist

### Step 1: Update TransactionCard.vue Props

**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Change**: Add two new boolean props

```diff
 interface TransactionCardProps {
   transaction: Transaction;
   accountName: string;
   categoryName?: string;
   isExpanded: boolean;
+  accountIsArchived: boolean;
+  categoryIsArchived?: boolean;
 }
```

### Step 2: Update TransactionCard.vue Template - Account Name

**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Find**: The transaction header showing account name (looks like: `{{ accountName }}`)

**Replace**:
```vue
<span
  :class="{ 'account-archived': accountIsArchived }"
  :aria-label="accountIsArchived ? `Deleted: ${accountName}` : undefined"
  :title="accountIsArchived ? 'Archived account' : ''"
>
  {{ accountName }}
</span>
```

### Step 3: Update TransactionCard.vue Template - Category Name

**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Find**: The category display (looks like: `<span v-if="categoryName"> • {{ categoryName }}</span>`)

**Replace**:
```vue
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
```

### Step 4: Add CSS Styles to TransactionCard.vue

**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Add to `<style scoped>` section**:
```css
.account-archived,
.category-archived {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--v-theme-on-surface-variant);
}
```

### Step 5: Update Transactions.vue - Pass Props

**File**: `frontend/src/views/Transactions.vue`

**Find**: Where TransactionCard is used in the template

**Current**:
```vue
<TransactionCard
  :transaction="transaction"
  :account-name="transaction.account.name"
  :category-name="transaction.category?.name"
  :is-expanded="isTransactionExpanded(transaction.id)"
/>
```

**Update to**:
```vue
<TransactionCard
  :transaction="transaction"
  :account-name="transaction.account.name"
  :category-name="transaction.category?.name"
  :account-is-archived="transaction.account.isArchived"
  :category-is-archived="transaction.category?.isArchived"
  :is-expanded="isTransactionExpanded(transaction.id)"
/>
```

### Step 6: Verify GraphQL Query Includes isArchived

**File**: `frontend/src/graphql/fragments.ts` (or queries.ts)

**Verify**: The TRANSACTION_FRAGMENT includes `isArchived` in account and category selections

**Should look like**:
```graphql
fragment TransactionFields on Transaction {
  id
  account {
    id
    name
    isArchived  # ← Must be present
  }
  category {
    id
    name
    isArchived  # ← Must be present
  }
  # ... other fields
}
```

**Status**: ✅ Already present (no changes needed)

### Step 7: Test the Implementation

**Manual Testing**:
1. Create a transaction with account "Test Account" and category "Test Category"
2. Delete the account from the accounts page
3. Go back to transactions page
4. Verify: "Test Account" displays with strikethrough
5. Verify: Hover shows "Archived account" tooltip
6. Delete the category
7. Verify: "Test Category" displays with strikethrough
8. Verify: Hover shows "Archived category" tooltip

**Accessibility Testing**:
1. Use screen reader (e.g., NVDA, JAWS)
2. Navigate to transaction with archived account
3. Verify: Screen reader announces "Deleted: Test Account"
4. Navigate to transaction with archived category
5. Verify: Screen reader announces "Deleted: Test Category"

**Visual Testing**:
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify strikethrough is visible at all sizes
5. Verify text remains readable (not too faded)

---

## Key Files Reference

| File | Action | Key Lines |
|------|--------|-----------|
| `frontend/src/components/transactions/TransactionCard.vue` | MODIFY | Props interface, Template account/category spans, Styles |
| `frontend/src/views/Transactions.vue` | MODIFY | TransactionCard binding (add 2 props) |
| `frontend/src/graphql/fragments.ts` | VERIFY | Transaction fragment (should already have isArchived) |
| `backend/src/schema.graphql` | VERIFY | TransactionEmbeddedAccount/Category types (no changes needed) |

---

## Common Issues & Solutions

### Issue 1: "accountIsArchived is undefined"
**Cause**: Parent component (Transactions.vue) not passing the prop
**Solution**: Add `:account-is-archived="transaction.account.isArchived"` to TransactionCard binding

### Issue 2: "Strikethrough doesn't show"
**Cause**: CSS class not applied or selector wrong
**Solution**: Verify `:class` binding is correct and CSS class exists in style block

### Issue 3: "aria-label doesn't work"
**Cause**: Vue template syntax error
**Solution**: Verify ternary expression is correct: `` :aria-label="archived ? `Deleted: ${name}` : undefined" ``

### Issue 4: "Category strikethrough missing"
**Cause**: `categoryIsArchived` prop not passed from parent
**Solution**: Add `:category-is-archived="transaction.category?.isArchived"` to parent binding

### Issue 5: "Styling overridden by other rules"
**Cause**: Lower CSS specificity than other transaction styles
**Solution**: Ensure `<style scoped>` is used and rules are specific enough

---

## Validation Checklist

- [ ] TransactionCard.vue props interface updated
- [ ] Account name wrapped in span with conditional styling
- [ ] Category name wrapped in span with conditional styling
- [ ] CSS classes added for archived account and category
- [ ] Transactions.vue passes accountIsArchived prop
- [ ] Transactions.vue passes categoryIsArchived prop
- [ ] aria-label attributes include "Deleted: " prefix
- [ ] title attributes show "Archived account" / "Archived category"
- [ ] Manual test: Archived account shows strikethrough
- [ ] Manual test: Archived category shows strikethrough
- [ ] Manual test: Hover tooltip appears
- [ ] Accessibility test: Screen reader announces "Deleted: "
- [ ] Mobile test: Strikethrough visible on small screens
- [ ] Code passes ESLint and Prettier
- [ ] TypeScript strict mode validation passes

---

## Rollback Plan

If issues arise:

1. **Revert TransactionCard.vue to previous commit**
   - Removes all prop, template, and style changes
   - Transaction displays return to original format

2. **Revert Transactions.vue props**
   - TransactionCard component still accepts old interface
   - Feature gracefully disabled

3. **No database or backend changes** to rollback

---

## Questions?

Refer to detailed documentation:
- **Data Model**: See `data-model.md` for full component interface
- **GraphQL**: See `contracts/graphql.md` for schema details
- **Components**: See `contracts/components.md` for detailed specifications
- **Research**: See `research.md` for technical context and decisions
