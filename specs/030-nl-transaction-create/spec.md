# Feature Specification: Natural Language Transaction Creation

**Feature Branch**: `030-nl-transaction-create`
**Created**: 2026-03-03
**Status**: Draft
**Input**: GitHub Issue #152: "add natural language transaction creation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Expense from Short Text (Priority: P1)

A user is on the transactions page and wants to quickly log an expense. They type a short natural-language phrase (e.g., `spent 45 euro at rewe yesterday`) and submit. The system infers all required fields, creates the transaction, and it appears at the top of the list without the user filling any form fields.

**Why this priority**: This is the core value of the feature — removing friction from expense logging, which is by far the most common transaction type.

**Independent Test**: Can be fully tested by typing an expense phrase and verifying the created transaction has the correct type, amount, date, category, account, and description — delivering the primary value immediately.

**Acceptance Scenarios**:

1. **Given** I am on the transactions page, **When** I type `spent 45 euro at rewe yesterday` and submit, **Then** a transaction is created with type `expense`, amount `45`, currency matching the EUR account, category `groceries`, date set to yesterday, and description `rewe`; the input clears and the transaction appears at the top of the list.
2. **Given** I am on the transactions page, **When** I type `20` and submit, **Then** a transaction is created with type `expense`, amount `20`, the most-used account, today's date, and no category or description.
3. **Given** I am on the transactions page, **When** I type `bought coffee 3.50` and submit, **Then** a transaction is created with type `expense`, amount `3.50`, and today's date.

---

### User Story 2 - Create Income from Natural Language (Priority: P2)

A user wants to log an income transaction (e.g., a salary payment) using natural language. They type a phrase containing income indicators and the system correctly classifies it as `income`.

**Why this priority**: Income is the second most important transaction type. Correct classification from natural language is essential for users who want to log income without opening the full form.

**Independent Test**: Can be fully tested by typing income phrases like `received salary 4500 PLN` and verifying type is `income`, amount and account are correctly resolved.

**Acceptance Scenarios**:

1. **Given** I am on the transactions page, **When** I type `received salary 4500 PLN` and submit, **Then** a transaction is created with type `income`, amount `4500`, category `salary`, a PLN-currency account (most used for salary), and today's date.
2. **Given** the input contains the word `earn` or `earned`, **When** I submit, **Then** the transaction type is `income`.
3. **Given** the input contains no type indicator, **When** I submit, **Then** the transaction type defaults to `expense`.

---

### User Story 3 - Create Refund from Natural Language (Priority: P3)

A user wants to log a refund transaction using natural language. They type a phrase with `refund` and the system sets type to `refund` with the account resolved using history for the inferred category across all transaction types.

**Why this priority**: Refunds are less frequent but important for accurate financial tracking.

**Independent Test**: Can be fully tested by typing `got a refund from zalando 29.99` and verifying type is `refund`, amount and category are correctly resolved.

**Acceptance Scenarios**:

1. **Given** I am on the transactions page, **When** I type `got a refund from zalando 29.99` and submit, **Then** a transaction is created with type `refund`, amount `29.99`, category `shopping`, and the account most used for shopping (across all transaction types including expenses and incomes).
2. **Given** the input contains the word `refund`, **When** I submit, **Then** the transaction type is `refund` regardless of other keywords.

---

### User Story 4 - Error When Required Fields Cannot Be Resolved (Priority: P4)

The user submits input from which the system cannot extract the required amount. The system shows a clear error message and preserves the input text so the user can correct it.

**Why this priority**: Graceful error handling is essential for usability but lower priority than the primary happy paths.

**Independent Test**: Can be fully tested by submitting input with no numeric amount and verifying the error state and field preservation.

**Acceptance Scenarios**:

1. **Given** I submit input with no numeric or written amount value (e.g., `bought something`), **Then** an error message is shown and the input field retains its original text unchanged.
2. **Given** I have no accounts configured, **When** I submit any valid input, **Then** an error message is shown indicating no accounts are available and the transaction is not created.

---

### Edge Cases

- What happens when the input mentions a currency that matches no existing account?
- What happens when there is no transaction history (first-time user) — account defaults to the first account in the list.
- What happens when multiple currencies are mentioned in the same input?
- What happens when the input is empty or contains only whitespace?
- What happens when the inferred category does not exist in the user's category list?
- How does the system handle ambiguous relative date references (e.g., `last Monday` near a week boundary)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a natural-language input field on the transactions page.
- **FR-002**: System MUST infer transaction `type` from keywords in the input; it MUST default to `expense` when no type indicator is present.
  - Income indicators: `salary`, `earn`, `earned`, `received`
  - Refund indicators: `refund`
  - Expense indicators: `spent`, `bought`, `paid`
- **FR-003**: System MUST extract the transaction `amount` from numeric or written numeric values in the input.
- **FR-004**: System MUST infer the transaction `category` from store names, product names, and keywords when determinable (for all transaction types); it MUST omit the category when not determinable.
- **FR-005**: System MUST resolve the transaction `account` using the following ordered algorithm:
  1. Fetch all user accounts. If none exist, display an error and abort.
  2. If the input mentions a currency, narrow candidates to accounts with that currency.
  3. If a category was inferred, use the most-used account for recent transactions in that category (across all transaction types).
  4. Otherwise, use the most-used account across all recent transactions regardless of category.
  5. If no transaction history exists, use the first account.
- **FR-006**: System MUST display an error and abort transaction creation when no accounts exist.
- **FR-007**: System MUST parse a `date` from the input when a date or relative time reference (e.g., yesterday, last Monday) is present; it MUST default to today's date when no date is mentioned.
- **FR-008**: System MUST derive the `description` from meaningful text in the input (e.g., store name, merchant, keyword) when determinable; it MAY leave description blank when nothing meaningful can be derived.
- **FR-009**: System MUST create the transaction and clear the input field upon successful submission.
- **FR-010**: System MUST display the newly created transaction at the top of the transaction list immediately after creation.
- **FR-011**: System MUST show a user-facing error message and preserve the input text when required fields (amount or account) cannot be resolved.
- **FR-012**: The `currency` of the transaction MUST always equal the resolved account's currency; it MUST NOT be inferred as an independent transaction attribute.

### Key Entities

- **Natural Language Input**: A free-text string entered by the user from which all transaction attributes are inferred.
- **Transaction**: A persisted financial record with attributes: type (expense/income/refund), account, amount, date, category (optional), description (optional), currency (inherited from account).
- **Inference Result**: The intermediate set of resolved transaction attributes derived from parsing the input, including an error state when required fields cannot be determined.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can log a common transaction in under 10 seconds using the natural-language input field.
- **SC-002**: The system correctly infers transaction type for 100% of inputs containing the defined indicator keywords (salary, earn, earned, received, refund, spent, bought, paid).
- **SC-003**: Account resolution succeeds for 100% of valid inputs when at least one account exists — no valid submission results in an unresolved account.
- **SC-004**: When required fields cannot be resolved, 100% of error cases display a user-facing message and preserve the input text unchanged.
- **SC-005**: Successfully created transactions appear at the top of the list within the same page update as creation confirmation.
- **SC-006**: The natural-language field is discoverable on the transactions page without onboarding instructions — users identify and use it on first visit.

## Assumptions

- The system has access to the authenticated user's full list of accounts and their currencies.
- The system has access to the user's recent transaction history to determine the most-used account.
- "Most-used account" is determined by frequency (count) of past transactions, not by monetary volume.
- "Recent transactions" for account inference is bounded by a reasonable history window; the exact window is an implementation detail.
- Category inference relies on a known mapping of store/product names and keywords to categories; unknown names leave category blank.
- Date parsing handles common relative expressions (today, yesterday, last Monday, etc.) in addition to explicit date strings.
- The feature is available only to authenticated users.
- If a currency mentioned in the input matches no existing account, the currency filter is ignored and the algorithm continues with all accounts.
