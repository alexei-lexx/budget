# Task 13: Quick Action Transaction Buttons

## Objective

Add quick action buttons for the most frequently used account/category combinations to speed up transaction entry by pre-filling common patterns and reducing user clicks.

## Use Cases

### Use Case 1: Frequent Expense Entry
**Given:** User has made 25 "Chase Credit + Food & Dining" transactions in their last 100 transactions
**When:** User selects the Expense tab in transaction creation form
**Then:** "Chase Credit + Food & Dining" appears as a quick action button below the tab
**And:** Clicking the button pre-fills account and category fields
**And:** User only needs to enter amount to complete the transaction

### Use Case 2: Income Transaction Shortcuts
**Given:** User regularly receives salary deposits to "Checking + Salary"
**When:** User selects the Income tab in transaction creation form  
**Then:** "Checking + Salary" appears as a quick action button below the tab
**And:** Clicking the button pre-fills account and category fields
**And:** User only needs to enter amount to save the transaction

### Use Case 3: New User Experience
**Given:** User has created no transactions yet
**When:** User opens transaction creation form
**Then:** No quick action buttons are displayed (no transaction history)
**And:** User sees the normal account and category dropdown workflow
**And:** After creating first transaction, quick actions will appear on subsequent visits

## UI Layout

**Quick Action Button Layout:**

When Income tab is selected:
```
┌─────────────┬─────────────┐
│ Income (•)  │ Expense     │
└─────────────┴─────────────┘

Quick Actions:
[Savings + Salary] [Checking + Freelance] [Investment + Dividends]

Account:    [dropdown ▼]
Category:   [dropdown ▼]
Amount:     [_________]
Date:       [_________]
```

When Expense tab is selected:
```
┌─────────────┬─────────────┐
│ Income      │ Expense (•) │
└─────────────┴─────────────┘

Quick Actions:
[Chase Credit + Food] [Chase Credit + Shopping] [Cash + Gas]

Account:    [dropdown ▼]
Category:   [dropdown ▼]
Amount:     [_________]
Date:       [_________]
```

## Acceptance Criteria

### Core Functionality
- [ ] System calculates top 3 account/category combinations per transaction type (Income/Expense)
- [ ] Only transactions with both account AND category included in pattern analysis
- [ ] Quick actions appear below transaction type tabs, contextual to selected tab
- [ ] Clicking shortcut pre-fills account/category fields and focuses amount field
- [ ] Buttons show format: "[Account Name] + [Category Name]"

### User Experience
- [ ] New users (no transaction history) see normal form without shortcuts
- [ ] Manual form workflow unchanged for users who prefer it
- [ ] Shortcuts use consistent styling and work on mobile devices
- [ ] Pre-filled values can be manually changed if needed

### Data Integrity
- [ ] Pattern analysis considers last 100 transactions and updates in real-time
- [ ] Shortcuts with deleted accounts/categories automatically removed
- [ ] Pattern analysis respects user data privacy (no cross-user data)

## Implementation Plan

TBD

