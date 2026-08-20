## ADDED Requirements

### Requirement: Delete Account via MCP

The system SHALL provide an MCP tool named `delete_account` that lets an agent delete an existing account on behalf of the authenticated user. Deleting an account archives it: the account no longer appears in the user's active records, but its transactions are kept. The tool SHALL NOT modify the account unless the user has explicitly confirmed the deletion through MCP elicitation.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — account to delete
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Confirmation:** Before deleting, the tool elicits confirmation from the user (MCP elicitation, form mode). The confirmation message names the account, states its current transaction count, and states that its transactions are kept.

**Returns (on success):** the deleted account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean)

**Returns (on decline, cancel, or failure):** a failure result; the account is left unchanged.

#### Scenario: Agent deletes an account after the user confirms

- **GIVEN** an authenticated MCP connection, an `id` for an account the user owns, and a valid `basics` guide token
- **WHEN** the agent invokes `delete_account` and the user accepts the elicited confirmation
- **THEN** the account is deleted and the tool returns the deleted account's `id`, `name`, `currency`, and `isArchived`

#### Scenario: Confirmation message states the transaction count and that transactions are kept

- **GIVEN** an authenticated MCP connection and an `id` for an account the user owns that has transactions
- **WHEN** the agent invokes `delete_account`
- **THEN** the elicited confirmation message names the account, states its transaction count, and states that its transactions will be kept

#### Scenario: User declines the confirmation

- **GIVEN** an authenticated MCP connection and an `id` for an account the user owns
- **WHEN** the agent invokes `delete_account` and the user declines the elicited confirmation
- **THEN** the account is left unchanged and the tool returns a failure indicating the deletion was not confirmed

#### Scenario: User cancels the confirmation

- **GIVEN** an authenticated MCP connection and an `id` for an account the user owns
- **WHEN** the agent invokes `delete_account` and the user cancels the elicited confirmation without an explicit choice
- **THEN** the account is left unchanged and the tool returns a failure indicating the deletion was not confirmed

#### Scenario: Connecting client does not support elicitation

- **GIVEN** an authenticated MCP connection from a client that has not declared the `elicitation` capability
- **WHEN** the agent invokes `delete_account`
- **THEN** the tool fails closed, no account is modified, and the failure tells the caller to delete the account from the app instead

#### Scenario: Agent submits a nonexistent account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_account` with an `id` that does not belong to the user, and a valid `basics` guide token
- **THEN** no account is modified and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `delete_account` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `delete_account` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no account is modified
