# Feature Specification: Refunds

**Feature Branch**: `009-refunds`
**Created**: 2025-10-31
**Status**: Draft
**Input**: Implement refunds feature based on refunds.md specification

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Refund for an Expense Transaction (Priority: P1)

A user has purchased an item (expense transaction) and needs to return it to get money back. They should be able to quickly create a refund transaction linked to the original purchase, with sensible defaults that they can override.

**Why this priority**: Core functionality that delivers the primary value of the refunds feature. Users must be able to record money returned from previous purchases.

**Independent Test**: Can be fully tested by expanding an expense transaction, clicking "Refund", filling in the form, and verifying the refund appears in the transaction list and account balance updates correctly.

**Acceptance Scenarios**:

1. **Given** a user has an expense transaction (e.g., $100 purchase), **When** they click the "Refund" button on the expanded transaction, **Then** a refund form appears with the original transaction details shown for reference
2. **Given** the refund form is open, **When** the user doesn't modify defaults and clicks Save, **Then** a refund transaction is created with: amount = original amount, account = original account, category = empty
3. **Given** the refund form is open, **When** the user modifies the amount to $70 (partial refund), **Then** the form shows "remaining: $30.00" and creates a refund with the specified amount
4. **Given** a refund is created, **When** the user views the original expense transaction (expanded), **Then** the refund appears in the refunds list showing date, account, category, and amount

---

### User Story 2 - View Refund Impact on Original Transaction (Priority: P1)

A user needs to understand the financial impact of refunds on their original expense. When viewing an expense transaction in the collapsed state, they should see both the original amount and the remaining amount after refunds.

**Why this priority**: Critical for user understanding of their account balances and transaction history. Users need clear visibility into how refunds affect their finances.

**Independent Test**: Can be fully tested by creating an expense, creating one or more refunds, and verifying the collapsed and expanded views display correct amounts and refund details.

**Acceptance Scenarios**:

1. **Given** an expense transaction with one or more non-deleted refunds, **When** viewing the transaction in collapsed state, **Then** the original amount is displayed with strikethrough and the remaining amount is shown with normal styling
2. **Given** an expense with refunds totaling $100 (fully refunded), **When** viewing the collapsed transaction, **Then** both original ($100 strikethrough) and remaining ($0) are displayed
3. **Given** an expense transaction is expanded and has refunds, **When** viewing the expanded state, **Then** a "Refunds" section displays: each refund as a line item (date, account, category, amount) plus summary information (total refunded, remaining refundable)

---

### User Story 3 - Handle Partial Refunds Across Multiple Accounts (Priority: P2)

A user makes a purchase and receives a partial refund to one account, then receives another partial refund to a different account. The system should support directing different refunds to different accounts, even with different currencies, giving users full control.

**Why this priority**: Important for flexibility but less critical than creating and viewing individual refunds. Enables advanced use cases for multi-account refund flows.

**Independent Test**: Can be fully tested by creating an expense, then creating two refunds with different destination accounts, and verifying both refunds appear correctly and account balances reflect the deposits.

**Acceptance Scenarios**:

1. **Given** an expense of $100 in Account A, **When** creating a first refund of $70, **Then** the default account is Account A but can be changed to any other account
2. **Given** a refund form with a currency-mismatched account selected, **When** the user confirms the selection, **Then** the refund is created (system permits this with optional warning)
3. **Given** multiple refunds on the same expense to different accounts, **When** viewing account balances, **Then** each account reflects the correct refund amounts deposited to it

---

### User Story 4 - Manage Categories on Refunds (Priority: P2)

A user creates a refund and wants to optionally assign it to an income category for better financial tracking. The system should only allow income-type categories (never expense type) and should never inherit the category from the original transaction.

**Why this priority**: Important for users who want to categorize refunds separately from their original expenses, but optional since categories are not required.

**Independent Test**: Can be fully tested by creating a refund with no category (valid), then trying to create another with an income category (valid), verifying no expense categories appear in the dropdown.

**Acceptance Scenarios**:

1. **Given** a refund form is open, **When** the user clicks the Category dropdown, **Then** only income-type categories are displayed (never expense-type categories)
2. **Given** a refund form is open, **When** the user leaves the category field empty, **Then** the refund is created successfully with no category
3. **Given** a refund is created with a category, **When** viewing the refund details (expanded expense transaction), **Then** the assigned category is displayed
4. **Given** the original expense has an expense-type category, **When** creating a refund, **Then** the refund form does not inherit the original transaction's category

---

### User Story 5 - Delete a Refund Transaction (Priority: P2)

A user realizes they made a mistake recording a refund and needs to remove it. The system should support soft-deleting refunds, keeping the original transaction editable and maintaining audit history.

**Why this priority**: Important for data management but not critical to core refund creation flow. Users rarely delete transactions, but the option must exist.

**Independent Test**: Can be fully tested by creating an expense with a refund, deleting the refund via the transaction card menu, and verifying the refund no longer appears while the original transaction remains intact.

**Acceptance Scenarios**:

1. **Given** a refund transaction in the list, **When** the user clicks delete/archive (via expanded transaction menu), **Then** the refund is marked as archived (soft-delete) and removed from display
2. **Given** a refund is deleted, **When** viewing the original expense transaction, **Then** the deleted refund no longer appears in the refunds list and summary calculations exclude it
3. **Given** an expense with a deleted refund, **When** viewing the expense, **Then** the remaining amount recalculates based only on non-deleted refunds

---

### Edge Cases

- What happens when a user creates multiple refunds and the total exceeds the original amount? (System permits this intentionally for user flexibility)
- How does the system handle refunds to accounts with different currencies than the original transaction? (System permits this intentionally for user control)
- What happens when the original transaction is edited after refunds are created? (Original transaction remains editable; refunds stay linked and are not affected)
- How are deleted refunds displayed in account histories and audit logs? (Deleted refunds don't appear to users but remain in database for audit purposes)
- What happens when a user tries to create a refund for a non-expense transaction type (e.g., income, transfer)? (Refund button only available for expense transactions; system prevents refunds on non-expense types)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a refund transaction linked to an existing expense transaction that they own (users can only refund/view their own transactions)
- **FR-002**: System MUST display the original expense details (date, account, category, amount, description) in read-only form on the refund creation form
- **FR-002a**: Refund date MUST default to today's date but allow user override (matching existing transaction form behavior)
- **FR-003**: Refund amount MUST default to the original transaction amount for the first refund, or the remaining refundable amount for subsequent refunds
- **FR-004**: Users MUST be able to override the default refund amount to any positive value, including amounts exceeding the remaining refundable amount
- **FR-005**: Refund destination account MUST default to the original transaction's account but can be changed to any available account
- **FR-006**: System MUST permit refunds to be directed to accounts with different currencies than the original transaction (with optional UI warning)
- **FR-007**: Refund category MUST be optional and only allow income-type categories (never expense-type)
- **FR-008**: Refund category MUST never be inherited from the original transaction's category
- **FR-009**: System MUST allow users to enter an optional description for each refund
- **FR-010**: Refund creation form MUST include Cancel and Save buttons with consistent styling to transaction form
- **FR-010a**: Refund form error handling MUST follow existing transaction form error patterns: inline field-level errors below each field, plus summary banner at top for critical failures
- **FR-011**: System MUST display the remaining refundable amount as help text on the refund amount field
- **FR-012**: System MUST allow multiple refunds to be linked to the same original expense transaction
- **FR-013**: System MUST display related refunds within the expanded original expense transaction (nested refunds section)
- **FR-014**: System MUST display each refund as a read-only line item in the refunds section showing: date, account, category, amount (refunds in nested list are not independently expandable)
- **FR-015**: System MUST display refund summary information: total refunded amount and remaining refundable amount
- **FR-016**: System MUST display the original expense amount with strikethrough styling when the transaction has active (non-deleted) refunds
- **FR-017**: System MUST display the remaining amount with normal styling when the transaction has active refunds
- **FR-018**: System MUST display €0 if all refunds equal the original amount (not hidden)
- **FR-019**: Refund transactions MUST appear as separate items in the main transaction list with type identifier "REFUND" (independent transaction entries, like INCOME/EXPENSE/TRANSFER)
- **FR-020**: System MUST include refunds in account balance calculations as positive transactions increasing the balance
- **FR-021**: System MUST exclude deleted (archived) refunds from balance calculations
- **FR-022**: System MUST allow users to delete refunds by marking them as archived (soft-delete)
- **FR-023**: System MUST exclude deleted refunds from user-facing transaction displays
- **FR-024**: System MUST retain deleted refunds in the database linked to original transactions for audit and historical purposes
- **FR-025**: Deleting a refund MUST NOT affect the original transaction (it remains editable with additional refunds possible)
- **FR-026**: The original transaction MUST remain editable even after refunds have been created
- **FR-026a**: System MUST show a warning when user edits the original transaction amount and the new amount is less than the total refunded amount (e.g., "Refunds total $70 but new amount is $50 - remaining will be negative")
- **FR-027**: System MUST validate that refunds can only be linked to expense transactions (not income, transfer, or other types)
- **FR-027a**: System MUST prevent deletion of an original expense transaction if it has one or more active (non-deleted) refunds linked to it (show error message: "Cannot delete expense with active refunds. Delete refunds first.")
- **FR-028**: System MUST include "REFUND" transaction type in any transaction type filter/dropdown controls
- **FR-029**: System MUST include "REFUND" in all transaction type selections (e.g., report filters, transaction list filters, sorting options)
- **FR-030**: System MUST ensure existing filtering and sorting by transaction type includes REFUND type (sorted alongside INCOME/EXPENSE/TRANSFER)

### Key Entities

- **Refund**: A transaction with type `REFUND` that maintains a link to exactly one original expense transaction. Contains amount, account (destination for refund), optional category (income-type only), optional description, date, and archived status.
- **Original Transaction**: An expense transaction (`type: EXPENSE`) that can have one or more refunds linked to it. Can be edited independently of its refunds.
- **Refund Link**: The relationship between a refund transaction and its original expense transaction, enabling the system to calculate totals and track which expense was refunded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a refund transaction in under 1 minute using the refund form
- **SC-002**: Refund transaction appears in transaction list within 2 seconds of creation
- **SC-003**: Account balance updates correctly within 2 seconds to reflect refund deposit
- **SC-004**: 95% of users successfully create their first refund on first attempt without errors
- **SC-005**: Refund form displays with all default values pre-populated and clear remaining refundable amount indicator
- **SC-006**: Refund summary information (total refunded, remaining) calculates correctly and updates in real-time
- **SC-007**: Deleted refunds are removed from display within 2 seconds and no longer affect account balance calculations
- **SC-008**: Users viewing an original expense with multiple refunds can understand the financial impact at a glance (strikethrough original, normal remaining)
- **SC-009**: System supports at least 100 refunds per original transaction without performance degradation
- **SC-010**: All refund operations (create, view, delete) work correctly with accounts of different currencies

## Assumptions

- Refund type identifier in transaction lists will display as "REFUND" to match the existing INCOME/EXPENSE/TRANSFER pattern
- Account balance formula: Initial Balance + sum(INCOME) + sum(REFUND) + sum(TRANSFER_IN) - sum(EXPENSE) - sum(TRANSFER_OUT)
- **Cross-currency refunds**: Refund amount is stored and displayed in the **original transaction's currency** (not converted); destination account can be any currency; remaining refundable amount calculated only in original currency
- Deleted (archived) transactions use the same archival mechanism as other transaction types in the system
- Refund form is a **modal dialog** following the existing transaction form pattern (opens overlaying the transaction card)
- The refund form follows the same responsive layout pattern as the existing transaction form (side-by-side on desktop, stacked on mobile)
- Optional warnings for cross-currency refunds are recommended but not mandatory for MVP
- **Refunds excluded from monthly expense reports**—expense reports show only INCOME/EXPENSE/TRANSFER types; refunds remain visible in transaction list and affect account balance calculations
- Multiple refunds can be expanded/collapsed independently (each transaction card is independent)

## Clarifications

### Session 2025-10-31 (Initial)

- Q: Authorization - who can create/view refunds? → A: Users can only create and view refunds on their own expense transactions (tight isolation, matches existing codebase pattern)
- Q: Refund date assignment? → A: Refund date defaults to today but user can override (matches existing transaction form behavior)
- Q: Refund validation & error handling? → A: Defer to planning phase; investigate and follow existing transaction form error handling patterns
- Q: Original transaction editing when refunds exist? → A: Allow edit with warning if new amount < total refunded; remaining recalculates (can go negative)
- Q: Refund transaction visibility? → A: Refunds appear as separate items in main transaction list (type "REFUND") AND nested in expanded original expense view
- Q: Transaction type filtering & dropdowns? → A: New "REFUND" type must be included in all transaction type filters, dropdowns, and sorting controls throughout the application

### Session 2025-10-31 (Clarification Round)

- Q: Accessibility standard? → A: Defer to post-MVP phase
- Q: Error handling & user feedback patterns? → A: Follow existing transaction form error patterns already in the codebase (inline field errors, summary banners)
- Q: Refund display in nested list (expandable vs. read-only)? → A: Read-only line items with no nested expansion
- Q: Refund visibility when original expense is deleted? → A: Original transaction cannot be deleted if it has active refunds (prevents orphaned refunds)

### Session 2025-10-31 (Planning Clarification)

- Q: Cross-currency refund amount currency? → A: Store refund amount in **original transaction's currency**; remaining amount calculated only in original currency (e.g., $X USD regardless of destination account currency)
- Q: Monthly reports refund impact? → A: **Exclude refunds from expense reports entirely**—reports show only INCOME/EXPENSE/TRANSFER; refunds visible in transaction list and affect account balance
- Q: No income categories available (edge case)? → A: **Show empty category dropdown** (matches transaction form behavior)—category field remains optional, user can proceed without selection
- Q: Refund form display pattern? → A: **Modal dialog**—follows existing transaction form modal approach; opens overlaying transaction card from "Refund" button

## Notes

- Specification is based on the existing refunds.md document which provides comprehensive business rules and UX guidelines
- The implementation should maintain consistency with existing transaction form UI/UX patterns
- All archival/soft-delete operations should use the existing `isArchived` field pattern from other transaction types
- Authorization follows existing data isolation pattern: all GraphQL resolvers scoped to authenticated user
- Refund date field follows existing transaction form UX (default to today with override capability)
- Error handling and validation patterns to be aligned with existing transaction form during planning phase
- Refunds are independent transaction entities in the ledger (type "REFUND") but also maintain relationship link to original expense
