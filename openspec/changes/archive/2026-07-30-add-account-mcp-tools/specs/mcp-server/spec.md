## ADDED Requirements

### Requirement: Create Account via MCP

The system SHALL provide an MCP tool named `create_account` that lets an agent create a new account on behalf of the authenticated user. The tool SHALL enforce the same business rules as account creation elsewhere in the system, and SHALL reject a request that violates those rules without creating an account.

**Input:**

- `name` (required, string) — account name
- `currency` (required, string) — account currency code
- `initialBalance` (optional, number, defaults to 0) — starting balance for the account

**Returns (on success):** the created account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean)
- `initialBalance` (number)

**Returns (on failure):** a failure result describing the violated rule; no account is created.

#### Scenario: Agent creates a valid account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_account` with a `name` and `currency` that do not duplicate an existing active account
- **THEN** an account is created for that user and the tool returns the created account's `id`, `name`, `currency`, `isArchived`, and `initialBalance`

#### Scenario: Agent submits an invalid account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_account` with details that violate a business rule (for example a name that duplicates an existing active account, or an unsupported currency code)
- **THEN** no account is created and the tool returns a failure describing what was invalid

### Requirement: Update Account via MCP

The system SHALL provide an MCP tool named `update_account` that lets an agent update an existing account's name and/or currency on behalf of the authenticated user. The tool SHALL enforce the same business rules as account updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the account. The tool SHALL NOT allow changing an account's initial balance.

**Input:**

- `id` (required, string, UUID) — account to update
- `name` (optional, string) — new account name
- `currency` (optional, string) — new account currency code

**Returns (on success):** the updated account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; the account is left unchanged.

#### Scenario: Agent updates an account's name and/or currency

- **GIVEN** an authenticated MCP connection and an `id` for an account the user owns
- **WHEN** the agent invokes `update_account` with a valid `name` and/or `currency`
- **THEN** the account is updated and the tool returns the updated account's `id`, `name`, `currency`, and `isArchived`

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_account` with details that violate a business rule (for example a nonexistent account, a name that duplicates another existing active account, an unsupported currency code, or a currency change on an account that already has transactions)
- **THEN** the account is left unchanged and the tool returns a failure describing what was invalid
