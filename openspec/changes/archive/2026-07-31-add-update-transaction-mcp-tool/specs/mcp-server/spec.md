## ADDED Requirements

### Requirement: Update Transaction via MCP

The system SHALL provide an MCP tool named `update_transaction` that lets an agent update an existing transaction's account, amount, category, date, description, and/or type on behalf of the authenticated user. The tool SHALL enforce the same business rules as transaction updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the transaction.

**Input:**

- `id` (required, string, UUID) — transaction to update
- `accountId` (optional, string, UUID) — new account to associate the transaction with
- `amount` (optional, number, positive) — new transaction amount
- `categoryId` (optional, string, UUID, or `null`) — new category to assign; `null` removes the current category assignment
- `date` (optional, string, format `YYYY-MM-DD`) — new transaction date
- `description` (optional, string, max 500 characters, or `null`) — new description; `null` clears the current description
- `type` (optional, enum: `INCOME`, `EXPENSE`, `REFUND`) — new transaction type (transfers are not settable through this tool)

**Returns (on success):** the updated transaction object, with:

- `id` (string)
- `accountId` (string)
- `categoryId` (string, absent when uncategorised)
- `type` (enum: `INCOME`, `EXPENSE`, `REFUND`, `TRANSFER_IN`, `TRANSFER_OUT`)
- `amount` (number)
- `currency` (string) — inherited from the account
- `date` (string, format `YYYY-MM-DD`)
- `description` (string, absent when not set)

**Returns (on failure):** a failure result describing the violated rule; the transaction is left unchanged.

#### Scenario: Agent updates a transaction's fields

- **GIVEN** an authenticated MCP connection and an `id` for a transaction the user owns
- **WHEN** the agent invokes `update_transaction` with any combination of a valid `accountId`, `amount`, `categoryId`, `date`, `description`, and `type`
- **THEN** only the supplied fields are changed and the tool returns the updated transaction's `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, and `description`

#### Scenario: Agent clears a transaction's category or description

- **GIVEN** an authenticated MCP connection and an `id` for a transaction the user owns
- **WHEN** the agent invokes `update_transaction` with `categoryId` and/or `description` explicitly set to `null`
- **THEN** the corresponding field is cleared on the transaction

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_transaction` with details that violate a business rule (for example a nonexistent transaction, a nonexistent account or category, a category whose type does not match the transaction's type, or an amount that is not positive)
- **THEN** the transaction is left unchanged and the tool returns a failure describing what was invalid
