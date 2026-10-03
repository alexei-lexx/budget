## ADDED Requirements

### Requirement: Delete Account via MCP

The system SHALL provide an MCP tool named `delete_account`. It lets an agent delete an account on behalf of the authenticated user. The tool SHALL delete only an account created within the last hour. The tool SHALL reject an older account and leave it unchanged. Deletion SHALL behave as account deletion elsewhere in the system. The account is archived. Its transactions are kept. The tool SHALL declare itself destructive to MCP clients.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — account to delete
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the deleted account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean, `true`)

**Returns (on failure):** a failure result describing the reason; the account is left unchanged.

#### Scenario: Agent deletes a recently created account

- **GIVEN** an authenticated MCP connection and an account the user owns
- AND the account was created less than one hour ago
- **WHEN** the agent invokes `delete_account` with the account's `id` and a valid `basics` guide token
- **THEN** the account is archived
- AND its transactions are kept
- AND the tool returns the account's `id`, `name`, `currency`, and `isArchived`

#### Scenario: Agent tries to delete an account older than one hour

- **GIVEN** an authenticated MCP connection and an account the user owns
- AND the account was created more than one hour ago
- **WHEN** the agent invokes `delete_account` with the account's `id` and a valid `basics` guide token
- **THEN** the account is left unchanged
- AND the tool returns a failure stating that only accounts created within the last hour can be deleted, and that older accounts must be deleted in the app

#### Scenario: Agent tries to delete a nonexistent account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_account` with an `id` that matches no account the user owns and a valid `basics` guide token
- **THEN** no account is changed
- AND the tool returns a failure stating that the account was not found

#### Scenario: Agent invokes `delete_account` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_account` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide
- AND the account is left unchanged

### Requirement: Delete Category via MCP

The system SHALL provide an MCP tool named `delete_category`. It lets an agent delete a category on behalf of the authenticated user. The tool SHALL delete only a category created within the last hour. The tool SHALL reject an older category and leave it unchanged. Deletion SHALL behave as category deletion elsewhere in the system. The category is archived. Its transactions are kept. The tool SHALL declare itself destructive to MCP clients.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — category to delete
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the deleted category object, with:

- `id` (string)
- `name` (string)
- `type` (enum: `INCOME`, `EXPENSE`)
- `excludeFromReports` (boolean)
- `isArchived` (boolean, `true`)

**Returns (on failure):** a failure result describing the reason; the category is left unchanged.

#### Scenario: Agent deletes a recently created category

- **GIVEN** an authenticated MCP connection and a category the user owns
- AND the category was created less than one hour ago
- **WHEN** the agent invokes `delete_category` with the category's `id` and a valid `basics` guide token
- **THEN** the category is archived
- AND its transactions are kept
- AND the tool returns the category's `id`, `name`, `type`, `excludeFromReports`, and `isArchived`

#### Scenario: Agent tries to delete a category older than one hour

- **GIVEN** an authenticated MCP connection and a category the user owns
- AND the category was created more than one hour ago
- **WHEN** the agent invokes `delete_category` with the category's `id` and a valid `basics` guide token
- **THEN** the category is left unchanged
- AND the tool returns a failure stating that only categories created within the last hour can be deleted, and that older categories must be deleted in the app

#### Scenario: Agent tries to delete a nonexistent category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_category` with an `id` that matches no category the user owns and a valid `basics` guide token
- **THEN** no category is changed
- AND the tool returns a failure stating that the category was not found

#### Scenario: Agent invokes `delete_category` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_category` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide
- AND the category is left unchanged

### Requirement: Delete Transaction via MCP

The system SHALL provide an MCP tool named `delete_transaction`. It lets an agent delete a transaction on behalf of the authenticated user. The tool SHALL delete only a transaction created within the last hour. The tool SHALL reject an older transaction and leave it unchanged. Deletion SHALL behave as transaction deletion elsewhere in the system. The transaction is archived. Its account balance is recalculated. The tool SHALL NOT delete a transaction that belongs to a transfer. The tool SHALL declare itself destructive to MCP clients.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — transaction to delete
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the deleted transaction object, with:

- `id` (string)
- `accountId` (string)
- `categoryId` (string, absent when uncategorised)
- `type` (enum: `INCOME`, `EXPENSE`, `REFUND`)
- `amount` (number)
- `currency` (string) — inherited from the account
- `date` (string, format `YYYY-MM-DD`)
- `description` (string, absent when not set)

**Returns (on failure):** a failure result describing the reason; the transaction is left unchanged.

#### Scenario: Agent deletes a recently created transaction

- **GIVEN** an authenticated MCP connection and a transaction the user owns
- AND the transaction was created less than one hour ago
- **WHEN** the agent invokes `delete_transaction` with the transaction's `id` and a valid `basics` guide token
- **THEN** the transaction is archived
- AND the account balance recalculates without the deleted transaction
- AND the tool returns the transaction's `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, and `description`

#### Scenario: Agent tries to delete a transaction older than one hour

- **GIVEN** an authenticated MCP connection and a transaction the user owns
- AND the transaction was created more than one hour ago
- **WHEN** the agent invokes `delete_transaction` with the transaction's `id` and a valid `basics` guide token
- **THEN** the transaction and the account balance are left unchanged
- AND the tool returns a failure stating that only transactions created within the last hour can be deleted, and that older transactions must be deleted in the app

#### Scenario: Agent tries to delete a transfer leg

- **GIVEN** an authenticated MCP connection and a transaction that belongs to a transfer
- **WHEN** the agent invokes `delete_transaction` with the transaction's `id` and a valid `basics` guide token
- **THEN** the transfer and the account balances are left unchanged
- AND the tool returns a failure

#### Scenario: Agent tries to delete a nonexistent transaction

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_transaction` with an `id` that matches no transaction the user owns and a valid `basics` guide token
- **THEN** no transaction is changed
- AND the tool returns a failure stating that the transaction was not found

#### Scenario: Agent invokes `delete_transaction` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_transaction` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide
- AND the transaction is left unchanged
