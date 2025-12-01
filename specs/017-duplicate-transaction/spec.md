# Feature Specification: Transaction Duplication

**Feature Branch**: `017-duplicate-transaction`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "duplicate transaction - user opens transactions list, user clicks on transaction to expand a transaction, at the right of the edit button, there is a new button 'clone' or 'duplicate', user click on it, transaction create form is opened with all fields prefilled with data from the original transaction"

## Clarifications

### Session 2025-12-01

- Q: Who can duplicate which transactions (authorization scope)? → A: Users can only duplicate their own transactions (follows existing authorization rules)
- Q: How is the transaction create form displayed (modal/page/inline)? → A: Modal dialog (same as existing transaction create/edit forms)
- Q: Should date field be set to today or keep original date? → A: Auto-update date to today (user can change if needed)
- Q: What button label should be used ("Clone", "Duplicate", or "Copy")? → A: "Copy"
- Q: Should duplication events be tracked for analytics? → A: No, don't track any duplication activity
- Q: When duplicating one side of a transfer (e.g., a 'TRANSFER_OUT' from Account A), what should the transaction type of the new, unlinked transaction be? → A: open "create new transfer" form pre-populated with current transfer
- Q: How should duplicating refunds work, given they are not linked to parent transactions? → A: Duplicating a refund will create an exact copy, just like any other standalone transaction, with the date set to today.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Transaction Duplication (Priority: P1)

Users need to quickly create a new transaction based on an existing one without manually re-entering all the details. This is common for recurring expenses or similar transactions that happen frequently.

**Why this priority**: This is the core feature that delivers the primary value - saving users time by avoiding repetitive data entry. Without this, the feature has no value.

**Independent Test**: Can be fully tested by expanding any transaction, clicking the Copy button, and verifying that the create form opens with all fields prefilled. Delivers immediate value by reducing data entry time.

**Acceptance Scenarios**:

1. **Given** a user is viewing the transactions list, **When** they click on a transaction to expand it, **Then** they see a "Copy" button positioned to the right of the "Edit" button
2. **Given** a transaction is expanded, **When** the user clicks the "Copy" button, **Then** the transaction create form opens as a modal dialog with all fields prefilled from the original transaction
3. **Given** the duplicate form is open with prefilled data, **When** the user modifies any field and saves, **Then** a new transaction is created with the modified values and the original transaction remains unchanged
4. **Given** the duplicate form is open, **When** the user cancels without saving, **Then** no new transaction is created and the user returns to the transactions list

---

### User Story 2 - Edit Before Saving Duplicated Transaction (Priority: P2)

Users need to modify the prefilled data before saving the duplicated transaction to adjust details like date, amount, or description for the new occurrence.

**Why this priority**: While duplication provides the prefilled data, users almost always need to adjust at least the date. This makes the feature practical for real-world use.

**Independent Test**: Can be tested by duplicating a transaction, modifying fields (especially date and amount), and verifying the changes are saved correctly without affecting the original.

**Acceptance Scenarios**:

1. **Given** a duplicate transaction form is open with prefilled data, **When** the user changes the date to a different day, **Then** the new transaction is saved with the updated date
2. **Given** a duplicate transaction form is open, **When** the user modifies the amount, **Then** the new transaction is saved with the updated amount
3. **Given** a duplicate transaction form is open, **When** the user changes the category, **Then** the new transaction is saved with the updated category
4. **Given** a duplicate transaction form is open, **When** the user updates the description, **Then** the new transaction is saved with the updated description

---

### Edge Cases

- What happens when duplicating a transfer transaction? (The 'Create New Transfer' form is opened, pre-populated with the original transfer's details.)
- What happens when duplicating a refund transaction? (The standard transaction create/edit form is opened, pre-filled with the exact details of the original refund.)
- What happens when duplicating a transaction with a deleted account? (Duplicate form shows the account even if deleted, allowing user to select a new active account)
- What happens when duplicating a transaction with a deleted category? (Duplicate form shows the category even if deleted, allowing user to select a new active category or leave uncategorized)
- What happens if the user tries to duplicate while another transaction form is already open? (Current form behavior applies - either close existing or prevent opening new)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Copy" button on each expanded transaction card, positioned to the right of the "Edit" button.
- **FR-002**: When the "Copy" button is clicked, the system MUST open the appropriate form based on the original transaction's type:
    - For `EXPENSE`, `INCOME`, or `REFUND` transactions, it MUST open the standard transaction create/edit modal.
    - For `TRANSFER_IN` or `TRANSFER_OUT` transactions, it MUST open the dedicated 'Create New Transfer' form.
- **FR-003**: When opening the standard transaction modal for a duplicated `EXPENSE`, `INCOME`, or `REFUND` transaction, the system MUST prefill fields as follows:
    - **Date**: Set to today's date.
    - **Amount, Currency, Account, Category, Description**: Copied from the original transaction.
    - **Transaction Type**: Copied from the original (`EXPENSE`, `INCOME`, or `REFUND`).
- **FR-004**: When opening the 'Create New Transfer' form for a duplicated transfer, the system MUST prefill fields as follows:
    - **Date**: Set to today's date.
    - **From Account**, **To Account**, **Amount**, **Description**: Copied from the original transfer.
- **FR-005**: System MUST allow users to modify any prefilled field before saving the new transaction, transfer, or refund.
- **FR-006**: System MUST create a new, unique transaction (or transaction pair for transfers) when the user saves, leaving the original transaction unmodified.
- **FR-007**: System MUST handle duplicating transactions with deleted accounts or categories by allowing users to select replacement values.
- **FR-008**: System MUST provide the same validation on all duplicated transactions as it does on new transactions.
- **FR-009**: System MUST enforce authorization checks to ensure users can only duplicate their own transactions.
- **FR-010**: System MUST NOT track or log duplication events for analytics purposes.

### Key Entities

- **Transaction**: Represents a financial transaction with attributes including date, amount, currency, account, category (optional), description (optional), transaction type (INCOME/EXPENSE/TRANSFER_IN/TRANSFER_OUT), and relationships to other transactions (transfers, refunds).
- **Transaction Create Form**: UI component that accepts transaction data and creates new transactions, supporting prefilled values, displayed as a modal dialog.
- **Transfer Create Form**: UI component for creating a transfer between two accounts.

### Assumptions

The following assumptions are made based on clarified requirements:

1. **Date Handling**: When duplicating any transaction, the date field is automatically set to today's date. Users can modify this before saving.
2. **Transfer Transactions**: When duplicating a transfer transaction, the system opens the 'Create New Transfer' form, pre-populated with data from the original. (Rationale: This directly supports the user's likely goal of performing a similar transfer.)
3. **Refund Transactions**: When duplicating a refund transaction, the duplicate is created as an exact copy of the original refund. This is consistent with the system's architecture where refunds are standalone transactions.
4. **Deleted Accounts/Categories**: When duplicating a transaction with a deleted account or category, the form shows the deleted item but allows the user to select a replacement.
5. **Authorization**: Users can only duplicate transactions they own, following the same authorization rules as viewing and editing transactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can duplicate a transaction and save it in under 30 seconds
- **SC-002**: 95% of users successfully duplicate and save a transaction on their first attempt
- **SC-003**: All transaction fields (except date) are accurately copied from the original transaction to the prefilled form with 100% accuracy, and date is set to today
- **SC-004**: Transaction duplication reduces average data entry time for similar transactions by at least 60% compared to manual entry
- **SC-005**: Zero instances of duplicated transactions modifying or affecting the original transaction
