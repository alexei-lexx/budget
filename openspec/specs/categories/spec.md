# Categories Specification

## Purpose

This domain covers the management and configuration of transaction categories. Categories are typed as Income or Expense, can be marked to exclude their transactions from financial reports, and display visual type indicators in the transaction filter dropdown. The same expandable card pattern used across the application applies to category cards.

## Requirements

### Requirement: Category Creation

The system SHALL allow users to create categories with a custom name and a type of either Income or Expense.

#### Scenario: User creates an income category

- GIVEN an authenticated user on the Categories page
- WHEN they select the Income section, click "Add New Category", enter a name, and submit
- THEN the category is created and appears in the Income section

#### Scenario: User creates an expense category

- GIVEN an authenticated user on the Categories page
- WHEN they select the Expense section, click "Add New Category", enter a name, and submit
- THEN the category is created and appears in the Expense section

### Requirement: Category Editing

The system SHALL allow users to edit an existing category's name.

#### Scenario: User renames a category

- GIVEN an existing category
- WHEN the user edits the category name and saves
- THEN the updated name is reflected in all transaction forms that reference it

### Requirement: Category Deletion

The system SHALL allow users to delete categories, removing them from the system and from all selection lists.

#### Scenario: User deletes a category

- GIVEN an existing category
- WHEN the user deletes it
- THEN the category is removed and no longer available for selection in transaction forms

### Requirement: Category Organization by Type

The system SHALL display categories organized in separate Income and Expense sections.

#### Scenario: User views categories organized by type

- GIVEN a user with both income and expense categories
- WHEN they view the Categories page
- THEN income categories and expense categories are displayed in separate sections

### Requirement: Category Exclusion from Reports

The system SHALL allow users to mark any category as "Exclude from reports", causing its transactions to be omitted from all report totals and breakdowns immediately and retroactively.

#### Scenario: User excludes a category from reports

- GIVEN an expense category with transactions
- WHEN the user enables "Exclude from reports" on that category
- THEN the category's transactions no longer appear in monthly report totals or breakdowns

#### Scenario: Exclusion applies retroactively to all transactions

- GIVEN a category with historical transactions
- WHEN the user enables "Exclude from reports"
- THEN all historical transactions in that category are immediately excluded from report calculations

#### Scenario: Excluded transactions remain visible in transaction history

- GIVEN a category marked as excluded from reports
- WHEN the user views the transactions list
- THEN transactions in that category still appear in the transaction list

#### Scenario: Excluded transactions still affect account balances

- GIVEN a category marked as excluded from reports
- WHEN viewing account balances
- THEN transactions in that category are still counted in balance calculations

#### Scenario: User re-includes a category in reports

- GIVEN a category with "Exclude from reports" enabled
- WHEN the user disables the option
- THEN the category's transactions are included in report totals again

### Requirement: Expandable Category Cards

The system SHALL display category cards in a collapsed state by default, revealing edit and delete actions only when the card is expanded.

#### Scenario: Category card is collapsed by default

- GIVEN a user viewing the categories list
- WHEN a card is in its default state
- THEN only the category name is visible, with no edit or delete buttons shown

#### Scenario: Clicking a collapsed card expands it

- GIVEN a collapsed category card
- WHEN the user clicks on the card
- THEN edit and delete buttons appear in the expanded area, aligned to the right

#### Scenario: Clicking an expanded card collapses it

- GIVEN an expanded category card
- WHEN the user clicks on the card body (not on action buttons)
- THEN the card returns to its collapsed state and action buttons are hidden

#### Scenario: Action button clicks do not collapse the card

- GIVEN an expanded category card
- WHEN the user clicks the edit or delete button
- THEN the respective action is triggered without collapsing the card

### Requirement: Alphabetical Category Sorting in Filter Dropdown

The system SHALL display all categories in the transaction filter dropdown in a single alphabetically sorted list, regardless of their type.

#### Scenario: Filter dropdown shows all categories in alphabetical order

- GIVEN categories named "Groceries" (expense), "Salary" (income), "Entertainment" (expense), and "Bonus" (income)
- WHEN the user opens the category filter dropdown
- THEN the categories appear in order: Bonus, Entertainment, Groceries, Salary

#### Scenario: Sorting is case-insensitive

- GIVEN categories whose names differ only in case (e.g., "Travel" and "travel")
- WHEN the user opens the category filter dropdown
- THEN both are sorted together, with case-insensitive ordering applied

### Requirement: Category Type Indicators in Filter Dropdown

The system SHALL display a colored icon for each category in the transaction filter dropdown to distinguish Income from Expense types.

#### Scenario: Each category shows a type indicator

- GIVEN categories of both income and expense types in the filter dropdown
- WHEN the user views the dropdown
- THEN each category displays a colored icon positioned to the right of its name indicating its type

#### Scenario: Same-named categories of different types are distinguishable

- GIVEN both an income category named "Refund" and an expense category named "Refund"
- WHEN the user views the category filter dropdown
- THEN each entry shows a distinct colored icon making its type immediately identifiable
