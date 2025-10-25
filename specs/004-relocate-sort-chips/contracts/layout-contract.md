# UI Layout Contract: Sort Chips Relocation

## Desktop Layout (≥960px)

### Before Relocation
```
┌─────────────────────────────────────────────────────────────────┐
│                                                   [amount] [category] │
├─────────────────────────────────────────────────────────────────┤
│ Category Name    │        Amount        │      Percentage       │
├──────────────────┼─────────────────────┼──────────────────────│
│ Groceries        │     $1,234.56 USD   │         45%          │
│ Transportation   │       $567.89 USD   │         21%          │
│ Entertainment    │       $345.67 USD   │         13%          │
│ Other            │       $251.88 USD   │         9%           │
│ Savings          │       $200.00 USD   │         7%           │
├──────────────────┼─────────────────────┼──────────────────────┤
│ Total            │     $2,600.00 USD   │         —            │
└──────────────────┴─────────────────────┴──────────────────────┘
```

**Issues**:
- Sort chips in top-right corner, separated from columns
- User must trace which column each chip controls
- Not intuitive which chip affects which column

### After Relocation
```
[category]                                          [amount]
┌─────────────────────────────────────────────────────────────────┐
│ Category Name    │        Amount        │      Percentage       │
├──────────────────┼─────────────────────┼──────────────────────│
│ Groceries        │     $1,234.56 USD   │         45%          │
│ Transportation   │       $567.89 USD   │         21%          │
│ Entertainment    │       $345.67 USD   │         13%          │
│ Other            │       $251.88 USD   │         9%           │
│ Savings          │       $200.00 USD   │         7%           │
├──────────────────┼─────────────────────┼──────────────────────┤
│ Total            │     $2,600.00 USD   │         —            │
└──────────────────┴─────────────────────┴──────────────────────┘
```

**Improvements**:
- Category chip directly above Category Name column (left alignment)
- Amount chip directly above Percentage column (right alignment)
- Visual connection between chip and column is immediate
- Natural left-to-right reading flow

---

## Tablet Layout (600px - 959px)

```
[category]                                    [amount]
┌─────────────────────────────────────────────────────┐
│ Category   │      Amount      │    Percentage     │
├────────────┼──────────────────┼──────────────────┤
│ Groceries  │  $1,234.56 USD   │       45%        │
│ Transport  │    $567.89 USD   │       21%        │
│ Entertain  │    $345.67 USD   │       13%        │
│ Other      │    $251.88 USD   │        9%        │
│ Savings    │    $200.00 USD   │        7%        │
├────────────┼──────────────────┼──────────────────┤
│ Total      │  $2,600.00 USD   │        —         │
└────────────┴──────────────────┴──────────────────┘
```

**Behavior**:
- Chips still aligned via `justify-between`
- Column widths compress but chip positioning maintained
- Full chip labels remain visible
- No layout shifts or overlapping

---

## Mobile Layout (<600px)

```
[category]           [amount]
┌──────────────────────────────┐
│ Cat.  │  Amount  │   Pct.   │
├───────┼──────────┼──────────┤
│ Groc. │ $1234 USD │  45%   │
│ Trans │ $568 USD  │  21%   │
│ Entrt │ $346 USD  │  13%   │
│ Other │ $252 USD  │   9%   │
│ Svngs │ $200 USD  │   7%   │
├───────┼──────────┼──────────┤
│ Total │ $2600 USD│   —    │
└───────┴──────────┴──────────┘
```

**Behavior**:
- Chips remain visible and functional
- `justify-between` maintains left/right spread on narrow width
- Table text abbreviates but chip alignment preserved
- Flex spacing adapts automatically

---

## Interactive States

### Normal State (Both Chips)
```
[category chip]                              [amount chip]
  (outlined)                                   (outlined)
```

### Active State - Category Selected
```
[category chip]                              [amount chip]
  (solid/filled)                               (outlined)
```

**Visual Indicators**:
- Selected chip: Filled background, different color
- Unselected chip: Outlined background, default color
- Vuetify's `v-chip-group` manages this automatically
- Current default: amount chip active

### Active State - Amount Selected
```
[category chip]                              [amount chip]
  (outlined)                                   (solid/filled)
```

---

## Multi-Currency Scenarios

### Single Currency (No Rowspans)
```
[category]                                          [amount]
┌─────────────────────────────────────────────────────────────────┐
│ Category Name    │        Amount        │      Percentage       │
├──────────────────┼─────────────────────┼──────────────────────│
│ Groceries        │     $1,234.56 USD   │         45%          │
│ Transportation   │       $567.89 EUR   │         21%          │
└──────────────────┴─────────────────────┴──────────────────────┘
```

**Chip Positioning**: Aligned above table width naturally

### Multi-Currency with Rowspans
```
[category]                                          [amount]
┌─────────────────────────────────────────────────────────────────┐
│ Category Name    │        Amount        │      Percentage       │
├──────────────────┼─────────────────────┼──────────────────────│
│                  │   $1,000.00 USD     │         40%          │
│  Groceries       ├─────────────────────┼──────────────────────┤
│                  │     €234.56 EUR     │         5%           │
│ Transportation   │     $567.89 USD     │         21%          │
└──────────────────┴─────────────────────┴──────────────────────┘
```

**Chip Positioning**: Aligned above full table width with rowspans
- Category chip at left edge of all rows
- Amount chip at right edge of all rows
- Rowspans don't affect chip alignment

---

## Empty State

### No Categories Available

```
┌─────────────────────────────────────────────────────────────────┐
│                         No data available                        │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Chips container hidden: `v-if="categories && categories.length > 0"`
- Only message displayed
- No layout issues

---

## Spacing and Dimensions

### Vertical Spacing
```
[Chip Container with category/amount chips]
    ↓ (margin-bottom: 16px / mb-3)
┌─────────────────────────────────────────┐
│ Table Header Row                        │
└─────────────────────────────────────────┘
```

### Horizontal Distribution (Desktop)
```
Max Available Width
←─────────────────────────────────────────→
[category]            [spacing]            [amount]
←────────┴──────────────────────────────────┴─────────→
justify-between: space-between
- First chip (category): flush left
- Last chip (amount): flush right
- Spacing: fills available space between
```

### Chip Dimensions
- **Size**: small (Vuetify preset)
- **Variant**: outlined
- **Content**: Label + Icon (mdi-sort-alphabetical-ascending or mdi-sort-numeric-descending)
- **Height**: ~32px (Vuetify small chip)
- **Padding**: Vuetify default (~8-12px horizontal)

---

## Accessibility Considerations

### Focus States
- Chips are focusable via keyboard (Tab key)
- Focus ring visible on outlined chips
- Tab order: category chip → amount chip

### ARIA Labels
- v-chip-group provides accessible selection mechanism
- aria-label inherited from Vuetify components
- Role: `group` with role semantics

### Responsive Text
- Chip labels remain readable on all viewport sizes
- Icons convey sort direction (ascending/descending)
- No text truncation needed

---

## CSS Class Changes Summary

| Utility Class | Before | After | Impact |
|---------------|--------|-------|--------|
| `d-flex` | Present | Present | No change |
| `justify-end` | Present | Removed | Changes alignment |
| `justify-between` | Absent | Present | New alignment |
| `mb-3` | Present | Present | No change |

---

## Validation Checklist

### Layout Requirements
- ✓ Category chip above Category Name column (left)
- ✓ Amount chip above Percentage column (right)
- ✓ Chips distributed via flexbox `justify-between`
- ✓ Chips remain visible above table on all viewports
- ✓ No overlapping elements
- ✓ No layout shifts on sort toggle

### Functional Requirements
- ✓ Clicking chips still sorts table
- ✓ Only one chip selected at a time
- ✓ Selected chip shows active state
- ✓ Sort order correct (category: alphabetical, amount: numeric descending)

### Responsive Requirements
- ✓ Desktop layout functional
- ✓ Tablet layout functional
- ✓ Mobile layout functional
- ✓ No viewport-specific CSS breakpoints needed
- ✓ Flexbox adapts automatically

### Edge Cases
- ✓ Empty state: chips hidden, no layout issues
- ✓ Single currency: normal layout
- ✓ Multi-currency: chips align above full width
- ✓ Multi-row categories: rowspans don't affect chips

---

## Reference Implementation Files

**Component to Modify**:
- `frontend/src/components/reports/CategoryBreakdownTable.vue`

**Changes**:
1. Line 7: Change `class="d-flex justify-end mb-3"` to `class="d-flex justify-between mb-3"`
2. Lines 8-16: Reorder chip HTML to put category chip first, amount chip second

**No other files require changes**
