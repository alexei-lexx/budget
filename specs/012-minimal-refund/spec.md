# Feature Specification: Minimal Refund Transaction Type

**Feature Branch**: `012-minimal-refund`
**Created**: 2025-11-27
**Status**: Draft
**Input**: User description: "Add REFUND transaction type with minimal implementation - new type of transaction in the transaction form, display it as a new tab in the transaction dialog, use expense categories for REFUND transactions, add REFUND type to transactions filter, show refund transactions in the transactions list similar to other transactions, refund transactions don't affect reports"

## Clarifications

### Session 2025-11-27

- Q: How does the system handle editing a REFUND transaction to change its type to INCOME or EXPENSE? → A: Users can freely switch between REFUND and other transaction types (INCOME, EXPENSE) when editing, following the same pattern as switching between income and expense
- Q: What is the scope of "other reporting calculations" that REFUND transactions should not affect? → A: REFUND excluded only from the existing expense reports (currently two reports); literal interpretation of the requirement
- Q: How should REFUND transactions be visually distinguished in the transaction list? → A: Display "REFUND" as a type label, following the same pattern as other transaction types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)
- Q: What happens when a REFUND transaction is deleted - does it affect account balance calculations correctly? → A: REFUND deletion uses soft-deletion (archiving with isArchived=true); archived refunds are excluded from balance calculations, resulting in the account balance decreasing by the refund amount
- Q: What happens if a user assigns no category to a REFUND transaction? → A: No category is valid; uncategorized refunds are stored and displayed without a category, matching the pattern for other transaction types

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create REFUND Transaction (Priority: P1)

A user receives money back from a previous purchase (e.g., returning an item, getting a refund from a service) and needs to record this in their budget tracker as a REFUND transaction.

**Why this priority**: This is the core functionality - users must be able to create refund transactions. Without this, the feature provides no value.

**Independent Test**: Can be fully tested by opening the transaction form, selecting the REFUND tab, filling in required fields (account, amount, date), optionally selecting an expense category, and saving the transaction. The transaction should appear in the transaction list with type REFUND.

**Acceptance Scenarios**:

1. **Given** the transaction form is open, **When** the user clicks the REFUND tab, **Then** the form displays fields for creating a refund transaction with expense categories available
2. **Given** the REFUND tab is selected, **When** the user fills in required fields (account, amount, date) and saves, **Then** a new REFUND transaction is created and appears in the transaction list
3. **Given** the REFUND tab is selected, **When** the user selects an expense category, **Then** the category is saved with the refund transaction
4. **Given** the user creates a REFUND transaction for $50, **When** the transaction is saved, **Then** the account balance increases by $50

---

### User Story 2 - View REFUND Transactions in List (Priority: P2)

A user wants to see all their transactions including refunds in the transaction list to understand their financial activity.

**Why this priority**: Users need visibility into refund transactions they've created. This enables basic tracking and verification but depends on P1 (creating refunds) to have any data to display.

**Independent Test**: Can be tested by creating one or more REFUND transactions and verifying they appear in the transaction list alongside other transaction types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT), displaying the same information (date, account, category, amount, description).

**Acceptance Scenarios**:

1. **Given** one or more REFUND transactions exist, **When** the user views the transaction list, **Then** refund transactions are displayed with the same layout as other transaction types
2. **Given** a REFUND transaction in the list, **When** the user views it, **Then** it shows the transaction date, account name, category (if assigned), amount, and description
3. **Given** multiple transaction types exist (INCOME, EXPENSE, REFUND, TRANSFER), **When** the user views the transaction list, **Then** REFUND transactions are visually distinguishable by their type label

---

### User Story 3 - Filter Transactions by REFUND Type (Priority: P3)

A user wants to view only their refund transactions to review all money received back from purchases.

**Why this priority**: Filtering enhances usability but is not essential for core functionality. Users can still find refunds in the unfiltered list. This is a convenience feature that builds on P1 and P2.

**Independent Test**: Can be tested by creating multiple transaction types (INCOME, EXPENSE, REFUND), opening the transaction filter, selecting the REFUND type filter, and verifying that only REFUND transactions are displayed in the list.

**Acceptance Scenarios**:

1. **Given** the transaction filter is open, **When** the user views the transaction type options, **Then** REFUND is available as a filter option alongside INCOME, EXPENSE, TRANSFER_IN, and TRANSFER_OUT
2. **Given** multiple transaction types exist, **When** the user selects the REFUND filter, **Then** only transactions with type REFUND are displayed
3. **Given** the REFUND filter is applied, **When** the user clears the filter, **Then** all transaction types are displayed again

---

### Edge Cases

- What happens when a user creates a REFUND transaction with a very large amount (e.g., exceeding typical expense amounts)?
- How does the system handle a REFUND transaction created with a date far in the past or future?
- Uncategorized REFUND transactions are valid; they are stored and displayed without a category, matching the pattern for other transaction types
- When a user edits a REFUND transaction to change its type to INCOME or EXPENSE, the system allows the conversion following the same pattern as switching between income and expense types
- When a REFUND transaction is deleted (soft-deleted with isArchived=true), it is excluded from balance calculations, resulting in the account balance decreasing by the refund amount

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add REFUND as a new transaction type in addition to existing types (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)
- **FR-002**: Transaction form MUST display a REFUND tab that allows users to create refund transactions
- **FR-003**: REFUND transaction form MUST allow users to select from expense categories when assigning a category
- **FR-004**: REFUND transaction form MUST allow users to leave the category field empty (category is optional); uncategorized refunds are valid and stored/displayed without a category, matching the pattern for other transaction types
- **FR-005**: REFUND transactions MUST increase the account balance by the refund amount (similar to INCOME transactions)
- **FR-006**: Transaction list MUST display REFUND transactions with the same layout and information as other transaction types
- **FR-007**: Transaction list MUST display "REFUND" as a type label to distinguish them from other transaction types, following the same visual pattern used for INCOME, EXPENSE, TRANSFER_IN, and TRANSFER_OUT
- **FR-008**: Transaction filter MUST include REFUND as a filter option for transaction type
- **FR-009**: REFUND transactions MUST NOT affect the existing expense reports (monthly expense report and weekday expense report)
- **FR-010**: System MUST allow editing REFUND transactions including changing amount, account, category, date, and description
- **FR-011**: System MUST allow users to change a REFUND transaction's type to INCOME or EXPENSE when editing, following the same type-switching pattern as other transaction types
- **FR-012**: System MUST allow deleting (archiving) REFUND transactions using soft-deletion (isArchived=true); archived refunds are excluded from balance calculations and transaction lists, following the same deletion behavior as other transaction types
- **FR-013**: REFUND transactions MUST support the same expandable card interaction pattern as other transactions (show/hide description and action buttons)

### Key Entities

- **REFUND Transaction**: A transaction type representing money received back from a previous purchase
  - Attributes: same as other transactions (date, account, amount, category [optional], description [optional], type=REFUND, isArchived)
  - Balance Impact: Increases account balance (positive transaction); archived refunds (isArchived=true) are excluded from balance calculations
  - Category Constraint: If assigned, must be an expense category
  - Deletion: Soft-deletion via isArchived=true flag; archived refunds excluded from balance and transaction lists
  - Report Impact: Excluded from existing expense reports (monthly expense report and weekday expense report)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a REFUND transaction in under 30 seconds using the transaction form
- **SC-002**: REFUND transactions appear immediately in the transaction list after creation
- **SC-003**: Account balances update correctly within 1 second when REFUND transactions are created, edited, or deleted
- **SC-004**: Users can successfully filter the transaction list to show only REFUND transactions
- **SC-005**: Existing expense reports (monthly expense report and weekday expense report) exclude REFUND transactions from calculations
- **SC-006**: 100% of REFUND transaction operations (create, edit, delete, filter, view) complete successfully without errors
