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
- [ ] Pattern analysis considers last 100 transactions of each type (100 Income + 100 Expense) and updates in real-time
- [ ] Shortcuts with deleted accounts/categories automatically removed
- [ ] Pattern analysis respects user data privacy (no cross-user data)

## Implementation Plan

### 13.1 Repository Layer
- [x] 13.1.1 Add `TransactionRepository.detectPatterns()` method to query last 100 transactions of specified type, group by account+category combination, and return top 3 most frequent patterns
- [x] 13.1.2 Implement pattern analysis logic to filter transactions with both accountId and categoryId, group by combination, sort by usage count descending
- [x] 13.1.3 Handle edge cases: new users with no transactions, users with <100 transactions, transactions missing account or category data
- [x] 13.1.4 Create comprehensive unit tests covering pattern analysis with various transaction histories, edge cases, and tie-breaking scenarios
- [x] 13.1.5 Test repository method with deleted/archived accounts and categories to ensure proper error handling

### 13.2 Service Layer
- [x] 13.2.1 Add `TransactionService.getQuickActionPatterns()` method to orchestrate pattern retrieval and validation
- [x] 13.2.2 Implement business logic to validate that pattern accounts and categories still exist and aren't archived
- [x] 13.2.3 Filter out invalid patterns and enrich results with full Account and Category objects
- [x] 13.2.4 Handle service-level edge cases: all patterns invalid due to deleted accounts/categories

### 13.3 GraphQL Layer
- [x] 13.3.1 Define `QuickActionPattern` type with account, category, and usageCount fields in GraphQL schema
- [x] 13.3.2 Add `getQuickActionPatterns(type: TransactionType!)` query to GraphQL schema
- [x] 13.3.3 Implement GraphQL resolver to call TransactionService and return formatted patterns
- [x] 13.3.4 Add input validation using Zod schema for TransactionType parameter

### 13.4 Frontend Data Layer
- [ ] 13.4.1 Generate TypeScript types from updated GraphQL schema using codegen
- [ ] 13.4.2 Create GraphQL query for getQuickActionPatterns in `frontend/src/graphql/transactions.ts`
- [ ] 13.4.3 Create `useQuickActionPatterns()` composable that fetches patterns reactively based on transaction type
- [ ] 13.4.4 Implement pattern cache invalidation and refetch after successful transaction creation

### 13.5 Frontend UI/UX Layer
- [ ] 13.5.1 Create `QuickActionButtons.vue` component to display pattern buttons with "[Account Name] + [Category Name]" format
- [ ] 13.5.2 Integrate QuickActionButtons component into transaction creation form below type tabs
- [ ] 13.5.3 Implement pattern button click handler to pre-fill account and category dropdowns and focus amount field
- [ ] 13.5.4 Add responsive design for mobile devices with touch-friendly button sizing
- [ ] 13.5.5 Show/hide quick actions contextually based on selected transaction type (Income/Expense)
- [ ] 13.5.6 Handle new user experience: hide quick actions section when no patterns available
