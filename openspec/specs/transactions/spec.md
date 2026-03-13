# Transactions Specification

## Purpose

This domain covers financial transaction management: recording, editing, and deleting income, expense, and refund transactions; browsing the transaction list with pagination, expandable cards, and description previews; filtering by account, category, date range, and type; quick entry via natural language input, transaction duplication, and quick action buttons; description autocomplete; AI-assisted category inference; and visual indicators distinguishing transaction types and deleted references. Transfer operations are covered in the Transfers domain.

## Requirements

### Requirement: Transaction Recording

The system SHALL allow users to create transactions with an account, type, amount, user-provided date, and optional category and description. Transaction amounts MUST be positive.

#### Scenario: User creates an expense transaction

- GIVEN a user on the Transactions page
- WHEN they open the transaction form, select an account and expense category, choose Expense type, enter a positive amount and date, and submit
- THEN the transaction is created and appears at the top of the transaction list

#### Scenario: Zero or negative amounts are rejected

- GIVEN the transaction creation form
- WHEN the user enters an amount of zero or less
- THEN the system prevents creation and shows a validation error

#### Scenario: New transactions appear at the top sorted by creation time

- GIVEN the transaction list is visible
- WHEN a new transaction is created
- THEN it appears at the top of the list regardless of its transaction date

### Requirement: Signed Amount Display

The system SHALL display transaction amounts with a positive sign (+) for INCOME and REFUND transactions and a negative sign (−) for EXPENSE transactions.

#### Scenario: Income transaction shows positive amount

- GIVEN an INCOME transaction in the list
- WHEN the user views the transaction
- THEN the amount is displayed with a + prefix

#### Scenario: Expense transaction shows negative amount

- GIVEN an EXPENSE transaction in the list
- WHEN the user views the transaction
- THEN the amount is displayed with a − prefix

### Requirement: Transaction Editing

The system SHALL allow users to edit any field of an existing transaction, with account balances recalculating immediately after the edit is saved.

#### Scenario: User edits a transaction

- GIVEN an existing transaction
- WHEN the user changes the amount, category, account, or any other field and saves
- THEN the updated values are reflected in the transaction list
- AND the affected account balance recalculates

### Requirement: Transaction Deletion

The system SHALL allow users to delete transactions with confirmation, updating account balances immediately.

#### Scenario: User deletes a transaction

- GIVEN an existing transaction
- WHEN the user initiates deletion and confirms
- THEN the transaction is removed from the list
- AND the account balance recalculates without the deleted transaction

### Requirement: Refund Transactions

The system SHALL support a REFUND transaction type that increases the account balance, accepts expense categories, and is excluded from expense report totals.

#### Scenario: User creates a refund transaction

- GIVEN the transaction form is open
- WHEN the user selects the REFUND tab, fills in account, amount, and date, and saves
- THEN a REFUND transaction is created and the account balance increases by the refund amount

#### Scenario: Refund can be assigned an expense category

- GIVEN the REFUND tab is selected in the transaction form
- WHEN the user selects an expense category and saves
- THEN the category is saved with the refund transaction

#### Scenario: Refund is excluded from expense reports

- GIVEN REFUND transactions exist
- WHEN the user views the monthly expense report
- THEN refund transaction amounts are not included in expense totals

#### Scenario: Refund category is preserved when the edit form is opened

- GIVEN a refund transaction with a category assigned
- WHEN the user opens the edit form
- THEN the category field is pre-populated with the assigned category
- AND saving without changing the category preserves the original assignment

### Requirement: Expandable Transaction Cards

The system SHALL display transaction cards in a collapsed state by default, expanding on click to reveal the description and action buttons, with multiple cards expandable independently.

#### Scenario: Collapsed card shows essential information only

- GIVEN a transaction card in its default collapsed state
- WHEN the user views the transactions list
- THEN only the transaction date, account name, category name, and signed amount are visible

#### Scenario: Clicking a collapsed card expands it

- GIVEN a collapsed transaction card
- WHEN the user clicks on it
- THEN the card expands showing the full description on the left and edit/delete buttons on the right

#### Scenario: Clicking an expanded card collapses it

- GIVEN an expanded transaction card
- WHEN the user clicks on the card body (not on action buttons)
- THEN the card collapses back to showing only the essential information

#### Scenario: Action button clicks do not collapse the card

- GIVEN an expanded transaction card
- WHEN the user clicks the edit or delete button
- THEN the respective action is triggered and the card remains expanded

#### Scenario: Long descriptions wrap without truncation in expanded view

- GIVEN an expanded transaction card with a long description
- WHEN the description is displayed in the expanded section
- THEN the full text wraps to multiple lines without truncation

#### Scenario: Multiple cards can be expanded simultaneously

- GIVEN multiple transaction cards on the page
- WHEN the user expands several cards
- THEN each expanded card maintains its expanded state independently

### Requirement: Description Preview in Collapsed Cards

The system SHALL display a truncated description preview in the collapsed card header line when a description is present, and hide it from the header when the card is expanded.

#### Scenario: Collapsed card shows description in header

- GIVEN a transaction with a description
- WHEN the card is in collapsed state
- THEN the header line shows: account name _ category name _ description (truncated if it exceeds available width)

#### Scenario: No description shown when transaction has none

- GIVEN a transaction with no description
- WHEN the card is in collapsed state
- THEN the header shows only account name \* category name

#### Scenario: Description is hidden from header when card is expanded

- GIVEN a transaction with a description that is in expanded state
- WHEN viewing the card header
- THEN only account name and category name appear in the header
- AND the full description is visible in the expanded section below

#### Scenario: Description reappears in header when card is collapsed again

- GIVEN an expanded transaction card with a description
- WHEN the user collapses the card
- THEN the description preview reappears in the header line

### Requirement: Visual Distinction Between Transaction Types

The system SHALL display distinct visual indicators for income and refund transactions so users can immediately distinguish them without expanding the card.

#### Scenario: Income and refund transactions have different indicators

- GIVEN a transaction list containing both income and refund transactions
- WHEN the user views the list
- THEN income transactions and refund transactions each display a visually distinct indicator

#### Scenario: Indicators are consistent for all transactions of the same type

- GIVEN multiple income transactions and multiple refund transactions
- WHEN viewing the transaction list
- THEN all income transactions display the same indicator style and all refund transactions display the same indicator style

### Requirement: Deleted Reference Indicators

The system SHALL display archived account and category names in transaction cards with strikethrough text styling to indicate the reference is no longer active.

#### Scenario: Archived account name is struck through

- GIVEN a transaction referencing an account that has been archived
- WHEN the user views the transaction list
- THEN the account name appears with strikethrough text styling

#### Scenario: Archived category name is struck through

- GIVEN a transaction referencing a category that has been archived
- WHEN the user views the transaction list
- THEN the category name appears with strikethrough text styling

#### Scenario: Active references are displayed normally

- GIVEN a transaction whose account and category are both active
- WHEN the user views the transaction list
- THEN neither the account name nor the category name has strikethrough styling

#### Scenario: Strikethrough persists in both collapsed and expanded states

- GIVEN a transaction with an archived account reference
- WHEN the user expands the transaction card
- THEN the strikethrough styling on the account name remains visible

### Requirement: Transaction Pagination

The system SHALL load transactions in batches using a "Load More" button, supporting large transaction histories without degrading performance.

#### Scenario: Initial page load shows first batch

- GIVEN a user with more than 20 transactions
- WHEN they view the Transactions page
- THEN the first batch of transactions loads and a "Load More" button appears

#### Scenario: Load More loads the next batch

- GIVEN the "Load More" button is visible
- WHEN the user clicks it
- THEN the next batch of transactions loads and appears below the existing list

#### Scenario: Load More disappears when all transactions are shown

- GIVEN all transactions have been loaded
- WHEN viewing the page
- THEN the "Load More" button is no longer shown

#### Scenario: Pagination works with active filters

- GIVEN filters are applied to the transaction list
- WHEN the user clicks "Load More"
- THEN the next batch of transactions matching the active filters is loaded

#### Scenario: Pagination works with date filters applied

- GIVEN date range filters are applied
- WHEN the user clicks "Load More"
- THEN the next page of date-filtered transactions loads without errors or duplicates

### Requirement: Transaction Filtering

The system SHALL allow users to filter transactions by account, category (including uncategorized), date range, and transaction type. Multiple filters combine with AND logic. Filters are applied explicitly via an "Apply" button.

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

### Requirement: Description Autocomplete

The system SHALL suggest previously-used transaction descriptions as the user types in the description field, with a single selection completing the entry and enabling the save button immediately.

#### Scenario: Suggestions appear after typing

- GIVEN a user with previous transactions
- WHEN they type 2 or more characters in the description field
- THEN matching suggestions appear below the field

#### Scenario: Selecting a suggestion populates the field and closes the dropdown

- GIVEN suggestions are displayed
- WHEN the user clicks a suggestion
- THEN the description field is populated with the selected text
- AND the dropdown closes immediately without reappearing

#### Scenario: Save button enables immediately after selection

- GIVEN a suggestion has been selected and the description field is populated
- WHEN the selection completes
- THEN the save button becomes enabled without requiring any further action

#### Scenario: Suggestions are filtered by transaction type

- GIVEN a transaction type is selected
- WHEN the user types in the description field
- THEN suggestions are limited to descriptions from transactions of the same type

### Requirement: Quick Action Buttons

The system SHALL display quick action buttons for the top frequent account/category combinations when a user has sufficient transaction history, pre-filling the form on click.

#### Scenario: Quick action buttons appear with sufficient history

- GIVEN a user with 25 or more transactions to the same account/category combination
- WHEN they open the transaction form
- THEN quick action buttons appear showing up to 3 most frequent patterns

#### Scenario: Clicking a quick action pre-fills account and category

- GIVEN quick action buttons are displayed
- WHEN the user clicks a quick action button
- THEN the account and category fields are pre-filled with the corresponding values

#### Scenario: No quick actions for new users

- GIVEN a user with no transaction history
- WHEN they open the transaction form
- THEN no quick action buttons are displayed

### Requirement: Transaction Duplication

The system SHALL allow users to copy a transaction from the expanded card, opening the create form pre-filled with the original data and today's date.

#### Scenario: Copy button is visible on expanded cards

- GIVEN a transaction card is expanded
- WHEN the user views the expanded area
- THEN a "Copy" button is visible to the right of the "Edit" button

#### Scenario: Copying a standard transaction opens the pre-filled form

- GIVEN an expanded INCOME, EXPENSE, or REFUND transaction card
- WHEN the user clicks "Copy"
- THEN the transaction create form opens with all fields pre-filled from the original
- AND the date field is set to today's date

#### Scenario: Duplication does not modify the original

- GIVEN a duplicate form is open with pre-filled data
- WHEN the user saves the new transaction
- THEN a new unique transaction is created
- AND the original transaction remains unchanged

### Requirement: Natural Language Transaction Creation

The system SHALL provide a text input field on the Transactions page that accepts free-text descriptions and uses AI inference to create transactions, showing a loading state during inference and displaying errors when required fields cannot be resolved.

#### Scenario: User creates a transaction from natural language

- GIVEN the user types "spent 45 euro at rewe yesterday" into the input and submits
- WHEN the system processes the input
- THEN a transaction is created with type expense, amount 45, description "rewe", and date set to yesterday
- AND the transaction appears at the top of the list and the input field is cleared

#### Scenario: Transaction type defaults to expense when no indicator is present

- GIVEN the user types "20" and submits
- WHEN the system infers the transaction type
- THEN the transaction type defaults to expense

#### Scenario: Income keywords set the type to income

- GIVEN the user types "received salary 4500 PLN" and submits
- WHEN the system infers the transaction type
- THEN the transaction type is set to income

#### Scenario: Refund keyword sets the type to refund

- GIVEN the user types "got a refund from zalando 29.99" and submits
- WHEN the system infers the transaction type
- THEN the transaction type is set to refund

#### Scenario: Account is inferred by currency when input mentions a currency

- GIVEN the user has one account in EUR
- WHEN they type "spent 45 euro at rewe" and submit
- THEN the EUR account is automatically selected without the user specifying it

#### Scenario: AI declines when no accounts exist

- GIVEN the user has no accounts
- WHEN they submit any text
- THEN an error is shown indicating the transaction could not be created

#### Scenario: Missing amount results in an error with preserved input

- GIVEN the user submits text with no numeric or written amount value
- WHEN the system cannot resolve the required amount
- THEN an error message is displayed and the input text is preserved unchanged

#### Scenario: Ambiguous multiple amounts result in an error

- GIVEN the user submits text containing two or more distinct amount values (e.g. "paid 10 or 20 euros")
- WHEN the system cannot determine which amount to use
- THEN an error message is displayed and the input text is preserved unchanged

#### Scenario: Loading state is shown during inference

- GIVEN the user submits valid input
- WHEN the AI inference is in progress
- THEN the input field and submit button are disabled and a loading indicator is shown

#### Scenario: Empty input is blocked before reaching the AI service

- GIVEN the input field is empty or contains only whitespace
- WHEN the user attempts to submit
- THEN submission is prevented client-side without invoking the AI service

### Requirement: Category Inference from Transaction History

The system SHALL use the user's recent transaction history to improve category assignment for ambiguous inputs, while preserving semantic inference for clear matches and gracefully handling absent history.

#### Scenario: Repeated correction pattern is applied to ambiguous input

- GIVEN the user has 3 or more transactions with similar descriptions all assigned to the same category
- WHEN the user enters a new ambiguous description closely matching that pattern
- THEN the system assigns the historically-preferred category

#### Scenario: Strong semantic match takes precedence over history

- GIVEN historical transactions point toward one category
- WHEN the user enters a description with a clear semantic match to a different category
- THEN the semantically correct category is assigned

#### Scenario: New users receive category inference without transaction history

- GIVEN a user with no prior transactions
- WHEN they enter a transaction description
- THEN the system infers a category using semantic understanding without errors

#### Scenario: Conflicting history falls back to semantic inference

- GIVEN historical transactions for similar descriptions are split across multiple categories
- WHEN the user enters a new similar description
- THEN the system treats the conflict as ambiguous and falls back to semantic-only inference

### Requirement: Dialog Escape Key Dismissal

The system SHALL close any open transaction or transfer form dialog when the user
presses Escape, regardless of which element inside or around the dialog currently
holds focus.

#### Scenario: Escape closes the dialog when a form field has focus

- GIVEN a transaction or transfer form dialog is open and an input field has focus
- WHEN the user presses Escape
- THEN the dialog closes and the transactions page is shown

#### Scenario: Escape closes the dialog after an outside-click attempt

- GIVEN a transaction or transfer form dialog is open
- AND the user has previously clicked outside the dialog (triggering the wobble animation)
- WHEN the user presses Escape
- THEN the dialog closes and the transactions page is shown

#### Scenario: Clicking outside the dialog does not close it

- GIVEN a transaction or transfer form dialog is open
- WHEN the user clicks on the page backdrop outside the dialog
- THEN the dialog remains open
- AND a wobble animation plays to indicate the dialog is persistent

### Requirement: Text Input for Transaction Submission

The system SHALL provide a text input area on the Transactions page that auto-grows with content, supports keyboard submission via Enter, and includes a clear button when content is present.

#### Scenario: Pressing Enter submits the form

- GIVEN the user has typed text into the input field
- WHEN they press Enter
- THEN the form is submitted identically to clicking the submit button

#### Scenario: Clear button removes content

- GIVEN the user has typed text into the input field
- WHEN a clear icon is visible and they click it
- THEN the input content is cleared and the clear icon disappears

#### Scenario: Input area grows with multi-line content

- GIVEN the user types enough text to span multiple lines
- WHEN viewing the input area
- THEN the area grows vertically to show all content, up to a maximum of 4 rows

#### Scenario: Clear icon is not shown when input is empty

- GIVEN the input field is empty
- WHEN viewing the component
- THEN no clear icon is displayed
