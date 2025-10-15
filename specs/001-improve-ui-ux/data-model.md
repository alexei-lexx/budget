# Data Model: Expandable Transaction Cards

**Feature**: Expandable Transaction Cards UI/UX Improvement
**Date**: 2025-10-15
**Scope**: Frontend component state only (no backend changes)

## Overview

This feature is a pure UI enhancement that does not modify the existing Transaction entity or require any backend changes. The data model consists solely of client-side component state to track UI expansion status.

## Existing Entities (Unchanged)

### Transaction
**Source**: Backend GraphQL schema, used by frontend via generated types
**Location**: `frontend/src/__generated__/graphql-types.ts`

```typescript
interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  date: string; // ISO 8601 date string
  description?: string | null;
  categoryId?: string | null;
  transferId?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**No modifications required** - Existing fields contain all data needed for display.

## New Component State

### ExpandedTransactionIds (Component-local UI state)
**Purpose**: Track which transaction cards are currently in expanded state
**Lifecycle**: Created on component mount, persists until page reload, cleared on unmount
**Location**: `frontend/src/views/Transactions.vue` (parent component)

```typescript
// State definition in Transactions.vue
const expandedTransactionIds = ref<Set<string>>(new Set());
```

**Properties**:
- **Type**: `Set<string>`
- **Contents**: Transaction IDs that are currently expanded
- **Persistence**: Session-only (not saved to localStorage or backend)
- **Scope**: Component-local, not shared across browser tabs

**Operations**:

#### Add (Expand a card)
```typescript
const expandTransaction = (transactionId: string) => {
  expandedTransactionIds.value.add(transactionId);
  // Trigger Vue reactivity
  expandedTransactionIds.value = new Set(expandedTransactionIds.value);
};
```

#### Remove (Collapse a card)
```typescript
const collapseTransaction = (transactionId: string) => {
  expandedTransactionIds.value.delete(transactionId);
  // Trigger Vue reactivity
  expandedTransactionIds.value = new Set(expandedTransactionIds.value);
};
```

#### Toggle (Switch state)
```typescript
const toggleTransactionExpand = (transactionId: string) => {
  if (expandedTransactionIds.value.has(transactionId)) {
    expandedTransactionIds.value.delete(transactionId);
  } else {
    expandedTransactionIds.value.add(transactionId);
  }
  // Trigger Vue reactivity
  expandedTransactionIds.value = new Set(expandedTransactionIds.value);
};
```

#### Check (Is card expanded?)
```typescript
const isTransactionExpanded = (transactionId: string): boolean => {
  return expandedTransactionIds.value.has(transactionId);
};
```

**Complexity**: All operations are O(1) time complexity

## Component Props (TransactionCard.vue)

### Existing Props (Unchanged)
```typescript
interface Props {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
}
```

### New Props (Added)
```typescript
interface Props {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
  isExpanded: boolean;  // NEW: Whether this card is currently expanded
}
```

**isExpanded Prop**:
- **Type**: `boolean`
- **Required**: Yes
- **Source**: Computed from parent's `expandedTransactionIds` Set
- **Purpose**: Determines whether to show expanded content (description + buttons)

## Component Events (TransactionCard.vue)

### Existing Events (Unchanged)
```typescript
interface Emits {
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
}
```

### New Events (Added)
```typescript
interface Emits {
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
  toggleExpand: [transactionId: string];  // NEW: User clicked to expand/collapse
}
```

**toggleExpand Event**:
- **Payload**: Transaction ID that was clicked
- **Triggered By**: Click on card (but not on buttons in expanded state)
- **Handler**: Parent component's `toggleTransactionExpand()` function
- **Purpose**: Allows parent to manage expansion state centrally

## State Flow

### Data Flow Diagram
```
Parent Component (Transactions.vue)
│
├─> expandedTransactionIds: Set<string>  [State]
│
├─> toggleTransactionExpand(id)          [Handler]
│   │
│   └─> Updates expandedTransactionIds
│
└─> For each transaction in list:
    │
    └─> TransactionCard
        │
        ├─ Props:
        │  ├─ transaction (from backend)
        │  └─ isExpanded (computed from Set)
        │
        └─ Events:
           └─ @toggleExpand → parent handler
```

### State Transitions

**Initial State**: All cards collapsed
```
expandedTransactionIds = Set([])
```

**User Clicks Card A**: Card A expands
```
expandedTransactionIds = Set(['transaction-a-id'])
```

**User Clicks Card B**: Card B expands (Card A remains expanded)
```
expandedTransactionIds = Set(['transaction-a-id', 'transaction-b-id'])
```

**User Clicks Card A Again**: Card A collapses (Card B remains expanded)
```
expandedTransactionIds = Set(['transaction-b-id'])
```

**User Reloads Page**: All cards collapse (state cleared)
```
expandedTransactionIds = Set([])
```

## Validation Rules

### State Validation
1. ✅ **Valid Transaction IDs Only**: Set can only contain valid transaction IDs from current transaction list
2. ✅ **No Duplicates**: Set data structure automatically prevents duplicates
3. ✅ **No Persistence**: State is intentionally transient, cleared on page reload (FR-007)

### UI Validation
1. ✅ **Click Propagation**: Clicking edit/delete buttons must not trigger expand/collapse (FR-010)
2. ✅ **Independent Cards**: Each card toggles independently (FR-006)
3. ✅ **State Persistence**: Expansion state maintained during scrolling and dialog interactions (FR-011)

## Performance Considerations

### Memory Usage
- **Per Transaction**: 36 bytes for UUID string (if expanded)
- **Typical Usage**: 5-10 expanded cards = ~200-400 bytes
- **Maximum**: With pagination showing 50 transactions, worst case 50 × 36 = 1.8 KB
- **Verdict**: Negligible memory footprint

### Lookup Performance
- **Set.has()**: O(1) average case, O(n) worst case (hash collision, extremely rare)
- **Set.add()**: O(1) average case
- **Set.delete()**: O(1) average case
- **Comparison**: Array.includes() would be O(n), making Set 10-50x faster with typical list sizes

### Reactivity Performance
- **Triggering Updates**: Creating new Set instance triggers Vue reactivity
- **Re-renders**: Only affected TransactionCard components re-render
- **Optimization**: Vue's virtual DOM efficiently handles show/hide of expanded content

## Edge Cases

### Transaction Deleted While Expanded
**Scenario**: User expands card, then deletes the transaction
**Behavior**: Transaction removed from list, ID remains in Set temporarily
**Impact**: No issue - stale ID in Set is harmless, cleared on next page load
**Mitigation**: Could add cleanup in delete handler, but not required

### Page Reload While Multiple Cards Expanded
**Scenario**: User expands 5 cards, then reloads page
**Behavior**: All cards return to collapsed state
**Impact**: Expected behavior per FR-007 (session-only persistence)
**User Experience**: Acceptable - expansion is temporary UI state, not data modification

### Very Long Description
**Scenario**: Transaction has 1000+ character description
**Behavior**: Description wraps to multiple lines when expanded (FR-012)
**Impact**: Card height increases dynamically
**Mitigation**: CSS flex layout handles automatically, no max-height needed

### Rapid Click Toggling
**Scenario**: User rapidly clicks card to toggle expand/collapse
**Behavior**: Each click updates Set and triggers re-render
**Impact**: Vue efficiently batches updates, smooth performance
**Mitigation**: No debouncing needed, native performance is sufficient

## Testing Considerations

Per user requirement: **No automated tests needed for frontend**

Manual testing will verify:
1. State correctly tracks expanded cards
2. Set operations maintain data integrity
3. Vue reactivity updates UI immediately
4. Edge cases handled gracefully

See quickstart.md for detailed testing scenarios.

## No Backend Changes

**Important**: This feature requires **zero backend modifications**:
- ❌ No new database fields
- ❌ No new GraphQL queries/mutations
- ❌ No new API endpoints
- ❌ No schema changes
- ✅ Existing Transaction entity has all required data

## Summary

| Aspect | Details |
|--------|---------|
| **New Entities** | None (UI state only) |
| **Modified Entities** | None |
| **State Location** | Parent component (Transactions.vue) |
| **State Structure** | Set<string> tracking expanded transaction IDs |
| **Props Added** | isExpanded: boolean |
| **Events Added** | toggleExpand: [transactionId: string] |
| **Persistence** | Session-only (cleared on page reload) |
| **Performance** | O(1) operations, negligible memory |
| **Backend Impact** | None |

---

**Data Model Status**: ✅ Complete - Ready for contract definition and quickstart creation
