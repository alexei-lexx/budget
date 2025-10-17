# Quickstart Guide: Expandable Card UI Consistency

**Feature**: 002-expandable-card-consistency
**Target**: Frontend developers implementing or testing the expandable card pattern
**Last Updated**: 2025-10-17

## Overview

This guide helps developers quickly understand, implement, and test the expandable card pattern for accounts and categories. This pattern was established with transaction cards and is being applied for UI consistency.

## Prerequisites

- Node.js and npm installed
- Frontend dependencies installed (`cd frontend && npm install`)
- Familiarity with Vue 3 Composition API
- Basic understanding of TypeScript

## Quick Setup

### 1. Start Development Server

```bash
cd frontend
npm run dev
```

The development server will start at `http://localhost:5173` (or next available port).

### 2. Navigate to Test Pages

**Accounts Page**: `http://localhost:5173/accounts`
**Categories Page**: `http://localhost:5173/categories`

## Implementation Checklist

### Phase 1: Update AccountCard Component

- [ ] Import ActionButtons instead of ActionDropdown
- [ ] Add `isExpanded: boolean` prop
- [ ] Add `toggleExpand` event emission
- [ ] Add click handler to v-card
- [ ] Wrap action buttons in `v-if="isExpanded"` block
- [ ] Update styles with `.expanded` class
- [ ] Test component in isolation

### Phase 2: Update AccountsList Component

- [ ] Add `expandedCards` ref with `Record<string, boolean>` type
- [ ] Implement `toggleExpand` method
- [ ] Implement `isExpanded` helper
- [ ] Pass `isExpanded` prop to AccountCard
- [ ] Handle `toggleExpand` event
- [ ] Test multiple accounts with expansion

### Phase 3: Update CategoryCard Component

- [ ] Import ActionButtons instead of ActionDropdown
- [ ] Add `isExpanded: boolean` prop
- [ ] Add `toggleExpand` event emission
- [ ] Add click handler to v-card
- [ ] Wrap action buttons in `v-if="isExpanded"` block
- [ ] Update styles with `.expanded` class
- [ ] Test component in isolation

### Phase 4: Update Categories View

- [ ] Add `expandedCards` ref with `Record<string, boolean>` type
- [ ] Implement `toggleExpand` method
- [ ] Implement `isExpanded` helper
- [ ] Pass `isExpanded` prop to CategoryCard
- [ ] Handle `toggleExpand` event
- [ ] Test multiple categories with expansion

### Phase 5: Cleanup

- [ ] Verify no components import ActionDropdown
- [ ] Remove ActionDropdown.vue file
- [ ] Test application builds without errors
- [ ] Verify all pages still work

## Code Examples

### Parent Component State Management

```typescript
// In AccountsList.vue or Categories.vue
import { ref } from 'vue';

// State
const expandedCards = ref<Record<string, boolean>>({});

// Toggle expansion
const toggleExpand = (id: string) => {
  expandedCards.value[id] = !expandedCards.value[id];
};

// Check if expanded
const isExpanded = (id: string): boolean => {
  return expandedCards.value[id] ?? false;
};
```

### Card Component Template Pattern

```vue
<template>
  <v-card
    variant="outlined"
    class="card"
    :class="{ expanded: isExpanded }"
    @click="handleCardClick"
    style="cursor: pointer"
  >
    <v-card-text class="py-3">
      <!-- Collapsed state: Always visible content -->
      <div class="d-flex align-center">
        <div class="flex-grow-1">
          <h4 class="text-h6 mb-0 text-truncate">{{ item.name }}</h4>
        </div>
        <!-- Additional content (e.g., balance for accounts) -->
      </div>

      <!-- Expanded state: Conditional action buttons -->
      <div v-if="isExpanded" class="d-flex mt-3 justify-end">
        <ActionButtons @edit="handleEdit" @delete="handleDelete" />
      </div>
    </v-card-text>
  </v-card>
</template>
```

### Card Component Script Pattern

```vue
<script setup lang="ts">
import ActionButtons from '@/components/common/ActionButtons.vue';

interface Props {
  item: Account | Category;
  isExpanded: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  editItem: [id: string];
  deleteItem: [id: string];
  toggleExpand: [id: string];
}>();

const handleCardClick = () => {
  emit('toggleExpand', props.item.id);
};

const handleEdit = () => {
  emit('editItem', props.item.id);
};

const handleDelete = () => {
  emit('deleteItem', props.item.id);
};
</script>
```

### Card Component Style Pattern

```vue
<style scoped>
.card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card.expanded:hover {
  transform: none; /* Disable hover transform when expanded */
}
</style>
```

## Testing Guide

### Manual Test Scenarios

#### Test 1: Basic Expansion
1. Navigate to accounts or categories page
2. Verify all cards are collapsed (no action buttons visible)
3. Click a card
4. Verify it expands and shows Edit/Delete buttons
5. Click the same card again
6. Verify it collapses and hides buttons

**Expected**: ✅ Card toggles between expanded and collapsed states

#### Test 2: Multiple Cards
1. Click to expand card 1
2. Click to expand card 2
3. Verify both cards remain expanded
4. Click to expand card 3
5. Verify all three cards are expanded simultaneously

**Expected**: ✅ Multiple cards can be expanded at once

#### Test 3: Action Buttons Don't Collapse
1. Click a card to expand it
2. Click the Edit button
3. Verify edit dialog opens
4. Verify card remains expanded
5. Close dialog
6. Click the Delete button
7. Verify delete dialog opens
8. Verify card remains expanded

**Expected**: ✅ Action buttons work without collapsing card

#### Test 4: Hover Effects
1. Hover over a collapsed card
2. Verify it elevates slightly with shadow
3. Click to expand the card
4. Hover over the expanded card
5. Verify elevation effect is disabled (no transform)
6. Verify shadow still appears on hover

**Expected**: ✅ Hover effects work correctly in both states

#### Test 5: Rapid Clicking
1. Click a card rapidly 5 times
2. Verify it toggles correctly each time
3. Verify no animation glitches

**Expected**: ✅ Rapid toggling works smoothly

#### Test 6: Text Truncation
1. Create an account with a very long name (50+ characters)
2. Verify name truncates with ellipsis in both states
3. Verify layout doesn't break

**Expected**: ✅ Long names are handled gracefully

#### Test 7: Empty State
1. Delete all accounts or categories
2. Verify empty state displays correctly
3. Verify no errors in console

**Expected**: ✅ Empty state works as before

#### Test 8: Navigation
1. Expand several cards
2. Navigate to a different page
3. Navigate back
4. Verify all cards are collapsed (state reset)

**Expected**: ✅ Expansion state doesn't persist across navigation

### Browser Testing Matrix

Test in the following browsers (if available):
- [ ] Chrome/Edge (Chromium-based)
- [ ] Firefox
- [ ] Safari (if on macOS)

### Responsive Testing

Test at these viewport widths:
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1280px)

Action buttons should remain functional at all sizes.

## Debugging Tips

### Card Won't Expand

**Check**:
- Parent component has `expandedCards` state
- Parent passes `isExpanded` prop to card
- Parent handles `toggleExpand` event
- Console for Vue warnings about missing props

### Action Buttons Collapse Card

**Check**:
- ActionButtons component uses `@click.stop` on buttons
- Card click handler doesn't use `@click.stop`
- Event propagation chain is correct

### Hover Effect Not Working

**Check**:
- CSS transition properties are set
- `.expanded` class is being applied correctly
- No conflicting CSS from other styles

### TypeScript Errors

**Check**:
- All props are properly typed
- Events are defined in `defineEmits<{}>`
- Account/Category types are imported correctly

## Performance Validation

After implementation, verify:
- [ ] No visible lag when expanding/collapsing
- [ ] No frame drops during animations (use browser DevTools Performance tab)
- [ ] No unnecessary re-renders (use Vue DevTools)
- [ ] Memory usage stable when expanding many cards

## Common Issues and Solutions

### Issue: Cards all collapse when list updates

**Solution**: Ensure `expandedCards` state uses stable IDs. When list data refreshes, existing IDs should remain in state.

### Issue: Expanded state persists after delete

**Solution**: Clean up `expandedCards` state when item is deleted:
```typescript
const handleDelete = (id: string) => {
  // ... delete logic ...
  delete expandedCards.value[id];
};
```

### Issue: ActionButtons styling looks different

**Solution**: Verify ActionButtons component is imported from correct path and no custom props are passed that override defaults.

## Reference Implementation

**See**: `frontend/src/components/transactions/TransactionCard.vue`

This is the reference implementation that established the expandable card pattern. When in doubt, refer to this component for correct implementation details.

## Next Steps After Implementation

1. Create a pull request with changes
2. Request code review from team
3. Test on staging environment
4. Verify visual consistency with transactions page
5. Update any user documentation if needed

## Support

If you encounter issues not covered in this guide:
1. Check the component contracts in `contracts/` directory
2. Review the research document in `research.md`
3. Compare with TransactionCard.vue implementation
4. Check the feature specification in `spec.md`
