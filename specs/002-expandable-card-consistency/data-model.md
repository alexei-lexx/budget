# Data Model: Component State and Props

**Feature**: Expandable Card UI Consistency
**Date**: 2025-10-17

## Overview

This feature involves UI state management only - no persistent data model changes. The data model describes component props, state, and events for the expandable card pattern.

## Component State Model

### AccountCard Component

**Purpose**: Display account information with expandable action buttons

**Props** (Input Data):
```typescript
interface Props {
  account: Account;           // Account data from GraphQL
  isExpanded: boolean;        // Controlled by parent - determines if card is expanded
}

// Account type (existing, from useAccounts composable)
interface Account {
  id: string;                 // UUID
  name: string;               // Account name
  balance: number;            // Current balance
  currency: string;           // Currency code (e.g., "USD")
  initialBalance: number;     // Starting balance
  createdAt: string;          // ISO date string
  updatedAt: string;          // ISO date string
}
```

**Events** (Output Signals):
```typescript
interface Events {
  editAccount: [accountId: string];    // User clicked edit button
  deleteAccount: [accountId: string];  // User clicked delete button
  toggleExpand: [accountId: string];   // User clicked card to toggle expansion
}
```

**Internal State**: None - component is controlled by parent

**State Transitions**:
- Collapsed → Expanded: Parent sets `isExpanded = true` after receiving `toggleExpand` event
- Expanded → Collapsed: Parent sets `isExpanded = false` after receiving `toggleExpand` event

### CategoryCard Component

**Purpose**: Display category information with expandable action buttons

**Props** (Input Data):
```typescript
interface Props {
  category: Category;         // Category data from GraphQL
  isExpanded: boolean;        // Controlled by parent - determines if card is expanded
}

// Category type (existing, from useCategories composable)
interface Category {
  id: string;                 // UUID
  name: string;               // Category name
  type: "INCOME" | "EXPENSE"; // Category type
  createdAt: string;          // ISO date string
  updatedAt: string;          // ISO date string
}
```

**Events** (Output Signals):
```typescript
interface Events {
  editCategory: [categoryId: string];    // User clicked edit button
  deleteCategory: [categoryId: string];  // User clicked delete button
  toggleExpand: [categoryId: string];    // User clicked card to toggle expansion
}
```

**Internal State**: None - component is controlled by parent

**State Transitions**:
- Collapsed → Expanded: Parent sets `isExpanded = true` after receiving `toggleExpand` event
- Expanded → Collapsed: Parent sets `isExpanded = false` after receiving `toggleExpand` event

## Parent Component State Model

### AccountsList Component

**Purpose**: Manage list of accounts and track which cards are expanded

**State**:
```typescript
// Track expanded state for each account card by ID
const expandedCards = ref<Record<string, boolean>>({});

// Example state values:
// {}                                    // All cards collapsed (default)
// { "account-uuid-1": true }            // Account 1 expanded
// { "account-uuid-1": true,             // Multiple cards expanded
//   "account-uuid-2": true }
```

**State Operations**:
```typescript
// Toggle expansion for a specific account
const toggleExpand = (accountId: string) => {
  expandedCards.value[accountId] = !expandedCards.value[accountId];
};

// Check if account is expanded
const isExpanded = (accountId: string): boolean => {
  return expandedCards.value[accountId] ?? false;  // Default to collapsed
};
```

**Lifecycle**:
- State initialized empty on component mount
- State updated on user interaction (toggleExpand)
- State reset on component unmount (automatic)
- State NOT persisted across page reloads

### Categories View

**Purpose**: Manage list of categories and track which cards are expanded

**State**:
```typescript
// Track expanded state for each category card by ID
const expandedCards = ref<Record<string, boolean>>({});

// Example state values:
// {}                                    // All cards collapsed (default)
// { "category-uuid-1": true }           // Category 1 expanded
// { "category-uuid-1": true,            // Multiple cards expanded
//   "category-uuid-2": true }
```

**State Operations**:
```typescript
// Toggle expansion for a specific category
const toggleExpand = (categoryId: string) => {
  expandedCards.value[categoryId] = !expandedCards.value[categoryId];
};

// Check if category is expanded
const isExpanded = (categoryId: string): boolean => {
  return expandedCards.value[categoryId] ?? false;  // Default to collapsed
};
```

**Lifecycle**:
- State initialized empty on component mount
- State updated on user interaction (toggleExpand)
- State reset on component unmount (automatic)
- State NOT persisted across page reloads

## State Management Patterns

### Pattern: Controlled Component

**Description**: Child components (cards) don't manage their own expanded state. Parent controls the state and passes it down via props.

**Benefits**:
- Single source of truth (parent state)
- Easier testing (parent controls all state)
- No state synchronization issues
- Parent can implement business logic (e.g., close all expanded cards)

**Flow**:
```
User clicks card
  → Card emits 'toggleExpand' event with ID
  → Parent receives event
  → Parent updates expandedCards state
  → Vue reactivity updates card's isExpanded prop
  → Card re-renders with new expanded state
```

### Pattern: Record-based State Tracking

**Description**: Use `Record<string, boolean>` to track expanded state by item ID

**Benefits**:
- O(1) lookup time
- Memory efficient (only stores true values)
- Simple to implement and maintain
- Type-safe with TypeScript

**Alternative Patterns Rejected**:
- Array of IDs: O(n) lookups, more complex add/remove
- Set of IDs: Not natively reactive in Vue
- Individual refs: Doesn't scale

## Validation Rules

No validation rules apply to this feature as it only manages UI state. The underlying Account and Category data has validation rules enforced at the GraphQL layer (existing implementation).

## Entity Relationships

**No new relationships** - This feature only adds transient UI state that tracks which cards are expanded. No changes to Account or Category entities or their relationships.

## Scale Considerations

**Expected Scale**:
- Typical user: 5-20 accounts, 20-50 categories
- Maximum reasonable: 100 accounts, 200 categories
- Expanded cards: 0-10 simultaneously (typical user behavior)

**Memory Impact**:
- Per expanded card: ~50 bytes (UUID string + boolean)
- Worst case (100 accounts all expanded): ~5KB
- Negligible impact on application performance

**Performance**:
- State updates: O(1) - direct object property access
- Re-renders: Only affected card re-renders (Vue reactivity)
- No performance concerns for expected scale
