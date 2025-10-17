# Component Contract: CategoryCard.vue

**Version**: 2.0 (Updated for expandable card pattern)
**Date**: 2025-10-17

## Purpose

Display category information in a card format with expandable action buttons for edit and delete operations.

## Component API

### Props

```typescript
interface Props {
  category: Category;         // REQUIRED - Category data to display
  isExpanded: boolean;        // REQUIRED - Controls expanded/collapsed state
}

interface Category {
  id: string;                 // UUID
  name: string;               // Category name for display
  type: "INCOME" | "EXPENSE"; // Category type
  createdAt: string;          // ISO 8601 date string
  updatedAt: string;          // ISO 8601 date string
}
```

**Prop Validation**:
- `category`: Required, object
- `isExpanded`: Required, boolean

### Events

```typescript
interface Events {
  editCategory: [categoryId: string];      // Emitted when user clicks edit button
  deleteCategory: [categoryId: string];    // Emitted when user clicks delete button
  toggleExpand: [categoryId: string];      // Emitted when user clicks card
}
```

**Event Timing**:
- `toggleExpand`: Emitted immediately on card click (before state change)
- `editCategory`: Emitted immediately on edit button click (does not collapse card)
- `deleteCategory`: Emitted immediately on delete button click (does not collapse card)

### Slots

None

## Visual Behavior

### Collapsed State (isExpanded = false)

**Display**:
- Category name (left-aligned, truncated if too long)
- No category type badge or indicator displayed
- No action buttons visible

**Interactions**:
- Card is clickable (cursor: pointer)
- Hover effect: Slight elevation (translateY(-2px)) and shadow
- Click anywhere on card: Emits `toggleExpand`

### Expanded State (isExpanded = true)

**Display**:
- Category name (left-aligned, truncated if too long)
- Action buttons visible (Edit and Delete, right-aligned)

**Interactions**:
- Card is clickable (cursor: pointer)
- Hover effect: Disabled (no transform, shadow only)
- Click card: Emits `toggleExpand`
- Click Edit button: Emits `editCategory` (does NOT emit `toggleExpand`)
- Click Delete button: Emits `deleteCategory` (does NOT emit `toggleExpand`)

## Styling Contract

### Layout

**Collapsed**:
```
┌─────────────────────────────────────┐
│ Category Name                       │
└─────────────────────────────────────┘
```

**Expanded**:
```
┌─────────────────────────────────────┐
│ Category Name                       │
│                      [Edit] [Delete] │
└─────────────────────────────────────┘
```

### CSS Classes

- `.category-card` - Base card class
- `.category-card.expanded` - Applied when `isExpanded = true`

### Transitions

- Transform and box-shadow: 0.2s ease
- No transition on content appearance (instant show/hide)

## Accessibility

**Keyboard Navigation**:
- Card should be focusable (inherits from v-card)
- Enter/Space on card should trigger expansion (Vue default behavior)
- Tab navigation should work for Edit/Delete buttons when expanded

**Screen Readers**:
- Category name read as text content
- Action buttons have appropriate labels ("Edit" and "Delete")

**ARIA** (future enhancement - out of scope for this iteration):
- Could add `aria-expanded` attribute
- Could add `aria-controls` to link card to action buttons

## Usage Example

```vue
<template>
  <CategoryCard
    :category="category"
    :isExpanded="isExpanded(category.id)"
    @toggleExpand="handleToggleExpand"
    @editCategory="handleEditCategory"
    @deleteCategory="handleDeleteCategory"
  />
</template>

<script setup lang="ts">
import CategoryCard from '@/components/categories/CategoryCard.vue';
import type { Category } from '@/composables/useCategories';

// Props
const category: Category = {
  id: 'uuid-1',
  name: 'Groceries',
  type: 'EXPENSE',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

// State
const expandedCards = ref<Record<string, boolean>>({});

// Methods
const isExpanded = (categoryId: string): boolean => {
  return expandedCards.value[categoryId] ?? false;
};

const handleToggleExpand = (categoryId: string) => {
  expandedCards.value[categoryId] = !expandedCards.value[categoryId];
};

const handleEditCategory = (categoryId: string) => {
  // Open edit dialog
  console.log('Edit category:', categoryId);
};

const handleDeleteCategory = (categoryId: string) => {
  // Open delete confirmation dialog
  console.log('Delete category:', categoryId);
};
</script>
```

## Implementation Notes

### ActionButtons Integration

Component uses `ActionButtons.vue` component in expanded state:
```vue
<ActionButtons
  @edit="handleEditCategory"
  @delete="handleDeleteCategory"
/>
```

ActionButtons component handles event propagation stopping internally (uses `@click.stop`).

### Event Propagation

Card click handler should NOT use `@click.stop` - it should allow propagation to parent if needed. Only ActionButtons should stop propagation to prevent card collapse.

### Category Type Display

Category type (INCOME/EXPENSE) is stored in the data model but NOT displayed in the card UI. This information is used in other views (transaction forms, reports) but not in the category list view.

## Breaking Changes from v1.0

**Removed**:
- ActionDropdown component no longer used
- Always-visible action menu removed

**Added**:
- `isExpanded: boolean` prop (REQUIRED)
- `toggleExpand: [categoryId: string]` event
- Expandable behavior with conditional action buttons

**Migration**:
Parent components must:
1. Add `expandedCards` state management
2. Pass `isExpanded` prop to CategoryCard
3. Handle `toggleExpand` event
4. Update event handlers (same edit/delete events, different names)

## Testing Checklist

- [ ] Card displays category name in collapsed state
- [ ] Card displays action buttons in expanded state
- [ ] Clicking card toggles expansion (emits toggleExpand)
- [ ] Clicking edit button emits editCategory without collapsing
- [ ] Clicking delete button emits deleteCategory without collapsing
- [ ] Hover effect works in collapsed state
- [ ] Hover effect disabled in expanded state
- [ ] Multiple cards can be expanded simultaneously
- [ ] Text truncation works for long category names
- [ ] Category type not displayed in card (design decision)
