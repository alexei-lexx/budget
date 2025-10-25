# Phase 1 Data Model: Sort Chips Relocation

## Component Architecture

### CategoryBreakdownTable Component

**Location**: `frontend/src/components/reports/CategoryBreakdownTable.vue`

**Primary Responsibility**: Display monthly expense report with category breakdown and sort controls

**Lifecycle**:
- Mounted: Fetches category data via `useMonthlyReports()` composable
- Interactive: Sorts data on chip selection
- Responsive: Adapts layout to viewport size

---

## Reactive State Model

### Sort State

```typescript
interface SortState {
  sortBy: "category" | "amount";
  defaultSort: "amount";
}
```

**Current Implementation** (Line 96):
```typescript
const sortBy = ref<"category" | "amount">("amount");
```

**Behavior**:
- Default: sorts by amount (descending numeric)
- Click chip: toggles between category (alphabetical) and amount (numeric)
- Vuetify `v-chip-group` with `mandatory` ensures exactly one selection
- State drives `sortedCategories` computed property

**No Changes Required**: Sort state remains unchanged

---

## Data Structures

### CategoryBreakdown (from API)

```typescript
interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  currencyBreakdowns: CurrencyBreakdown[];
}

interface CurrencyBreakdown {
  currency: string;
  totalAmount: number;
  percentage: number;
}
```

**Rendering Strategy**:
- Outer loop: `v-for="(category, categoryIndex) in categories"`
- Inner loop: `v-for="(breakdown, breakdownIndex) in category.currencyBreakdowns"`
- Rowspan logic: `v-if="breakdownIndex === 0" :rowspan="category.currencyBreakdowns.length"`

**No Changes Required**: Data structures unchanged

---

## UI Component Layout

### Current HTML Structure

```html
<v-card class="category-breakdown-table" elevation="2">
  <v-card-text>
    <!-- Sort Controls Container -->
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

    <!-- Table -->
    <v-table>
      <!-- ... -->
    </v-table>
  </v-card-text>
</v-card>
```

### Proposed HTML Structure (After Relocation)

```html
<v-card class="category-breakdown-table" elevation="2">
  <v-card-text>
    <!-- Sort Controls Container - NEW LAYOUT -->
    <div v-if="categories && categories.length > 0" class="d-flex justify-between mb-3">
      <v-chip-group v-model="sortBy" mandatory>
        <!-- REORDERED: category chip first (left position) -->
        <v-chip value="category" size="small" variant="outlined">
          category
          <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
        </v-chip>
        <!-- REORDERED: amount chip second (right position) -->
        <v-chip value="amount" size="small" variant="outlined">
          amount
          <v-icon end>mdi-sort-numeric-descending</v-icon>
        </v-chip>
      </v-chip-group>
    </div>

    <!-- Table - UNCHANGED -->
    <v-table>
      <!-- ... -->
    </v-table>
  </v-card-text>
</v-card>
```

### Layout Changes Summary

| Element | Change | Reason |
|---------|--------|--------|
| **Container class** | `justify-end` → `justify-between` | Spreads chips: first left, second right |
| **Chip order** | amount, category → category, amount | Aligns category chip above Category Name column (left), amount chip above Percentage column (right) |
| **Conditional rendering** | `v-if="categories && categories.length > 0"` | No change - remains for empty state handling |
| **v-chip-group props** | `mandatory` binding unchanged | Preserves mandatory single-selection behavior |
| **Chip size/variant** | No change | Remains `size="small" variant="outlined"` |

---

## Column Alignment Model

### Table Column Structure

```
┌─────────────────┬──────────────────┬────────────┐
│  Category Name  │      Amount      │ Percentage │
├─────────────────┼──────────────────┼────────────┤
│  [Category 1]   │  $1,234.56 USD   │    45%     │
│  [Category 2]   │    $789.12 USD   │    28%     │
└─────────────────┴──────────────────┴────────────┘
```

### Chip Positioning

```
[category chip]                              [amount chip]
┌─────────────────┬──────────────────┬────────────┐
│  Category Name  │      Amount      │ Percentage │
├─────────────────┼──────────────────┼────────────┤
│  [Category 1]   │  $1,234.56 USD   │    45%     │
```

**Alignment Rules**:
1. **Category chip (left)**: Aligns with Category Name column's left edge
2. **Amount chip (right)**: Aligns with Percentage column's right edge
3. **Flexbox distribution**: `justify-between` creates maximum spacing
4. **Responsive**: Spacing adapts to viewport width automatically

---

## Responsive Behavior

### Viewport Considerations

**Desktop (≥960px)**:
- Full table width visible
- Chips spread naturally with `justify-between`
- No layout issues

**Tablet (md breakpoint)**:
- Columns may compress slightly
- Chips remain visible and aligned
- `justify-between` adapts spacing

**Mobile (< md)**:
- Columns compress further
- Chips stay functional
- Flexbox maintains alignment

**No responsive breakpoint-specific CSS needed**: Vuetify's flexbox utilities handle adaptation automatically

---

## State Transitions

### Sort State Changes

```
[User clicks a chip]
        ↓
[v-chip-group updates v-model]
        ↓
[sortBy ref value changes]
        ↓
[sortedCategories computed property re-evaluates]
        ↓
[Table re-renders with new sort order]
        ↓
[Chip shows active state via v-chip-group]
```

**Timeline**:
1. Immediate: `sortBy` value updates
2. Immediate: Active chip visual state updates (Vuetify built-in)
3. Immediate: `sortedCategories` re-computes
4. Immediate: Table DOM updates with new sort order
5. No async operations or side effects

**No Changes Required**: Sort state machine remains unchanged

---

## Vuetify Component Dependencies

### Components Used

| Component | Props/Features | Change |
|-----------|-----------------|--------|
| `v-card` | elevation, class | None |
| `v-card-text` | (default) | None |
| `div` | `d-flex`, `justify-between`, `mb-3` | `justify-end` → `justify-between` |
| `v-chip-group` | `v-model`, `mandatory` | None |
| `v-chip` | `value`, `size="small"`, `variant="outlined"` | Reorder in HTML |
| `v-icon` | `end`, icon name | None |
| `v-table` | (default structure) | None |

### Utility Classes Used

**Flexbox utilities**:
- `d-flex`: Display: flex
- `justify-between`: Justify-content: space-between (NEW)
- Previously: `justify-end` (REMOVED)
- `mb-3`: Margin-bottom: 16px (no change)

**Text utilities** (table only):
- `text-right`: Text-align: right
- `text-h6`: Font size heading 6
- `text-medium-emphasis`: Text opacity/color
- `text-high-emphasis`: Text opacity/color

---

## Validation and Edge Cases

### Empty State
- **Condition**: No categories data
- **Current behavior**: Chips container hidden via `v-if="categories && categories.length > 0"`
- **After change**: Same conditional rendering applies
- **Status**: ✓ No changes needed

### Single Currency Category
- **Condition**: Category has only one currency
- **Current behavior**: No rowspan needed, single row per category
- **After change**: Chips align naturally, no impact
- **Status**: ✓ No changes needed

### Multi-Currency Category
- **Condition**: Category has multiple currencies (different rowspans)
- **Current behavior**: First data row shows category name, rowspan covers all currencies
- **After change**: Chips remain above full table, alignment unchanged
- **Status**: ✓ No changes needed

### Narrow Viewport
- **Condition**: Viewport width < 600px
- **Current behavior**: Table compresses, flex utilities adapt
- **After change**: `justify-between` adapts to available width, chips stay visible
- **Status**: ✓ Responsive behavior maintained

---

## Component Test Scenarios

### Positioning
- ✓ Category chip appears above Category Name column
- ✓ Amount chip appears above Percentage column
- ✓ Chips remain visible on all viewport sizes

### Functionality
- ✓ Clicking category chip sorts alphabetically
- ✓ Clicking amount chip sorts numerically (descending)
- ✓ Only one chip shows as selected at a time
- ✓ Sort order persists across other interactions

### Visual
- ✓ No layout shifts when toggling sorts
- ✓ No overlapping elements
- ✓ Chips maintain proper spacing via `mb-3`

---

## Summary

**Data Model Changes**: None - existing data structures unchanged

**Component Structure Changes**:
1. Flex container: `justify-end` → `justify-between`
2. Chip order: (amount, category) → (category, amount)

**Behavior Changes**: None - sort logic and state management unchanged

**Responsive Behavior**: Improved and automatic via flexbox

**Ready for implementation**: All structural decisions documented
