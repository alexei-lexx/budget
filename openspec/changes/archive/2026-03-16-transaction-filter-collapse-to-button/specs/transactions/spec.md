## MODIFIED Requirements

### Requirement: Transaction Filtering

The system SHALL allow users to filter transactions by account, category (including uncategorized), date range, and transaction type. Multiple filters combine with AND logic. Filters are applied explicitly via an "Apply" button. The filter panel is toggled open and closed via a dedicated Filter button in the page header action bar; the panel is hidden by default.

#### Scenario: Filter by account

- GIVEN the user selects one or more accounts from the account filter and clicks "Apply"
- WHEN the filter is applied
- THEN only transactions from the selected accounts are displayed

#### Scenario: Filter by category including uncategorized

- GIVEN the user selects one or more categories (or "Uncategorized") from the category filter and clicks "Apply"
- WHEN the filter is applied
- THEN only transactions matching the selected categories are displayed

#### Scenario: Filter by date range

- GIVEN the user sets a "date after" and/or "date before" value and clicks "Apply"
- WHEN the filter is applied
- THEN only transactions with a user-provided transaction date within the specified inclusive range are displayed

#### Scenario: Filter by transaction type

- GIVEN the user selects one or more types (INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT) and clicks "Apply"
- WHEN the filter is applied
- THEN only transactions of the selected types are displayed

#### Scenario: Multiple filter types combine with AND logic

- GIVEN the user selects filters on account, category, date range, and type and clicks "Apply"
- WHEN the filter is applied
- THEN only transactions matching all active filter criteria simultaneously are displayed

#### Scenario: Clearing filters restores all transactions

- GIVEN filters are currently applied
- WHEN the user clicks "Clear" and then "Apply"
- THEN all transactions are displayed

#### Scenario: No matching results shows an empty state

- GIVEN filter criteria are active
- WHEN no transactions match the criteria
- THEN an empty list with a "No transactions found" message is displayed

#### Scenario: Closing the filter panel does not apply filters

- GIVEN the filter panel is open and the user has selected but not yet applied filter criteria
- WHEN the user closes the panel by clicking the Filter button
- THEN the pending selections are preserved but not applied, and the transaction list is unchanged

### Requirement: Filter Panel Access

The system SHALL provide a Filter toggle button in the Transactions page header action bar, positioned before the "Add Transaction" and "Add Transfer" buttons. The filter panel SHALL be hidden by default and toggled by clicking the Filter button.

#### Scenario: Filter button opens the panel

- GIVEN the filter panel is closed
- WHEN the user clicks the Filter button
- THEN the filter panel expands inline below the page header

#### Scenario: Filter button closes the panel

- GIVEN the filter panel is open
- WHEN the user clicks the Filter button again
- THEN the filter panel collapses

#### Scenario: Filter button shows active-filter indicator when filters are applied

- GIVEN one or more filters are currently applied
- WHEN the user views the Transactions page header
- THEN the Filter button displays a dot badge indicating active filters

#### Scenario: Filter button dot badge is absent when no filters are applied

- GIVEN no filters are currently applied
- WHEN the user views the Transactions page header
- THEN the Filter button displays no badge

#### Scenario: Filter button is responsive

- GIVEN the user is on a desktop viewport (md breakpoint and above)
- WHEN the user views the Transactions page header
- THEN the Filter button shows a label and an icon

#### Scenario: Filter button is icon-only on mobile

- GIVEN the user is on a mobile viewport (below md breakpoint)
- WHEN the user views the Transactions page header
- THEN the Filter button shows only an icon with an accessible aria-label

### Requirement: Filter Button Labels and Placement

The system SHALL label the transaction filter action buttons "Apply" and "Clear", with "Clear" positioned on the left and "Apply" positioned on the right, consistent with the form button placement used throughout the application.

#### Scenario: Filter buttons use concise labels

- GIVEN the transaction filter panel is open
- WHEN the user views the action buttons
- THEN one button is labeled "Apply" and another is labeled "Clear"

#### Scenario: Button placement follows application-wide form layout

- GIVEN the transaction filter panel is open
- WHEN the user views the bottom of the filter panel
- THEN the "Clear" button is on the left and the "Apply" button is on the right
