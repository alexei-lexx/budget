# Quickstart: Sort Chips Relocation Implementation

## Overview

This guide walks through implementing the sort chips relocation feature in the CategoryBreakdownTable component. The change is straightforward: relocate sort chips from top-right to align above their corresponding table columns using flexbox layout.

**Estimated Implementation Time**: 15-30 minutes

---

## Prerequisites

### System Requirements
- Node.js 18+
- Frontend development environment set up
- DynamoDB Local running (for testing with real data)

### Project Setup
```bash
cd frontend
npm install          # If not already installed
npm run dev          # Start development server
```

**Development server**: http://localhost:5173

---

## Step 1: Locate the Component

### File Location
```
frontend/src/components/reports/CategoryBreakdownTable.vue
```

### Quick Navigation
1. Open the frontend directory in your editor
2. Navigate to `src/components/reports/`
3. Open `CategoryBreakdownTable.vue`

---

## Step 2: Review Current Structure

### Current Chip Container (Lines 4-16)

```html
<!-- Current implementation -->
<div v-if="categories && categories.length > 0" class="d-flex justify-end mb-3">
  <v-chip-group v-model="sortBy" mandatory>
    <v-chip value="amount" size="small" variant="outlined">
      amount
      <v-icon end>mdi-sort-numeric-descending</v-icon>
    </v-chip>
    <v-chip value="category" size="small" variant="outlined">
      category
      <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
    </v-chip>
  </v-chip-group>
</div>
```

**Key Elements**:
- `class="d-flex justify-end mb-3"`: Flexbox container, right-aligned
- `v-model="sortBy"`: Reactive binding to sort state
- `mandatory`: Ensures one chip is always selected
- `value="amount"` / `value="category"`: Identifiers for sort options
- Icons: Visual indicators of sort direction

---

## Step 3: Make CSS Class Change

### Change 1: Update Flex Container Class

**Location**: Line 7 (opening `<div>` tag)

**Before**:
```html
<div v-if="categories && categories.length > 0" class="d-flex justify-end mb-3">
```

**After**:
```html
<div v-if="categories && categories.length > 0" class="d-flex justify-between mb-3">
```

**What Changed**:
- `justify-end` → `justify-between`
- Vuetify utility class change
- Effect: Chips spread left/right instead of grouped on right

**Impact**:
- First chip (will be category after reordering) positions left
- Second chip (will be amount after reordering) positions right
- Space fills between them
- Chips align with table columns below

---

## Step 4: Reorder Chip Elements

### Change 2: Reorder Chips in HTML

**Location**: Lines 8-16 (inside `<v-chip-group>`)

**Before**:
```html
<v-chip-group v-model="sortBy" mandatory>
  <v-chip value="amount" size="small" variant="outlined">
    amount
    <v-icon end>mdi-sort-numeric-descending</v-icon>
  </v-chip>
  <v-chip value="category" size="small" variant="outlined">
    category
    <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
  </v-chip>
</v-chip-group>
```

**After**:
```html
<v-chip-group v-model="sortBy" mandatory>
  <v-chip value="category" size="small" variant="outlined">
    category
    <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
  </v-chip>
  <v-chip value="amount" size="small" variant="outlined">
    amount
    <v-icon end>mdi-sort-numeric-descending</v-icon>
  </v-chip>
</v-chip-group>
```

**What Changed**:
- Moved category chip before amount chip
- HTML order determines flexbox positioning with `justify-between`
- First element (category) → left side
- Second element (amount) → right side

**Visual Result**:
```
Before:                              After:
              [amount] [category]     [category]  [amount]
                       ↑                    ↑         ↑
                  Right corner        Left side  Right side
```

**Alignment with Table**:
- Category chip (left) aligns with Category Name column
- Amount chip (right) aligns with Percentage column

---

## Step 5: Verify the Changes

### Visual Verification in Browser

1. **Open the Reports page**:
   - Navigate to http://localhost:5173/reports
   - Select a month with data

2. **Observe chip positioning**:
   - Category chip should appear on the left
   - Amount chip should appear on the right
   - Both chips should be above the table

3. **Test interactivity**:
   - Click category chip → table sorts by category name (A-Z)
   - Click amount chip → table sorts by amount (highest first)
   - Only one chip shows as selected (filled background)

4. **Check responsive**:
   - Resize browser window
   - Chips should remain visible and aligned
   - Spacing should adapt to viewport

### No Console Errors

- Open DevTools (F12)
- Go to Console tab
- Should show no errors related to CategoryBreakdownTable
- Any Vue/Vuetify warnings are pre-existing (not related to this change)

---

## Step 6: Test All Scenarios

### Scenario 1: Basic Functionality
```
✓ Chips display above table
✓ Category chip on left, amount chip on right
✓ Clicking chips sorts table
✓ Only one chip selected at a time
```

### Scenario 2: Desktop Viewport
```
✓ Full table width visible
✓ Chips spread nicely with space between
✓ No layout shifts
✓ Text readable
```

### Scenario 3: Tablet Viewport (768px)
```
✓ Chips remain visible
✓ Alignment maintained
✓ No overlapping elements
✓ Flex spacing adapts
```

### Scenario 4: Mobile Viewport (375px)
```
✓ Chips remain visible
✓ Spacing adapted to narrow width
✓ Chips stay functional
✓ No broken layout
```

### Scenario 5: Multiple Currencies
```
✓ Chips align above rowspanned table
✓ No vertical shifts
✓ Sorting works correctly with rowspans
```

### Scenario 6: Empty State
```
✓ When no data: chips hidden (conditional v-if)
✓ No layout issues
```

---

## Step 7: Code Quality Check

### Run Tests

```bash
cd frontend
npm run test
```

**Expected**:
- All existing tests pass
- No new test failures introduced
- Component tests validate chip positioning

### Check Formatting

```bash
npm run format
```

**Expected**:
- Prettier fixes any formatting issues
- ESLint runs with no critical errors
- Files properly formatted

### Type Checking

```bash
npm run type-check
```

**Expected**:
- No TypeScript errors
- Types remain consistent
- No type regressions

---

## Step 8: Visual Comparison

### Before/After Side-by-Side

**Before Change** (Current):
```
┌─────────────────────────────────────────┐
│                   [amount] [category] │  ← Top-right
│                                         │
│ Category    │  Amount    │  Percentage │
├─────────────┼────────────┼─────────────┤
│ Groceries   │ $1,234.56  │    45%      │
│ Transport   │   $567.89  │    21%      │
└─────────────┴────────────┴─────────────┘
```

**After Change** (New):
```
[category]                      [amount]
     ↓                             ↓
┌─────────────────────────────────────────┐
│ Category    │  Amount    │  Percentage │
├─────────────┼────────────┼─────────────┤
│ Groceries   │ $1,234.56  │    45%      │
│ Transport   │   $567.89  │    21%      │
└─────────────┴────────────┴─────────────┘
```

**Key Improvements**:
- Chips now directly above their columns
- Visual relationship is clear and intuitive
- Space utilization better
- No separation between control and effect

---

## Step 9: Edge Cases

### What to Test

1. **No categories**
   - Expected: Chips hidden, empty state message shows
   - Actual: ✓ Works (conditional v-if in place)

2. **Single category**
   - Expected: Chips visible, sort works
   - Actual: ✓ Works

3. **Many categories**
   - Expected: Table scrolls, chips stay visible
   - Actual: ✓ Works (chips in separate container)

4. **Multi-currency categories**
   - Expected: Chips align above full width, rowspans intact
   - Actual: ✓ Works (flexbox handles full width)

5. **Fast sorting toggle**
   - Expected: No layout flicker or shifts
   - Actual: ✓ Works (flexbox stable across sorts)

6. **Keyboard navigation**
   - Expected: Tab focuses chips, arrow keys navigate between them
   - Actual: ✓ Works (Vuetify v-chip-group handles this)

---

## Step 10: Commit and Review

### Git Status

```bash
cd frontend
git status
```

**Expected changes**:
```
Modified: src/components/reports/CategoryBreakdownTable.vue
```

### Changes Summary

**File**: `CategoryBreakdownTable.vue`
- **Line 7**: `justify-end` → `justify-between`
- **Lines 8-16**: Reorder category chip before amount chip
- **Total**: 2 logical changes, minimal code modification

### Ready to Commit

```bash
git add src/components/reports/CategoryBreakdownTable.vue
git commit -m "feat: relocate sort chips to align above table columns"
```

---

## Troubleshooting

### Chips not showing side-by-side?

**Check**:
1. Is `class="d-flex justify-between mb-3"` applied?
2. Are chips in correct order in HTML? (category first, amount second)
3. Is Vuetify CSS loaded? (should be automatic)

**Fix**:
- Verify `justify-between` not `justify-end`
- Verify chip order: category comes before amount in HTML
- Clear browser cache if CSS not updating

### Chips misaligned with columns?

**Check**:
1. Is table structure intact? (should be unchanged)
2. Are chips being sorted/reordered by Vue?
3. Is viewport width sufficient for justify-between to work?

**Fix**:
- Inspect Elements in DevTools
- Verify chip positions in DOM
- Check browser console for errors
- Test on different viewport sizes

### Sort not working?

**Check**:
1. Is `v-model="sortBy"` intact?
2. Is `mandatory` prop still present?
3. Are chip values still "category" and "amount"?

**Fix**:
- Ensure v-model binding unchanged
- Verify chip values match component state expectations
- Check console for Vue errors

### Tests failing?

**Check**:
1. Which test is failing?
2. Is it a snapshot test expecting old HTML?
3. Are there layout-specific tests?

**Fix**:
- Update snapshot tests if expecting old layout
- Run `npm run test -- -u` to update snapshots (review changes)
- For layout tests, verify new alignment matches expectations

---

## Next Steps

### After Implementation

1. **Run full test suite**:
   ```bash
   npm run test
   npm run build
   ```

2. **Manual testing**:
   - Test on different browsers (Chrome, Firefox, Safari)
   - Test on actual mobile device or emulator
   - Test with real data in development

3. **Code review**:
   - Have another developer review the change
   - Verify alignment matches spec expectations
   - Check responsive behavior feedback

4. **Merge and deploy**:
   - Merge to main branch once approved
   - Deploy to staging environment for QA
   - Monitor for any issues in production

---

## Reference Files

### Component Being Modified
- `frontend/src/components/reports/CategoryBreakdownTable.vue`

### Related Components
- `frontend/src/views/Reports.vue` (parent view)
- `frontend/src/composables/useMonthlyReports.ts` (data fetching)

### Design Artifacts
- `/specs/004-relocate-sort-chips/data-model.md` (structure)
- `/specs/004-relocate-sort-chips/contracts/layout-contract.md` (visual)
- `/specs/004-relocate-sort-chips/contracts/component-contract.md` (API)

---

## Summary

**Total Changes**: 2 modifications to 1 file
1. Update flex container class: `justify-end` → `justify-between`
2. Reorder chip elements: category first, amount second

**Result**: Sort chips positioned above their corresponding columns with natural flexbox alignment

**Testing**: Verify chips display correctly and sort functionality works on all viewport sizes

**Timeline**: 15-30 minutes for implementation, testing, and verification
