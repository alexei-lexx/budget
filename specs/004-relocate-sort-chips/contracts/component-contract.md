# Component Contract: CategoryBreakdownTable

## Component Signature

```typescript
<CategoryBreakdownTable
  :month="selectedMonth"
  :year="selectedYear"
/>
```

**Location**: `frontend/src/components/reports/CategoryBreakdownTable.vue`

**Purpose**: Display monthly expense report with category breakdown and sort controls

---

## Props

### No Props

This component is self-contained. It uses:
- `useMonthlyReports()` composable for data fetching
- URL parameters or parent component context for month/year selection

**Note**: If future refactoring adds props, maintain backward compatibility

---

## Emits

### No Events

This component manages its own state internally. Sort selection is local to the component and doesn't need to propagate to parents.

---

## Template Structure (Current)

```html
<v-card class="category-breakdown-table" elevation="2">
  <v-card-text>
    <!-- Sort Controls -->
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
      <!-- tbody with categories loop -->
      <!-- tfoot with totals -->
    </v-table>
  </v-card-text>
</v-card>
```

---

## Template Structure (After Relocation)

```html
<v-card class="category-breakdown-table" elevation="2">
  <v-card-text>
    <!-- Sort Controls - UPDATED CLASS -->
    <div v-if="categories && categories.length > 0" class="d-flex justify-between mb-3">
      <v-chip-group v-model="sortBy" mandatory>
        <!-- REORDERED: category chip first -->
        <v-chip value="category" size="small" variant="outlined">
          category
          <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
        </v-chip>
        <!-- REORDERED: amount chip second -->
        <v-chip value="amount" size="small" variant="outlined">
          amount
          <v-icon end>mdi-sort-numeric-descending</v-icon>
        </v-chip>
      </v-chip-group>
    </div>

    <!-- Table - UNCHANGED -->
    <v-table>
      <!-- tbody with categories loop -->
      <!-- tfoot with totals -->
    </v-table>
  </v-card-text>
</v-card>
```

---

## Reactive State

### Sort Selection

```typescript
const sortBy = ref<"category" | "amount">("amount");
```

**Type**: Ref<"category" | "amount">

**Default**: "amount"

**Binding**: Two-way bound to `v-chip-group` via `v-model`

**Behavior**:
- Updates when user clicks a chip
- Changes trigger `sortedCategories` computed property re-evaluation
- No external effects or side effects

**No Changes Required**: State management remains unchanged

---

## Computed Properties

### sortedCategories

```typescript
const sortedCategories = computed(() => {
  if (!categories.value) return [];

  const sorted = [...categories.value];

  if (sortBy.value === "category") {
    sorted.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName)
    );
  } else {
    // Default: sort by total amount descending
    sorted.sort((a, b) => {
      const amountA = a.currencyBreakdowns.reduce(
        (sum, cb) => sum + cb.totalAmount,
        0
      );
      const amountB = b.currencyBreakdowns.reduce(
        (sum, cb) => sum + cb.totalAmount,
        0
      );
      return amountB - amountA;
    });
  }

  return sorted;
});
```

**Dependencies**: `sortBy`, `categories`

**Triggers**: When `sortBy` changes (via chip click) or categories data updates

**Usage**: Used in `v-for="(category, categoryIndex) in sortedCategories"`

**No Changes Required**: Sort logic remains unchanged

---

## Vuetify Component Usage

### v-card
- **Props**: `elevation="2"` (shadow)
- **Class**: `category-breakdown-table`
- **Role**: Container card for the report

### v-card-text
- **Content**: Chips and table
- **Padding**: Vuetify default

### div (Chips Container)
**Current**: `class="d-flex justify-end mb-3"`
**After**: `class="d-flex justify-between mb-3"`

**Changed Classes**:
- `justify-end` → `justify-between`

**Unchanged**:
- `d-flex` (display: flex)
- `mb-3` (margin-bottom: 16px)

### v-chip-group
- **v-model**: Bound to `sortBy` ref
- **mandatory**: Enforces exactly one chip selected at all times
- **Children**: Two v-chip components

### v-chip
- **Props**:
  - `value`: "category" or "amount" (identifier)
  - `size="small"`: Compact size
  - `variant="outlined"`: Outlined style
- **Content**: Label + v-icon
- **Behavior**: Toggles `sortBy` value when clicked
- **Visual states**: Active (filled) vs inactive (outlined) managed by v-chip-group

**Chip Order Change**:
1. First chip: `value="category"` (positioned left via flexbox)
2. Second chip: `value="amount"` (positioned right via flexbox)

### v-icon
- **Props**: `end` (icon after text)
- **Icons**:
  - Category: `mdi-sort-alphabetical-ascending`
  - Amount: `mdi-sort-numeric-descending`
- **No changes**: Icons and placement remain the same

### v-table
- **Structure**: Default Vuetify table
- **Columns**: Category Name | Amount | Percentage
- **Rows**: Categories with multi-currency support via rowspan
- **Footer**: Totals row(s)
- **No changes**: Table structure and rendering unchanged

---

## Data Flow Diagram

```
User clicks chip
    ↓
v-chip-group updates v-model
    ↓
sortBy.value changes
    ↓
sortedCategories computed re-evaluates
    ↓
Template re-renders with sorted data
    ↓
Active chip shows visual state
    ↓
User sees reordered table
```

**Timeline**: All steps are synchronous and immediate

---

## Styling Approach

### CSS Classes Used

**Flex utilities** (Vuetify):
- `d-flex`: `display: flex`
- `justify-between`: `justify-content: space-between` (NEW)
- Previously: `justify-end`: `justify-content: flex-end` (REMOVED)
- `mb-3`: `margin-bottom: 16px` (unchanged)

**Text utilities** (table columns):
- `text-right`: `text-align: right`
- `text-h6`: Font size heading 6
- `text-medium-emphasis`: Semi-transparent text
- `text-high-emphasis`: Solid text
- `text-medium-emphasis`: Secondary emphasis text

### No Custom CSS

This component uses only Vuetify utility classes. No `<style>` block or custom CSS is required.

---

## Accessibility Features

### Keyboard Navigation
- **Tab Key**: Focuses chips in order (category → amount)
- **Spacebar/Enter**: Selects focused chip
- **Arrow Keys**: Navigates between chips in group (Vuetify v-chip-group feature)

### Visual Indicators
- **Focus Ring**: Visible on outlined chips
- **Active State**: Selected chip shows filled background
- **Icons**: Provide visual sort direction indicator

### ARIA Support
- `v-chip-group`: Inherits accessible group semantics
- `v-chip`: Each chip is a focusable button
- No additional ARIA attributes needed

---

## Testing Considerations

### Unit Test Scenarios

1. **Chip Rendering**
   - ✓ Both chips render when categories exist
   - ✓ Chips hidden when categories empty

2. **Sort Functionality**
   - ✓ Clicking "category" chip sorts alphabetically
   - ✓ Clicking "amount" chip sorts by total descending
   - ✓ Only one chip shows as selected

3. **Layout**
   - ✓ Container uses `justify-between` class
   - ✓ Chips render in correct order (category first, amount second)
   - ✓ No visual layout shifts on sort toggle

4. **Integration**
   - ✓ Data loads via `useMonthlyReports()`
   - ✓ Sort state persists during component lifecycle
   - ✓ Responsive on different viewport sizes

---

## Migration Checklist

### Code Changes Required
- [ ] Change `justify-end` to `justify-between` in chips container
- [ ] Reorder chip elements (category first, amount second)
- [ ] Update line 7: `class="d-flex justify-end mb-3"` to `class="d-flex justify-between mb-3"`
- [ ] Move amount chip (lines 10-13) after category chip

### Testing Required
- [ ] Verify chips align above columns
- [ ] Test click functionality on both chips
- [ ] Test sort order correctness
- [ ] Test responsive behavior (desktop/tablet/mobile)
- [ ] Test keyboard navigation

### No Breaking Changes
- ✓ Props unchanged
- ✓ Events unchanged
- ✓ Data structures unchanged
- ✓ Sort logic unchanged
- ✓ State management unchanged

---

## Reference

**Component File**: `frontend/src/components/reports/CategoryBreakdownTable.vue`

**Lines to Modify**:
- Line 7: Update flex container class
- Lines 8-16: Reorder v-chip elements (optional refactoring, required for alignment)

**Files that Import**: `frontend/src/views/Reports.vue`

**No other files require changes**
