# Feature Specification: Transaction Duplication

**Feature Branch**: `015-duplicate-transaction`
**Created**: 2025-12-01
**Status**: Draft
**Input**: User description: "duplicate transaction - user opens transactions list, user clicks on transaction to expand a transaction, at the right of the edit button, there is a new button 'clone' or 'duplicate', user click on it, transaction create form is opened with all fields prefilled with data from the original transaction"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Transaction Duplication (Priority: P1)

Users need to quickly create a new transaction based on an existing one without manually re-entering all the details. This is common for recurring expenses or similar transactions that happen frequently.

**Why this priority**: This is the core feature that delivers the primary value - saving users time by avoiding repetitive data entry. Without this, the feature has no value.

**Independent Test**: Can be fully tested by expanding any transaction, clicking the duplicate button, and verifying that the create form opens with all fields prefilled. Delivers immediate value by reducing data entry time.

**Acceptance Scenarios**:

1. **Given** a user is viewing the transactions list, **When** they click on a transaction to expand it, **Then** they see a "Duplicate" button positioned to the right of the "Edit" button
2. **Given** a transaction is expanded, **When** the user clicks the "Duplicate" button, **Then** the transaction create form opens with all fields prefilled from the original transaction
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

- What happens when duplicating a transfer transaction? (Only the selected transaction is duplicated; transfer relationship is not preserved in the duplicate)
- What happens when duplicating a refund transaction? (Duplicate is created as a regular transaction; refund relationship is not preserved)
- What happens when duplicating a transaction with a deleted account? (Duplicate form shows the account even if deleted, allowing user to select a new active account)
- What happens when duplicating a transaction with a deleted category? (Duplicate form shows the category even if deleted, allowing user to select a new active category or leave uncategorized)
- What happens if the user tries to duplicate while another transaction form is already open? (Current form behavior applies - either close existing or prevent opening new)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a "Duplicate" button on each expanded transaction card, positioned to the right of the "Edit" button
- **FR-002**: System MUST open the transaction create form when the user clicks the "Duplicate" button
- **FR-003**: System MUST prefill all transaction fields in the create form with values from the original transaction, including: date, amount, currency, account, category, description, and transaction type
- **FR-004**: System MUST allow users to modify any prefilled field before saving the duplicated transaction
- **FR-005**: System MUST create a new transaction with a unique identifier when the user saves the duplicate, leaving the original transaction unmodified
- **FR-006**: System MUST NOT preserve transfer relationships when duplicating a transfer transaction (duplicate as a standalone transaction)
- **FR-007**: System MUST NOT preserve refund relationships when duplicating a refund transaction (duplicate as a regular transaction)
- **FR-008**: System MUST handle duplicating transactions with deleted accounts or categories by allowing users to select replacement values
- **FR-009**: System MUST provide the same validation on duplicated transactions as new transactions (amount must be non-zero, account must be selected, etc.)

### Key Entities

- **Transaction**: Represents a financial transaction with attributes including date, amount, currency, account, category (optional), description (optional), transaction type (INCOME/EXPENSE/TRANSFER_IN/TRANSFER_OUT), and relationships to other transactions (transfers, refunds)
- **Transaction Create Form**: UI component that accepts transaction data and creates new transactions, supporting prefilled values

### Assumptions

The following assumptions are made based on common industry patterns and user behavior:

1. **Date Handling**: When duplicating a transaction, the date field is prefilled with the original transaction's date. Users can modify this to today's date or any other date before saving. (Rationale: Users may want to duplicate historical patterns or create new occurrences with specific dates)
2. **Transfer Transactions**: When duplicating a transfer transaction, only the selected transaction is duplicated, and the transfer relationship is not preserved. The duplicate is created as a standalone transaction. (Rationale: Users likely want to create a similar transaction without automatically creating the linked transfer)
3. **Refund Transactions**: When duplicating a refund transaction, the duplicate is created as a regular transaction without the refund relationship. (Rationale: Refunds are typically one-time corrections; duplicating them as regular transactions is more useful)
4. **Deleted Accounts/Categories**: When duplicating a transaction with a deleted account or category, the form shows the deleted item but allows the user to select a replacement. (Rationale: Users need to see what was originally selected and make an informed choice about the replacement)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can duplicate a transaction and save it in under 30 seconds
- **SC-002**: 95% of users successfully duplicate and save a transaction on their first attempt
- **SC-003**: All transaction fields are accurately copied from the original transaction to the prefilled form with 100% accuracy
- **SC-004**: Transaction duplication reduces average data entry time for similar transactions by at least 60% compared to manual entry
- **SC-005**: Zero instances of duplicated transactions modifying or affecting the original transaction
