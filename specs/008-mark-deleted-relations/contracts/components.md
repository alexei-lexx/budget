# Vue Component Contracts: TransactionCard Modifications

**Date**: 2025-10-29
**Purpose**: Define component interfaces and contract changes for archived reference display

## TransactionCard Component Contract

**File**: `frontend/src/components/transactions/TransactionCard.vue`

### Props Interface

**Current Props** (Existing):
```typescript
interface TransactionCardProps {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
  isExpanded: boolean;
}
```

**New Props** (To Add):
```typescript
interface TransactionCardProps {
  // Existing (continue using)
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
  isExpanded: boolean;

  // NEW
  accountIsArchived: boolean;
  categoryIsArchived?: boolean;
}
```

### Prop Definitions (Full Specification)

#### accountIsArchived (NEW)

```typescript
accountIsArchived: {
  type: Boolean,
  required: true,
  default: false
}
```

**Type**: `Boolean`
**Required**: Yes
**Default**: false
**Purpose**: Indicates if the transaction's account is archived/deleted
**Source**: `transaction.account.isArchived` from parent
**Example Values**:
- `true` - Account has been deleted/archived
- `false` - Account is active

#### categoryIsArchived (NEW)

```typescript
categoryIsArchived: {
  type: Boolean,
  required: false,
  default: undefined
}
```

**Type**: `Boolean | undefined`
**Required**: No (optional transaction field)
**Default**: undefined
**Purpose**: Indicates if the transaction's category is archived/deleted
**Source**: `transaction.category?.isArchived` from parent (or undefined if no category)
**Example Values**:
- `true` - Category has been deleted/archived
- `false` - Category is active
- `undefined` - Transaction has no category

### Template Changes

**Location**: Account Name Display

```vue
<!-- Before -->
{{ accountName }}

<!-- After -->
<span
  :class="{ 'account-archived': accountIsArchived }"
  :aria-label="accountIsArchived ? `Deleted: ${accountName}` : undefined"
  :title="accountIsArchived ? 'Archived account' : ''"
>
  {{ accountName }}
</span>
```

**Location**: Category Name Display (if category exists)

```vue
<!-- Before -->
<span v-if="categoryName"> • {{ categoryName }}</span>

<!-- After -->
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

### Style Changes

**Add to Scoped Styles**:

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

**CSS Properties**:
- `text-decoration: line-through` - Visual strikethrough indicator
- `opacity: 0.6` - Subtle fading to indicate inactive state
- `color: var(--v-theme-on-surface-variant)` - Vuetify theme variable for muted text color

**Justification**:
- Strikethrough: Universal symbol for deleted/inactive items
- Opacity: Reduces visual weight without removing text
- Color: Matches Vuetify Material Design system
- Combination: Redundant indicators (not color-only) for accessibility

### No Changes to

#### Component Logic
- No computed properties needed
- No watchers needed
- No methods need modification
- Props binding is all that's required

#### Event Handling
- `@click` handlers unchanged
- Edit/delete buttons unaffected
- Expansion logic unaffected

#### Other Displays
- Amount, date, description unchanged
- Action buttons unchanged
- Hover states unchanged (only styling visibility changed)

## Transactions.vue Component Changes

**File**: `frontend/src/views/Transactions.vue`

### Props Passing (Parent Component)

**Current**:
```vue
<TransactionCard
  v-for="transaction in paginatedTransactions"
  :key="transaction.id"
  :transaction="transaction"
  :account-name="transaction.account.name"
  :category-name="transaction.category?.name"
  :is-expanded="isTransactionExpanded(transaction.id)"
/>
```

**Updated**:
```vue
<TransactionCard
  v-for="transaction in paginatedTransactions"
  :key="transaction.id"
  :transaction="transaction"
  :account-name="transaction.account.name"
  :category-name="transaction.category?.name"
  :account-is-archived="transaction.account.isArchived"
  :category-is-archived="transaction.category?.isArchived"
  :is-expanded="isTransactionExpanded(transaction.id)"
/>
```

**New Props Being Passed**:
- `:account-is-archived="transaction.account.isArchived"` (Boolean)
- `:category-is-archived="transaction.category?.isArchived"` (Boolean | undefined)

**Logic**:
- `transaction.account.isArchived` - Always available from GraphQL
- `transaction.category?.isArchived` - Available if category exists, undefined otherwise
- Vue's optional chaining (?.) handles the undefined case

## Accessibility Compliance

### aria-label Implementation

**Format**: "Deleted: [name]"

**Examples**:
- Archived account named "Checking": `aria-label="Deleted: Checking"`
- Archived category named "Groceries": `aria-label="Deleted: Groceries"`

**Screen Reader Announcement**:
- Screen reader announces: "Deleted: [name]" when focused
- Provides clear context for visually impaired users

### title Attribute (Hover Tooltip)

**Format**: "Archived account" or "Archived category"

**Purpose**:
- Shows on hover for sighted users
- Provides additional context
- Works across browsers/devices

**Examples**:
- Hover on archived account name: Tooltip shows "Archived account"
- Hover on archived category name: Tooltip shows "Archived category"

## Testing Contracts

### Unit Test Scenarios

1. **Rendering with Archived Account**
   - Props: `accountIsArchived=true`
   - Expected: Account name has `account-archived` class
   - Expected: aria-label includes "Deleted: "
   - Expected: title attribute present

2. **Rendering with Active Account**
   - Props: `accountIsArchived=false`
   - Expected: Account name has no `account-archived` class
   - Expected: No aria-label attribute
   - Expected: No title attribute

3. **Rendering with Archived Category**
   - Props: `categoryIsArchived=true`
   - Expected: Category name has `category-archived` class
   - Expected: aria-label includes "Deleted: "

4. **Rendering with No Category**
   - Props: `categoryIsArchived=undefined`
   - Expected: Category span not rendered
   - Expected: Conditional v-if blocks rendering

5. **Styling Persistence in Expanded View**
   - Props: `isExpanded=true`, `accountIsArchived=true`
   - Expected: Strikethrough styling visible in expanded state
   - Expected: Accessibility attributes still present

### Visual Test Scenarios

1. **Desktop View**: Strikethrough visible, readable at 16px font
2. **Mobile View**: Strikethrough visible on smaller screens
3. **Dark Theme**: Sufficient contrast between strikethrough and background
4. **Light Theme**: Sufficient contrast between strikethrough and background

## Integration Points

### Parent Component (Transactions.vue)

**Requirement**: Pass both `accountIsArchived` and `categoryIsArchived` props
**Implementation**: Extract from transaction object passed from GraphQL
**Testing**: Verify props are correctly mapped

### GraphQL Layer

**Requirement**: Transaction query includes `isArchived` field on embedded objects
**Status**: ✅ Already implemented (verified in Phase 0)
**Testing**: No changes needed; existing tests cover this

### Backend

**Requirement**: Soft-delete pattern ensures `isArchived` is set correctly
**Status**: ✅ Already implemented
**Testing**: No changes needed; backend logic unchanged
