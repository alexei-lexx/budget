# Operating Expenses Filter

## Problem Statement

The monthly expense report currently includes all outgoing transactions, which distorts actual lifestyle spending patterns.

### Example Scenario
When selling stocks:
- **Income transaction**: Investment profit (+$10,000)
- **Expense transaction**: Tax on investment (-$2,000)

The $2,000 tax appears in monthly expenses, but it's not a lifestyle cost—it's a capital-related outflow. This inflates the monthly expense total and makes it harder to understand actual living costs.

### Similar Cases
Other transactions that should be excluded from operating expense reports:
- Investment management fees
- Capital gains taxes
- Loan principal payments (potentially)
- Business expenses (if tracked in personal account)
- Large one-time capital purchases

## Solution: Category-Level Flag

Add a boolean flag to categories: **"Include in expense reports"**

### Data Model
```
Category {
  id: string
  name: string
  includeInReports: boolean  // NEW FIELD (default: true)
  ...existing fields
}
```

### Behavior
- **Default**: ON for all existing and new categories
- **User control**: Can toggle OFF for specific categories (e.g., "Investment Tax")
- **Reports**: Monthly expense report only sums transactions from categories where `includeInReports = true`
- **Transaction list**: All transactions remain visible regardless of flag

### UI Changes
1. **Category settings page**: Checkbox "Include in monthly expense reports"
2. **Monthly expense report**:
   - Primary metric: "Operating Expenses: $X" (only included categories)
   - Optional secondary metric: "Total Outflows: $Y" (all expenses for comparison)

## Why This Approach

### Considered Alternatives

#### 1. Transaction-level flag
**Rejected**: Too much friction—requires decision on every transaction.

#### 2. Budget assignment per transaction
**Deferred**: Adds complexity without immediate value. User doesn't do budget planning yet, only retrospective tracking.

#### 3. Linked transactions (tax + income as a "set")
**Rejected**: Over-engineered for current need. Doesn't solve the core problem of expense classification.

#### 4. Transaction "nature" dimension (operating/investment/tax)
**Rejected**: Redundant with category flag; adds another classification axis without clear benefit.

### Advantages of Category Flag
- **One-time decision**: Set flag per category, applies to all transactions in that category
- **Simple mental model**: Categories are already the primary classification mechanism
- **Minimal data model change**: Single boolean field
- **Backward compatible**: Defaults to true (current behavior)
- **Low maintenance**: No per-transaction overhead

## Time Grouping

User tracks expenses retrospectively by time period:
- **Currently**: Monthly ("What did I spend in October?")
- **Future**: Possibly yearly

**No budget object needed**—transactions already have dates. Reports can filter/group by:
- Month (October 2025)
- Year (2025)
- Custom date range

## Implementation Considerations

### Migration
- Add `includeInReports` column to categories table (default: true)
- All existing categories get `true` by default
- No data migration needed for transactions

### Reporting Logic Changes
```typescript
// Before
const monthlyExpenses = transactions
  .filter(t => t.type === 'EXPENSE' && isInMonth(t.date, month))
  .reduce((sum, t) => sum + t.amount, 0)

// After
const operatingExpenses = transactions
  .filter(t =>
    t.type === 'EXPENSE' &&
    isInMonth(t.date, month) &&
    t.category.includeInReports === true
  )
  .reduce((sum, t) => sum + t.amount, 0)
```

### User Workflow
1. User creates category "Investment Tax"
2. User unchecks "Include in monthly expense reports" in category settings
3. User creates expense transaction with category "Investment Tax"
4. Transaction appears in transaction list
5. Transaction does NOT appear in "Operating Expenses" total on monthly report
6. Transaction DOES appear in "Total Outflows" (if that view is shown)

## Open Questions
- Should there be a visual indicator in transaction list for excluded categories?
- Should reports show breakdown: "Operating: $X, Other outflows: $Y"?
- Should category flag be editable retroactively (affects historical reports)?
