# Feature Specification: Transaction Filtering

**Feature Branch**: `003-transaction-filtering`
**Created**: 2025-10-19
**Status**: Draft
**Input**: User description: "transaction filtering. on the transactions page, I want to have the following filters: by account as a multiselect dropdown list, by category as a multiselect dropdown list including uncategorized, by transaction date after inclusive (not creation date, but date that can be entered by user), by transaction date before inclusive, by transaction type as a multiselect dropdown (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT). Each of these filters can work individually, 2+ together and all together as well. Filter order: Account → Category → Date Range → Type."

## Clarifications

### Session 2025-10-19

- Q: When no transactions match the applied filter criteria, what should users see? → A: Empty list with generic "No transactions found" message
- Q: When user selects an invalid date range (date-after is later than date-before), what should happen? → Show error message to user "Invalid date range: From date must be before or equal to To date"
- Q: Should the "Load More" button continue to work when filters are active? → A: Yes, "Load More" loads additional transactions matching the current active filters
- Q: Should the "Apply" button be disabled when no filter changes have been made since the last application? → A: No, keep button enabled at all times (allow re-applying same filters)
- Q: What visual feedback should indicate which filters are currently active vs. selected but not yet applied? → A: no visual feedback needed
- Q: Should transaction type filter support multi-select? → A: Yes, multi-select required (e.g., user can select "INCOME + TRANSFER_IN" to see all money received)
- Q: What DynamoDB indexes should be used for filtering performance? → A: Use existing UserDateIndex and UserCreatedAtIndex with FilterExpression for account/category/type filters (no new GSIs needed - cost/complexity analysis shows FilterExpression is optimal for personal finance app scale)

## User Scenarios & Testing

### User Story 1 - Filter by Account (Priority: P1)

Users need to view transactions for specific accounts to understand spending patterns within individual accounts.

**Why this priority**: Most critical filter as users typically manage transactions per account. Enables basic filtering functionality and establishes the foundation for multi-filter combinations.

**Independent Test**: Can be fully tested by selecting one or more accounts from the filter dropdown and verifying only transactions from selected accounts appear in the list.

**Acceptance Scenarios**:

1. **Given** user is on the transactions page, **When** user selects a single account from the account filter dropdown and clicks the "Apply" button, **Then** only transactions from that account are displayed
2. **Given** user is on the transactions page, **When** user selects multiple accounts from the account filter dropdown and clicks the "Apply" button, **Then** transactions from all selected accounts are displayed
3. **Given** user has selected account filters but not clicked "Apply", **When** user makes changes to the selection, **Then** the transaction list does not update until "Apply" is clicked
4. **Given** user has applied an account filter, **When** user clears the account filter selection and clicks "Apply", **Then** all transactions are displayed again

---

### User Story 2 - Filter by Category (Priority: P1)

Users need to view transactions by category (including uncategorized) to analyze spending patterns across different expense or income types.

**Why this priority**: Equally critical as account filtering. Category analysis is a primary use case for personal finance tracking. Users need to see both categorized and uncategorized transactions.

**Independent Test**: Can be fully tested by selecting one or more categories (including "uncategorized" option) from the category filter dropdown and verifying only matching transactions appear.

**Acceptance Scenarios**:

1. **Given** user is on the transactions page, **When** user selects a single category from the category filter dropdown and clicks the "Apply" button, **Then** only transactions with that category are displayed
2. **Given** user is on the transactions page, **When** user selects multiple categories from the category filter dropdown and clicks the "Apply" button, **Then** transactions with any of the selected categories are displayed
3. **Given** user is on the transactions page, **When** user selects "uncategorized" from the category filter and clicks the "Apply" button, **Then** only transactions without a category are displayed
4. **Given** user has selected category filters but not clicked "Apply", **When** user makes changes to the selection, **Then** the transaction list does not update until "Apply" is clicked
5. **Given** user has applied a category filter, **When** user clears the category filter selection and clicks "Apply", **Then** all transactions are displayed again

---

### User Story 3 - Filter by Date Range (Priority: P2)

Users need to view transactions within specific date ranges to analyze spending for particular time periods (monthly budgets, quarterly reviews, tax preparation).

**Why this priority**: Important for time-based analysis but requires both account and category filters to be functional first for comprehensive filtering scenarios.

**Independent Test**: Can be fully tested by setting date-after and/or date-before values and verifying only transactions with transaction dates within the specified range appear.

**Acceptance Scenarios**:

1. **Given** user is on the transactions page, **When** user sets a "date after" value and clicks the "Apply" button, **Then** only transactions with transaction date on or after that date are displayed
2. **Given** user is on the transactions page, **When** user sets a "date before" value and clicks the "Apply" button, **Then** only transactions with transaction date on or before that date are displayed
3. **Given** user is on the transactions page, **When** user sets both "date after" and "date before" values and clicks the "Apply" button, **Then** only transactions with transaction dates within that inclusive range are displayed
4. **Given** user has set date filter values but not clicked "Apply", **When** user makes changes to the dates, **Then** the transaction list does not update until "Apply" is clicked
5. **Given** user has applied date filters, **When** user clears the date filter values and clicks "Apply", **Then** all transactions are displayed again

---

### User Story 4 - Filter by Transaction Type (Priority: P2)

Users need to view transactions by type (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT) to analyze cash flow patterns and differentiate between regular transactions and transfers.

**Why this priority**: Important for understanding money flow. Users often want to see "only expenses" or "all sources of income" (INCOME + TRANSFER_IN). Multi-select support enables flexible analysis.

**Independent Test**: Can be fully tested by selecting one or more transaction types from the type filter dropdown and verifying only transactions of selected types appear.

**Acceptance Scenarios**:

1. **Given** user is on the transactions page, **When** user selects a single transaction type from the type filter dropdown and clicks the "Apply" button, **Then** only transactions of that type are displayed
2. **Given** user is on the transactions page, **When** user selects multiple transaction types from the type filter dropdown and clicks the "Apply" button, **Then** transactions of any selected type are displayed
3. **Given** user wants to see all money received, **When** user selects both "INCOME" and "TRANSFER_IN" types and clicks "Apply", **Then** only income and transfer-in transactions are displayed
4. **Given** user has selected type filters but not clicked "Apply", **When** user makes changes to the selection, **Then** the transaction list does not update until "Apply" is clicked
5. **Given** user has applied a type filter, **When** user clears the type filter selection and clicks "Apply", **Then** all transactions are displayed again

---

### User Story 5 - Combine Multiple Filters (Priority: P3)

Users need to apply multiple filters simultaneously to perform detailed transaction analysis (e.g., "show all grocery expenses from my checking account in October" or "show all income and transfers-in from Q1 2024").

**Why this priority**: Builds on P1 and P2 stories. Most powerful filtering capability but requires all individual filters working correctly first.

**Independent Test**: Can be fully tested by selecting combinations of account, category, date, and type filters and verifying results match all applied criteria.

**Acceptance Scenarios**:

1. **Given** user is on the transactions page, **When** user selects one or more accounts AND one or more categories and clicks the "Apply" button, **Then** only transactions matching selected accounts AND selected categories are displayed
2. **Given** user is on the transactions page, **When** user selects accounts, categories, date range, and transaction types and clicks the "Apply" button, **Then** only transactions matching all four criteria are displayed
3. **Given** user wants detailed expense analysis, **When** user selects "Checking Account", "Groceries" category, "EXPENSE" type, and date range "2024-03-01" to "2024-03-31" and clicks "Apply", **Then** only expense transactions for groceries from checking account in March 2024 are displayed
4. **Given** user has applied multiple filters, **When** user modifies one filter while others remain active and clicks "Apply", **Then** results update to reflect the new filter combination
5. **Given** user has made changes to multiple filters but not clicked "Apply", **When** user continues making changes, **Then** the transaction list does not update until "Apply" is clicked
6. **Given** user has applied multiple filters, **When** user clears all filters and clicks "Apply", **Then** all transactions are displayed

---

### Edge Cases

- When no transactions match the selected filter criteria after clicking "Apply", system displays empty list with "No transactions found" message
- How does the system handle filtering when user has no accounts or categories created yet?
- When user selects a date range where date-after is later than date-before and clicks "Apply", system treats it as a valid query and shows "No transactions found" message
- How are transfer transactions handled when filtering by account (show transfer-in and transfer-out separately)?
- What happens when user applies filters and then deletes an account or category that was part of the active filter?
- Pagination "Load More" button loads additional transactions matching the current active filters
- Apply button remains enabled at all times, allowing users to re-apply the same filters
- No visual feedback required to distinguish active filters from selected-but-not-applied filters

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a multiselect dropdown filter for accounts that displays all user's accounts
- **FR-002**: System MUST provide a multiselect dropdown filter for categories that displays all user's categories plus an "uncategorized" option
- **FR-003**: System MUST provide a date-after filter input that accepts dates and filters transactions with transaction date on or after the specified date (inclusive)
- **FR-004**: System MUST provide a date-before filter input that accepts dates and filters transactions with transaction date on or before the specified date (inclusive)
- **FR-005**: System MUST provide a multiselect dropdown filter for transaction types that displays all transaction types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)
- **FR-006**: System MUST allow each filter to work independently (account only, category only, date-after only, date-before only, type only)
- **FR-007**: System MUST allow any combination of 2 or more filters to work together (account + category, account + type, category + date-after, etc.)
- **FR-008**: System MUST allow all filter types to work together simultaneously (account + category + date range + type)
- **FR-009**: System MUST filter based on transaction date (user-entered date field) NOT the creation timestamp
- **FR-010**: System MUST apply AND logic when multiple filter types are active (transaction must match ALL active filters)
- **FR-011**: System MUST apply OR logic within the same multiselect filter (transaction matches ANY selected account OR ANY selected category OR ANY selected type)
- **FR-012**: System MUST display "uncategorized" option in the category filter for transactions without a category
- **FR-013**: System MUST present filters in the following order: Account, Category, Date Range, Type
- **FR-014**: System MUST provide an "Apply" button that activates selected filter criteria and updates the transaction list only when clicked, not when filter selections are changed (button remains enabled at all times)
- **FR-015**: System MUST persist filter selections during the current session (until user navigates away or clears filters)
- **FR-016**: System MUST provide a clear/reset option to remove all filter selections (requires clicking "Apply" to take effect)
- **FR-017**: System MUST display an empty list with "No transactions found" message when no transactions match the current filter criteria
- **FR-018**: System MUST respect pagination when filters are active (load more transactions matching current filters)
- **FR-019**: System MUST use existing DynamoDB indexes (UserDateIndex, UserCreatedAtIndex) with FilterExpression for account/category/type filtering (no new GSIs required)
- **FR-020**: System MUST handle multi-select filters efficiently by using DynamoDB FilterExpression with IN conditions for account IDs, category IDs, and transaction types

### Key Entities

- **Transaction Filter State**: Represents active filter selections including selected account IDs, selected category IDs (including uncategorized flag), selected transaction types, date-after value, and date-before value
- **Account Filter Options**: List of all user's accounts available for filtering
- **Category Filter Options**: List of all user's categories plus an "uncategorized" option for transactions without categories
- **Type Filter Options**: List of all transaction types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT) available for filtering

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can filter transactions by selecting one or more accounts, clicking "Apply", and see results update within 1 second
- **SC-002**: Users can filter transactions by selecting one or more categories (including uncategorized), clicking "Apply", and see results update within 1 second
- **SC-003**: Users can filter transactions by date range, clicking "Apply", and see results update within 1 second
- **SC-004**: Users can filter transactions by selecting one or more transaction types, clicking "Apply", and see results update within 1 second
- **SC-005**: Users can apply all filter types simultaneously (account + category + date + type) and receive accurate results matching all criteria within 1 second
- **SC-006**: 95% of filter operations complete without errors or unexpected behavior
- **SC-007**: Users can successfully find specific transactions using filters in under 30 seconds
- **SC-008**: Pagination continues to work correctly with filters applied, loading additional matching transactions
- **SC-009**: Query performance remains under 200ms even for worst-case filtering scenarios (no date filter, scanning all transactions)

## Assumptions

- Users are already familiar with the existing transactions page and its expandable card design
- The transaction date field already exists and is populated for all transactions
- Account and category dropdowns will display items in a consistent order (alphabetically or by creation date)
- Filter state resets when user navigates away from the transactions page (no persistent filter preferences across sessions)
- Date inputs will use standard date picker components consistent with the application's existing UI patterns
- "Uncategorized" will be clearly labeled and treated as a special category option in the filter
- Transfer transactions will be filtered based on the account in the transaction record (transfer-out filters on source account, transfer-in filters on destination account)
- The "Apply" button provides explicit control over when filters take effect, preventing accidental filtering while users are still making selections

## Dependencies

- Existing transactions page with transaction list display
- Existing account and category data in the system
- Transaction date and type fields must be properly populated and queryable
- Pagination system must support filtered queries
- DynamoDB table with existing UserDateIndex and UserCreatedAtIndex GSIs

## Out of Scope

- Saving filter presets or favorite filter combinations
- Advanced filtering options (amount ranges, description search, tags, merchant names)
- Export functionality for filtered transaction lists
- Filter-based analytics or summary statistics
- Filtering by transaction creation date (only transaction date is in scope)
- Creating new DynamoDB GSIs for filtering optimization (existing indexes are sufficient)
