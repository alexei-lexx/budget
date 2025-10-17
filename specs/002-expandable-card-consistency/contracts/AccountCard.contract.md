# Component Contract: AccountCard.vue

**Version**: 2.0 (Updated for expandable card pattern)
**Date**: 2025-10-17

## Purpose

Display account information in a card format with expandable action buttons for edit and delete operations.

## Component API

### Props

```typescript
interface Props {
  account: Account;           // REQUIRED - Account data to display
  isExpanded: boolean;        // REQUIRED - Controls expanded/collapsed state
}

interface Account {
  id: string;                 // UUID
  name: string;               // Account name for display
  balance: number;            // Current account balance
  currency: string;           // Currency code (e.g., "USD", "EUR")
  initialBalance: number;     // Starting balance
  createdAt: string;          // ISO 8601 date string
  updatedAt: string;          // ISO 8601 date string
}
```

**Prop Validation**:
- `account`: Required, object
- `isExpanded`: Required, boolean

### Events

```typescript
interface Events {
  editAccount: [accountId: string];      // Emitted when user clicks edit button
  deleteAccount: [accountId: string];    // Emitted when user clicks delete button
  toggleExpand: [accountId: string];     // Emitted when user clicks card
}
```

**Event Timing**:
- `toggleExpand`: Emitted immediately on card click (before state change)
- `editAccount`: Emitted immediately on edit button click (does not collapse card)
- `deleteAccount`: Emitted immediately on delete button click (does not collapse card)

### Slots

None

## Visual Behavior

### Collapsed State (isExpanded = false)

**Display**:
- Account name (left-aligned, truncated if too long)
- Account balance with currency (right-aligned, bold)
- No action buttons visible

**Interactions**:
- Card is clickable (cursor: pointer)
- Hover effect: Slight elevation (translateY(-2px)) and shadow
- Click anywhere on card: Emits `toggleExpand`

### Expanded State (isExpanded = true)

**Display**:
- Account name (left-aligned, truncated if too long)
- Account balance with currency (right-aligned, bold)
- Action buttons visible (Edit and Delete, right-aligned)

**Interactions**:
- Card is clickable (cursor: pointer)
- Hover effect: Disabled (no transform, shadow only)
- Click card: Emits `toggleExpand`
- Click Edit button: Emits `editAccount` (does NOT emit `toggleExpand`)
- Click Delete button: Emits `deleteAccount` (does NOT emit `toggleExpand`)

## Styling Contract

### Layout

**Collapsed**:
```
┌─────────────────────────────────────┐
│ Account Name          $1,234.56 USD │
└─────────────────────────────────────┘
```

**Expanded**:
```
┌─────────────────────────────────────┐
│ Account Name          $1,234.56 USD │
│                      [Edit] [Delete] │
└─────────────────────────────────────┘
```

### CSS Classes

- `.account-card` - Base card class
- `.account-card.expanded` - Applied when `isExpanded = true`

### Transitions

- Transform and box-shadow: 0.2s ease
- No transition on content appearance (instant show/hide)

## Accessibility

**Keyboard Navigation**:
- Card should be focusable (inherits from v-card)
- Enter/Space on card should trigger expansion (Vue default behavior)
- Tab navigation should work for Edit/Delete buttons when expanded

**Screen Readers**:
- Account name and balance read as text content
- Action buttons have appropriate labels ("Edit" and "Delete")

**ARIA** (future enhancement - out of scope for this iteration):
- Could add `aria-expanded` attribute
- Could add `aria-controls` to link card to action buttons

## Usage Example

```vue
<template>
  <AccountCard
    :account="account"
    :isExpanded="isExpanded(account.id)"
    @toggleExpand="handleToggleExpand"
    @editAccount="handleEditAccount"
    @deleteAccount="handleDeleteAccount"
  />
</template>

<script setup lang="ts">
import AccountCard from '@/components/accounts/AccountCard.vue';
import type { Account } from '@/composables/useAccounts';

// Props
const account: Account = {
  id: 'uuid-1',
  name: 'Checking Account',
  balance: 1234.56,
  currency: 'USD',
  initialBalance: 1000.00,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

// State
const expandedCards = ref<Record<string, boolean>>({});

// Methods
const isExpanded = (accountId: string): boolean => {
  return expandedCards.value[accountId] ?? false;
};

const handleToggleExpand = (accountId: string) => {
  expandedCards.value[accountId] = !expandedCards.value[accountId];
};

const handleEditAccount = (accountId: string) => {
  // Open edit dialog
  console.log('Edit account:', accountId);
};

const handleDeleteAccount = (accountId: string) => {
  // Open delete confirmation dialog
  console.log('Delete account:', accountId);
};
</script>
```

## Implementation Notes

### ActionButtons Integration

Component uses `ActionButtons.vue` component in expanded state:
```vue
<ActionButtons
  @edit="handleEditAccount"
  @delete="handleDeleteAccount"
/>
```

ActionButtons component handles event propagation stopping internally (uses `@click.stop`).

### Currency Formatting

Uses existing `formatCurrency(amount, currency)` utility from `@/utils/currency`.

### Event Propagation

Card click handler should NOT use `@click.stop` - it should allow propagation to parent if needed. Only ActionButtons should stop propagation to prevent card collapse.

## Breaking Changes from v1.0

**Removed**:
- ActionDropdown component no longer used
- Always-visible action menu removed

**Added**:
- `isExpanded: boolean` prop (REQUIRED)
- `toggleExpand: [accountId: string]` event
- Expandable behavior with conditional action buttons

**Migration**:
Parent components must:
1. Add `expandedCards` state management
2. Pass `isExpanded` prop to AccountCard
3. Handle `toggleExpand` event
4. Update event handlers (same edit/delete events, different names)

## Testing Checklist

- [ ] Card displays account name and balance in collapsed state
- [ ] Card displays action buttons in expanded state
- [ ] Clicking card toggles expansion (emits toggleExpand)
- [ ] Clicking edit button emits editAccount without collapsing
- [ ] Clicking delete button emits deleteAccount without collapsing
- [ ] Hover effect works in collapsed state
- [ ] Hover effect disabled in expanded state
- [ ] Multiple cards can be expanded simultaneously
- [ ] Currency formatting matches existing pattern
- [ ] Text truncation works for long account names
