## ADDED Requirements

### Requirement: Create Compound Transaction via MCP

The system SHALL provide an MCP tool named `create_compound_transaction` that lets an agent record two or more related transactions, sharing one account and one date, on behalf of the authenticated user, in a single atomic operation. The tool SHALL enforce the same business rules as transaction creation elsewhere in the system, and SHALL reject a request that violates those rules without creating any transaction.

**Requires guides:** `basics`, `create-transaction`

**Input:**

- `type` (required, enum: `INCOME`, `EXPENSE`, `REFUND`) — transaction type shared by every leg
- `accountId` (required, string, UUID) — account to record the transactions against
- `date` (required, string, format `YYYY-MM-DD`) — transaction date shared by every leg
- `expectedTotal` (required, number, positive) — the total amount the legs must sum to
- `legs` (required, array of objects, minimum 2 entries) — the transactions to create, each with:
  - `amount` (required, number, positive)
  - `categoryId` (optional, string, UUID)
  - `description` (optional, string, max 500 characters)
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`, `create-transaction`

**Returns (on success):** an array of the created transaction objects, each with `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, `description`, and a `compoundTransaction` object containing `id` and `totalAmount`.

**Returns (on failure):** a failure result describing the violated rule; no transaction is created.

**Validation:**

- `legs` MUST contain at least 2 entries
- the sum of every leg's `amount` MUST equal `expectedTotal`
- every leg's `categoryId` MUST be distinct from every other leg's `categoryId`; at most one leg MAY omit `categoryId`
- each leg is validated against the same business rules as `create_transaction` (account ownership, category type matching the shared `type`, positive amount, and so on)

#### Scenario: Agent creates a valid compound transaction

- **GIVEN** an authenticated MCP connection and an `accountId` the user owns
- **WHEN** the agent invokes `create_compound_transaction` with 2 or more `legs` whose amounts sum to `expectedTotal`, and valid `basics` and `create-transaction` guide tokens
- **THEN** one transaction is recorded per leg, all sharing the given `accountId` and `date`, and each returned transaction carries the same `compoundTransaction.id` and a `compoundTransaction.totalAmount` equal to `expectedTotal`

#### Scenario: Fewer than 2 legs is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_compound_transaction` with 0 or 1 entries in `legs`
- **THEN** no transaction is created and the tool returns a failure describing what was invalid

#### Scenario: Leg amounts that do not sum to the expected total are rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_compound_transaction` with `legs` whose amounts do not sum to `expectedTotal`
- **THEN** no transaction is created and the tool returns a failure describing what was invalid

#### Scenario: Duplicate or repeated uncategorised legs are rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_compound_transaction` with two or more legs sharing the same `categoryId`, or with more than one leg omitting `categoryId`
- **THEN** no transaction is created and the tool returns a failure describing what was invalid

#### Scenario: An invalid leg rejects the entire call

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_compound_transaction` where one leg violates a business rule (for example a nonexistent category, a category type that does not match the shared `type`, or a non-positive amount), even though the other legs are valid
- **THEN** no transaction is created, not even the valid legs, and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `create_compound_transaction` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_compound_transaction` without a valid token for `basics`, for `create-transaction`, or for both
- **THEN** the tool returns a failure naming the missing required guide(s) and no transaction is recorded
