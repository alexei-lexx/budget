# Phase 0 Research: Sort Chips Relocation

## Analysis Summary

**Objective**: Understand the current MonthlyExpenseReport (CategoryBreakdownTable) component structure to plan the sort chips relocation.

**Status**: All clarifications resolved through codebase analysis.

---

## Finding 1: Component Location and Architecture

**Decision**: Target component is `CategoryBreakdownTable.vue` in the reports folder
**Rationale**: The monthly expense report uses this component to display category breakdowns with sort controls
**Evidence**:
- File: `frontend/src/components/reports/CategoryBreakdownTable.vue`
- Imports data via `useMonthlyReports()` composable
- Renders category breakdown table with multi-currency support

---

## Finding 2: Current Sort Chips Implementation

**Decision**: Sort chips currently use `v-chip-group` with mandatory single-selection in a flex container positioned top-right
**Rationale**:
- Vuetify's `v-chip-group` with `mandatory` prop ensures exactly one chip is selected
- `v-model="sortBy"` binds to reactive state: `ref<"category" | "amount">("amount")`
- Container uses `class="d-flex justify-end mb-3"` for right-alignment and spacing
- Chips are separate UI elements above the table

**Code Reference**:
```html
<!-- Sort Controls (Lines 4-16) -->
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

**Sort State Management** (Line 96):
```typescript
const sortBy = ref<"category" | "amount">("amount");
```

---

## Finding 3: Table Structure and Column Layout

**Decision**: Table uses 3-column layout with rowspan support for multi-currency categories
**Rationale**:
- Column 1 (Left): Category Name with `rowspan` for multi-currency rows
- Column 2 (Center): Amount (formatted currency, right-aligned)
- Column 3 (Right): Percentage (right-aligned)
- Footer with totals row(s) matching multi-currency structure

**Table Markup Reference** (Lines 37-64):
- Category column uses `v-if="breakdownIndex === 0" :rowspan="category.currencyBreakdowns.length"`
- Amount/Percentage columns align with `class="text-right text-h6"`
- Multi-currency support: Each category has `currencyBreakdowns` array

**Column Width Implications**:
- Column widths flex automatically with content
- No fixed column widths defined
- Text alignment (text-right) affects visual column placement

---

## Finding 4: Current CSS and Styling Approach

**Decision**: Component uses only Vuetify utility classes, no scoped styles
**Rationale**:
- Consistent with Vuetify design system
- `d-flex`, `justify-end`, `mb-3` are Vuetify layout utilities
- Chips use `size="small"` and `variant="outlined"` for styling
- Table uses `text-right` for alignment
- No custom CSS rules to override or refactor

**Styling Classes**:
- Flex utilities: `d-flex`, `justify-end`, `mb-3`
- Text utilities: `text-right`, `text-h6`, `text-medium-emphasis`, `text-high-emphasis`
- Component props: `size="small"`, `variant="outlined"`, `mandatory`

---

## Finding 5: Flexbox Layout Strategy for Relocation

**Decision**: Use flexbox with `justify-between` to distribute chips above columns
**Rationale**:
- Keep chips in existing `v-chip-group` container (no refactoring needed)
- `justify-between` naturally spaces first chip left and second chip right
- Matches spec requirement: "category chip left-aligned, amount chip right-aligned"
- Responsive flexbox adapts to viewport width changes

**Implementation Approach**:
1. Change container from `class="d-flex justify-end mb-3"` to `class="d-flex justify-between mb-3"`
2. Keep same `v-chip-group` structure and binding
3. Chips automatically align: first chip (amount) left, second chip (category) right
4. **Critical**: Must adjust chip order in HTML to match column alignment:
   - Chip 1 (now positioned left): "category" chip (aligns with Category column)
   - Chip 2 (now positioned right): "amount" chip (aligns with Percentage column)

**Alternative Considered and Rejected**:
- Fixed width columns with absolute positioning: More complex, breaks responsive design
- Separate flex containers per chip: Overcomplicates structure, loses `v-chip-group` unity
- CSS Grid: Adds complexity without benefit for simple 2-chip layout

---

## Finding 6: Multi-Currency and Rowspan Handling

**Decision**: Sort chips remain above full table width; rowspan-handling is automatic with flexbox layout
**Rationale**:
- Table rows have `rowspan` attributes but this doesn't affect header positioning
- Chips container (v-chip-group) sits above all rows
- Flexbox aligns chips horizontally above the full table
- Spec requirement satisfied: "Sort chips remain positioned above the full table width"

**Edge Case Handling**:
- No data: Chips already conditionally render `v-if="categories && categories.length > 0"` ✓
- Narrow viewports: Flexbox `justify-between` maintains alignment even with viewport compression
- Multiple currencies: Rowspans are internal table concern; chips unaffected ✓

---

## Finding 7: Responsive Design Considerations

**Decision**: Flexbox layout naturally handles responsive behavior; no breakpoint-specific styling needed
**Rationale**:
- `d-flex` and `justify-between` work across all viewport sizes
- Vuetify's breakpoint system handles responsive utilities automatically
- Table already supports responsive design with existing layout
- Spec requires: "UI layout remains responsive on mobile and tablet viewports"

**Viewport Handling**:
- Desktop (wide): Chips spread with `justify-between` ✓
- Tablet (md breakpoint at 6 columns): Flexbox adapts naturally ✓
- Mobile (narrow): Chips stay visible and functional with flex spacing ✓
- No custom responsive breakpoints required

---

## Finding 8: Sort Functionality Preservation

**Decision**: Sort logic remains in component computed properties and methods; no changes needed
**Rationale**:
- Current sorting implemented via `sortedCategories` computed property (Line 103)
- Chip selection binds to `sortBy` ref, triggering re-computation
- Clicking chips still toggles sort state via `v-chip-group` mandatory binding
- Spec requirement: "System MUST maintain the existing sort functionality"

**Sort Flow**:
1. User clicks chip → `v-model` updates `sortBy` ref
2. `sortBy` change → `sortedCategories` computed re-evaluates
3. Table re-renders with sorted data
4. Active chip shows visually selected state automatically

**No Changes Required**: Sort logic is independent of chip positioning

---

## Summary of Key Insights

| Aspect | Current State | Relocation Impact |
|--------|---------------|-------------------|
| **Chip Container** | `<div class="d-flex justify-end">` | Change to `class="d-flex justify-between"` |
| **Chip Order** | amount, category | Reorder to: category, amount |
| **Table Columns** | Category (left), Amount (center), Percentage (right) | No changes |
| **Sort Logic** | Via `sortBy` ref and computed property | No changes |
| **Styling** | Vuetify utilities only | No custom CSS needed |
| **Responsive** | Flexbox-based | Maintained automatically |
| **Multi-currency** | Rowspan support in table | No impact on chip positioning |

---

## Phase 0 Conclusion

**All clarifications resolved**:
- ✓ Component location identified
- ✓ Current implementation analyzed
- ✓ Table structure understood
- ✓ Layout approach selected (flexbox justify-between)
- ✓ Responsive behavior confirmed
- ✓ Sort logic preservation verified
- ✓ No blocking dependencies identified

**Ready to proceed to Phase 1 Design**: Create data-model.md, contracts/, and quickstart.md
