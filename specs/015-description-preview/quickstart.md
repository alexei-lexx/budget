# Quickstart: Transaction Description Preview Implementation

**Feature**: Transaction Description Preview in Collapsed Cards
**Component**: `frontend/src/components/transactions/TransactionCard.vue`

## Prerequisites

- Read [research.md](./research.md) for technical decisions
- Read [data-model.md](./data-model.md) to confirm no backend changes needed
- Familiarize yourself with current TransactionCard.vue implementation

## Implementation Overview

**Single file change**: Modify `TransactionCard.vue` template and computed properties.

### Changes Required

1. **Add description to collapsed header line** (lines 110-135)
2. **Apply visual de-emphasis** using Vuetify opacity class
3. **Implement conditional rendering** to hide description when expanded
4. **Maintain truncation** with existing `text-truncate` class

## Step-by-Step Implementation

### Step 1: Create Description Preview Computed Property

Add a new computed property to format the description for preview:

```typescript
// Add after existing computed properties (after line 91)
const descriptionPreview = computed(() => {
  if (!props.transaction.description) return null;

  // Normalize whitespace (convert line breaks and multiple spaces to single space)
  return props.transaction.description.replace(/\s+/g, ' ').trim();
});
```

**Rationale**: Normalizes whitespace per FR-007, ensures single-line display.

---

### Step 2: Modify Header Line Template

Update the header `<h4>` element (lines 110-135) to conditionally include description:

**Before**:
```vue
<h4 class="text-h6 mb-0 text-truncate">
  {{ formattedDate }} •
  <span :class="{ 'account-archived': transaction.account.isArchived }">
    {{ transaction.account.name }}
  </span>
  <span v-if="transaction.category">
    •
    <span :class="{ 'category-archived': transaction.category.isArchived }">
      {{ transaction.category.name }}
    </span>
  </span>
</h4>
```

**After**:
```vue
<h4 class="text-h6 mb-0 text-truncate">
  {{ formattedDate }} •
  <span
    :class="{ 'account-archived': transaction.account.isArchived }"
    :aria-label="transaction.account.isArchived ? `Deleted: ${transaction.account.name}` : undefined"
    :title="transaction.account.isArchived ? 'Deleted account' : ''"
  >
    {{ transaction.account.name }}
  </span>
  <span v-if="transaction.category">
    •
    <span
      :class="{ 'category-archived': transaction.category.isArchived }"
      :aria-label="transaction.category.isArchived ? `Deleted: ${transaction.category.name}` : undefined"
      :title="transaction.category.isArchived ? 'Deleted category' : ''"
    >
      {{ transaction.category.name }}
    </span>
  </span>
  <!-- NEW: Description preview (only in collapsed state) -->
  <span v-if="!isExpanded && descriptionPreview" class="text-opacity-70">
    • {{ descriptionPreview }}
  </span>
</h4>
```

**Key Changes**:
- Added `v-if="!isExpanded && descriptionPreview"` condition
- Applied `text-opacity-70` class for visual de-emphasis
- Used `•` delimiter for consistency
- `text-truncate` on parent `<h4>` handles ellipsis automatically

---

### Step 3: Verify Expanded State

**No changes needed** to expanded section (lines 144-162). Full description continues to display in dedicated area:

```vue
<div v-if="isExpanded" class="d-flex ga-2 mt-3">
  <!-- Description on left (top on mobile) - only shown if present -->
  <div v-if="transaction.description" class="text-body-2 flex-grow-1" style="min-width: 0">
    {{ transaction.description }}
  </div>
  <!-- Action buttons on right (bottom on mobile) -->
  <ActionButtons @edit="handleEditTransaction" @delete="handleDeleteTransaction" />
</div>
```

**Behavior**: Description hidden from header when `isExpanded=true`, remains visible in expanded section.

---

## Testing Checklist

### Manual Verification

1. **Collapsed state with description**:
   - [ ] Navigate to transactions page
   - [ ] Create transaction with description: "Test description"
   - [ ] Verify collapsed card shows: "Date • Account • Category • Test description"
   - [ ] Verify description has reduced opacity (less prominent)

2. **Collapsed state without description**:
   - [ ] Create transaction with no description
   - [ ] Verify collapsed card shows: "Date • Account • Category" (no extra delimiter)

3. **Long description truncation**:
   - [ ] Create transaction with description: "This is a very long description that should be truncated with ellipsis when it exceeds the available space in the card header line"
   - [ ] Verify ellipsis appears: "Date • Account • Category • This is a very long descrip..."
   - [ ] Verify single-line display (no wrapping)

4. **Expanded state**:
   - [ ] Click on transaction card to expand
   - [ ] Verify description disappears from header line
   - [ ] Verify header shows only: "Date • Account • Category"
   - [ ] Verify full description visible in expanded section below

5. **Toggle behavior**:
   - [ ] Collapse card by clicking again
   - [ ] Verify description reappears in header line
   - [ ] Verify no layout shift during transition

6. **Responsive behavior**:
   - [ ] Test on mobile viewport (< 600px)
   - [ ] Verify description truncates earlier on narrow screen
   - [ ] Test on desktop viewport (> 1200px)
   - [ ] Verify more description text visible on wide screen

7. **Edge cases**:
   - [ ] Test with whitespace-only description: "   " (should not display)
   - [ ] Test with special characters: "Test & <script>" (should be escaped)
   - [ ] Test with line breaks: "Line 1\nLine 2" (should normalize to "Line 1 Line 2")

---

## Performance Verification

- [ ] Open DevTools Performance tab
- [ ] Record expanding/collapsing multiple cards
- [ ] Verify frame rate stays at 60fps
- [ ] Verify no layout shift warnings in console
- [ ] Verify paint time < 16ms per frame

---

## Acceptance Criteria

**All functional requirements from spec.md must pass**:
- FR-001: Description displayed in collapsed header when populated ✓
- FR-002: Format "Account • Category • Description" ✓
- FR-003: Format "Account • Category" when description empty ✓
- FR-004: Delimiter " • " used ✓
- FR-005: Long descriptions truncated ✓
- FR-006: Ellipsis appended to truncated descriptions ✓
- FR-007: Whitespace normalized ✓
- FR-008: HTML/special chars escaped (automatic via Vue) ✓
- FR-009: Description hidden from header when expanded ✓
- FR-010: Full description in expanded section ✓
- FR-011: Description restored when collapsed ✓
- FR-012: Visual styling (opacity) for less prominence ✓
- FR-013: Responsive truncation ✓
- FR-014: Consistent card height ✓

---

## Common Issues & Solutions

### Issue: Description not truncating

**Cause**: Parent container missing `min-width: 0` for flex truncation.

**Solution**: Parent `<div>` already has `style="min-width: 0"` (line 109). Ensure this is not removed.

---

### Issue: Description showing when expanded

**Cause**: Missing `!isExpanded` condition.

**Solution**: Verify `v-if="!isExpanded && descriptionPreview"` on description span.

---

### Issue: Layout shift during expand/collapse

**Cause**: Description changing height or wrapping.

**Solution**: Ensure `text-truncate` class on parent `<h4>` forces single-line display.

---

### Issue: Whitespace not normalized

**Cause**: Using raw `transaction.description` instead of computed property.

**Solution**: Use `descriptionPreview` computed property which normalizes whitespace.

---

## No Additional Dependencies

- No new npm packages
- No new Vuetify components
- No new utility functions
- No GraphQL changes
- No backend changes

**Total implementation**: ~10 lines of code in single component.
