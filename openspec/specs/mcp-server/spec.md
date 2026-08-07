# MCP Server Specification

## Purpose

This domain covers exposing the user's financial data and actions to AI agents via the Model Context Protocol (MCP): token-based authentication of MCP requests, the `load_guides` tool for delivering domain knowledge and guide tokens, guide token enforcement on the other tools, and the MCP tools for listing accounts, categories, and transactions, and creating and updating accounts, categories, and transactions.

## Requirements

### Requirement: MCP Access Token Provisioning

The system SHALL maintain an MCP access token for every user, generated automatically so an authenticated agent connection is always available without a separate setup step.

#### Scenario: Token created for a new user

- **WHEN** a new user is created
- **THEN** an MCP access token is generated for that user

#### Scenario: Token backfilled for existing users

- **GIVEN** a user created before MCP access tokens existed
- **WHEN** the backfill runs
- **THEN** that user is assigned an MCP access token

### Requirement: MCP Endpoint Authentication

The system SHALL authenticate every request to the MCP endpoint using the access token supplied with the request, resolving it to the owning user. Requests without a valid token SHALL be rejected and SHALL NOT reveal any user data.

#### Scenario: Valid token grants access

- **GIVEN** a user's current MCP access token
- **WHEN** an AI agent connects to the MCP endpoint using that token
- **THEN** the connection is authenticated as that user

#### Scenario: Missing or invalid token is rejected

- **WHEN** a request to the MCP endpoint carries no token or a token that does not match any user
- **THEN** the request is rejected and no user data is returned

### Requirement: Load Guides via MCP

The system SHALL provide an MCP tool named `load_guides` that returns the domain knowledge an agent needs in order to use the other MCP tools correctly. The tool SHALL return, for each requested guide, the guide's full text together with a **guide token** that proves the guide was delivered. `load_guides` SHALL NOT itself require a guide token.

An agent's memory can persist across chats. Without expiry, it could reuse a guide token recalled from an earlier, unrelated chat instead of loading the guide's current content.

A guide token SHALL be derived from the guide's content and the time it was issued. Deriving it from content SHALL ensure an agent cannot produce a valid token without receiving the guide, and SHALL ensure that changing a guide's content invalidates every token previously issued for it. Deriving it from time SHALL ensure a token issued at one time stops being accepted roughly an hour later, closing the cross-chat memory reuse gap.

**Input:**

- `names` (required, array of strings) — the guides to load

**Returns (on success):** an array of guide objects, one per requested name, each with:

- `name` (string) — the guide's name
- `token` (string) — the guide token to pass to tools that require this guide
- `instruction` (string) — the guide's full text

**Returns (on failure):** a failure result naming the unknown guide; no guides are returned.

**Available guides:**

- `basics` — the shared domain knowledge for reading and recording the user's finances: what accounts, categories, and transactions are and how they relate; what a category's report-exclusion setting means and that report-excluded categories are left out of totals; how a refund affects spending; how the two sides of a transfer behave and that they are not ordinary income or expense; that archived accounts and categories still hold historical transactions and must be included when analysing past periods; and the rules for analysis and calculation, including confirming the period with the user rather than assuming one

#### Scenario: Agent loads a guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["basics"]`
- **THEN** the tool returns one guide object with `name` = `basics`, the guide's full text, and a guide token for it

#### Scenario: Agent loads several guides in one call

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with more than one name
- **THEN** the tool returns one guide object per requested name, each pairing that guide's own text with its own token

#### Scenario: Agent requests an unknown guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with a name that is not an available guide
- **THEN** the tool returns a failure naming the unknown guide

#### Scenario: Editing a guide changes its token

- **GIVEN** a guide whose text has been changed
- **WHEN** the agent invokes `load_guides` for that guide
- **THEN** the returned token differs from the token issued for the previous text

#### Scenario: Reloading a guide roughly an hour later changes its token

- **GIVEN** a guide whose content has not changed
- **WHEN** the agent invokes `load_guides` for that guide roughly an hour after it last did so
- **THEN** the returned token differs from the token issued the first time

### Requirement: Guide Token Enforcement

Every MCP tool other than `load_guides` SHALL declare which guides it requires, and SHALL require a `guideTokens` input carrying a valid, current token for each guide it declares. A tool invoked without a valid token for every guide it requires SHALL be rejected, and SHALL NOT read or modify any data.

The rejection SHALL name the guides the tool requires and SHALL instruct the agent to load them and retry. The rejection SHALL NOT disclose a valid guide token, so that the agent cannot satisfy the requirement from the rejection alone without receiving the guide's content.

Tokens for guides a tool does not require SHALL be ignored rather than rejected, so that a single `load_guides` call can cover every tool used in a session.

Guide tokens SHALL NOT act as credentials: a valid guide token SHALL NOT grant any access to data, and SHALL NOT substitute for MCP endpoint authentication.

A guide token SHALL remain valid for roughly one hour after it was issued, and SHALL also remain valid for a further hour beyond that so that a call made shortly after the one-hour mark does not fail solely because of that timing. A token older than that extended window SHALL be treated the same as any other invalid token.

#### Scenario: Tool invoked without a guide token is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes a tool that requires a guide without supplying `guideTokens`
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified

#### Scenario: Tool invoked with an invalid guide token is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes a tool that requires a guide with a `guideTokens` value that is not a valid, current token for that guide — for example a guessed value, a placeholder, or a token issued for an earlier version of the guide
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified

#### Scenario: Rejection does not disclose a valid token

- **GIVEN** an authenticated MCP connection
- **WHEN** a tool rejects an invocation for a missing or invalid guide token
- **THEN** the failure does not contain a valid guide token for any required guide

#### Scenario: A token used shortly after its first hour still succeeds

- **GIVEN** an authenticated MCP connection and a guide token that was issued and has just passed roughly one hour old
- **WHEN** the agent invokes a tool that requires that guide with that token
- **THEN** the tool proceeds as if the token were current, and no data access is denied solely because of that timing

#### Scenario: A stale token from well beyond the tolerance window is rejected

- **GIVEN** an authenticated MCP connection and a guide token issued roughly two hours or more ago
- **WHEN** the agent invokes a tool that requires that guide with that token
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified

### Requirement: List Accounts via MCP

The system SHALL provide an MCP tool named `get_accounts` that lists the authenticated user's accounts.

**Requires guides:** `basics`

**Input:**

- `scope` (required, enum: `ACTIVE`, `ARCHIVED`, `ALL`) — which accounts to return: only non-archived, only archived, or both
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns:** an array of account objects, each with:

- `id` (string) — account identifier
- `name` (string) — account name
- `currency` (string) — account currency code
- `isArchived` (boolean) — whether the account is archived

#### Scenario: Agent lists active accounts

- **GIVEN** an authenticated MCP connection and the user has both active and archived accounts
- **WHEN** the agent invokes `get_accounts` with `scope` = `ACTIVE` and a valid `basics` guide token
- **THEN** only the user's non-archived accounts are returned, each with `id`, `name`, `currency`, and `isArchived`, and no other user's accounts are included

#### Scenario: Agent lists archived accounts

- **GIVEN** an authenticated MCP connection and the user has archived accounts
- **WHEN** the agent invokes `get_accounts` with `scope` = `ARCHIVED` and a valid `basics` guide token
- **THEN** only the user's archived accounts are returned

#### Scenario: Agent lists all accounts

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_accounts` with `scope` = `ALL` and a valid `basics` guide token
- **THEN** both active and archived accounts belonging to the user are returned

#### Scenario: Agent invokes `get_accounts` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_accounts` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no accounts are returned

### Requirement: Create Account via MCP

The system SHALL provide an MCP tool named `create_account` that lets an agent create a new account on behalf of the authenticated user. The tool SHALL enforce the same business rules as account creation elsewhere in the system, and SHALL reject a request that violates those rules without creating an account.

**Requires guides:** `basics`

**Input:**

- `name` (required, string) — account name
- `currency` (required, string) — account currency code
- `initialBalance` (optional, number, defaults to 0) — starting balance for the account
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the created account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean)
- `initialBalance` (number)

**Returns (on failure):** a failure result describing the violated rule; no account is created.

#### Scenario: Agent creates a valid account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_account` with a `name` and `currency` that do not duplicate an existing active account and a valid `basics` guide token
- **THEN** an account is created for that user and the tool returns the created account's `id`, `name`, `currency`, `isArchived`, and `initialBalance`

#### Scenario: Agent submits an invalid account

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_account` with details that violate a business rule (for example a name that duplicates an existing active account, or an unsupported currency code) and a valid `basics` guide token
- **THEN** no account is created and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `create_account` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_account` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no account is created

### Requirement: Update Account via MCP

The system SHALL provide an MCP tool named `update_account` that lets an agent update an existing account's name and/or currency on behalf of the authenticated user. The tool SHALL enforce the same business rules as account updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the account. The tool SHALL NOT allow changing an account's initial balance.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — account to update
- `name` (optional, string) — new account name
- `currency` (optional, string) — new account currency code
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the updated account object, with:

- `id` (string)
- `name` (string)
- `currency` (string)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; the account is left unchanged.

#### Scenario: Agent updates an account's name and/or currency

- **GIVEN** an authenticated MCP connection and an `id` for an account the user owns
- **WHEN** the agent invokes `update_account` with a valid `name` and/or `currency` and a valid `basics` guide token
- **THEN** the account is updated and the tool returns the updated account's `id`, `name`, `currency`, and `isArchived`

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_account` with details that violate a business rule (for example a nonexistent account, a name that duplicates another existing active account, an unsupported currency code, or a currency change on an account that already has transactions) and a valid `basics` guide token
- **THEN** the account is left unchanged and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `update_account` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_account` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and the account is left unchanged

### Requirement: List Categories via MCP

The system SHALL provide an MCP tool named `get_categories` that lists the authenticated user's categories.

**Requires guides:** `basics`

**Input:**

- `scope` (required, enum: `ACTIVE`, `ARCHIVED`, `ALL`) — which categories to return: only non-archived, only archived, or both
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns:** an array of category objects, each with:

- `id` (string) — category identifier
- `name` (string) — category name
- `type` (enum: `INCOME`, `EXPENSE`) — category type
- `excludeFromReports` (boolean) — whether transactions in this category are excluded from reports
- `isArchived` (boolean) — whether the category is archived

#### Scenario: Agent lists active categories

- **GIVEN** an authenticated MCP connection and the user has both active and archived categories
- **WHEN** the agent invokes `get_categories` with `scope` = `ACTIVE` and a valid `basics` guide token
- **THEN** only the user's non-archived categories are returned, each with `id`, `name`, `type`, `excludeFromReports`, and `isArchived`, and no other user's categories are included

#### Scenario: Agent lists archived categories

- **GIVEN** an authenticated MCP connection and the user has archived categories
- **WHEN** the agent invokes `get_categories` with `scope` = `ARCHIVED` and a valid `basics` guide token
- **THEN** only the user's archived categories are returned

#### Scenario: Agent lists all categories

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_categories` with `scope` = `ALL` and a valid `basics` guide token
- **THEN** both active and archived categories belonging to the user are returned

#### Scenario: Agent invokes `get_categories` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_categories` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no categories are returned

### Requirement: Create Category via MCP

The system SHALL provide an MCP tool named `create_category` that lets an agent create a new category on behalf of the authenticated user. The tool SHALL enforce the same business rules as category creation elsewhere in the system, and SHALL reject a request that violates those rules without creating a category.

**Requires guides:** `basics`

**Input:**

- `name` (required, string) — category name
- `type` (required, enum: `INCOME`, `EXPENSE`) — category type
- `excludeFromReports` (optional, boolean, defaults to `false`) — whether to exclude transactions in this category from financial reports
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the created category object, with:

- `id` (string)
- `name` (string)
- `type` (enum: `INCOME`, `EXPENSE`)
- `excludeFromReports` (boolean)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; no category is created.

#### Scenario: Agent creates a valid category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_category` with a `name` and `type` that do not duplicate an existing active category and a valid `basics` guide token
- **THEN** a category is created for that user and the tool returns the created category's `id`, `name`, `type`, `excludeFromReports`, and `isArchived`

#### Scenario: Agent submits an invalid category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_category` with details that violate a business rule (for example a name that duplicates an existing active category, or a name outside the allowed length) and a valid `basics` guide token
- **THEN** no category is created and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `create_category` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_category` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no category is created

### Requirement: Update Category via MCP

The system SHALL provide an MCP tool named `update_category` that lets an agent update an existing category's name, type, and/or report-exclusion setting on behalf of the authenticated user. The tool SHALL enforce the same business rules as category updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the category.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — category to update
- `name` (optional, string) — new category name
- `type` (optional, enum: `INCOME`, `EXPENSE`) — new category type
- `excludeFromReports` (optional, boolean) — new report-exclusion setting
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the updated category object, with:

- `id` (string)
- `name` (string)
- `type` (enum: `INCOME`, `EXPENSE`)
- `excludeFromReports` (boolean)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; the category is left unchanged.

#### Scenario: Agent updates a category's name, type, and/or report-exclusion setting

- **GIVEN** an authenticated MCP connection and an `id` for a category the user owns
- **WHEN** the agent invokes `update_category` with a valid `name`, `type`, and/or `excludeFromReports` and a valid `basics` guide token
- **THEN** the category is updated and the tool returns the updated category's `id`, `name`, `type`, `excludeFromReports`, and `isArchived`

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_category` with details that violate a business rule (for example a nonexistent category, or a name that duplicates another existing active category) and a valid `basics` guide token
- **THEN** the category is left unchanged and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `update_category` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_category` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and the category is left unchanged

### Requirement: List Transactions via MCP

The system SHALL provide an MCP tool named `get_transactions` that lists the authenticated user's transactions filtered by date range and, optionally, by account, category, and type.

**Requires guides:** `basics`

**Input:**

- `startDate` (required, string, format `YYYY-MM-DD`) — inclusive start of the date range
- `endDate` (required, string, format `YYYY-MM-DD`) — inclusive end of the date range
- `accountIds` (optional, array of strings) — restrict results to these account IDs
- `categoryIds` (optional, array of strings) — restrict results to these category IDs
- `types` (optional, array of enum: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `REFUND`) — restrict results to these transaction types
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns:** an array of transaction objects, each with:

- `id` (string) — transaction identifier
- `accountId` (string) — associated account ID
- `categoryId` (string, absent when uncategorised) — associated category ID
- `type` (enum: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `REFUND`)
- `amount` (number) — transaction amount
- `currency` (string) — currency code
- `date` (string, format `YYYY-MM-DD`)
- `description` (string, absent when not set)
- `transferId` (string, absent unless the transaction is part of a transfer)

**Validation:**

- `startDate` MUST NOT be after `endDate`
- The range between `startDate` and `endDate` MUST NOT exceed 365 days

#### Scenario: Agent lists transactions in a date range

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` with a valid `startDate` and `endDate` and a valid `basics` guide token
- **THEN** the user's own transactions within that range are returned, each with `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, `description`, and `transferId`, and no other user's transactions are included

#### Scenario: Agent filters transactions by account, category, and type

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` with `accountIds`, `categoryIds`, and/or `types` in addition to a date range and a valid `basics` guide token
- **THEN** only transactions matching all supplied filters are returned

#### Scenario: Inverted date range is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` with a `startDate` after `endDate` and a valid `basics` guide token
- **THEN** the tool reports a validation failure and returns no transactions

#### Scenario: Date range exceeding the limit is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` with a date range spanning more than 365 days and a valid `basics` guide token
- **THEN** the tool reports a validation failure and returns no transactions

#### Scenario: Agent invokes `get_transactions` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no transactions are returned

### Requirement: Create Transaction via MCP

The system SHALL provide an MCP tool named `create_transaction` that lets an agent record a new transaction on behalf of the authenticated user. The tool SHALL enforce the same business rules as transaction creation elsewhere in the system, and SHALL reject a request that violates those rules without recording a transaction.

**Requires guides:** `basics`

**Input:**

- `accountId` (required, string, UUID) — account to record the transaction against
- `amount` (required, number, positive) — transaction amount
- `categoryId` (optional, string, UUID) — category to assign
- `date` (required, string, format `YYYY-MM-DD`) — transaction date
- `description` (optional, string, max 500 characters) — short description
- `type` (required, enum: `INCOME`, `EXPENSE`, `REFUND`) — transaction type (transfers are not creatable through this tool)
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

**Returns (on success):** the created transaction object, with:

- `id` (string)
- `accountId` (string)
- `categoryId` (string, absent when uncategorised)
- `type` (enum: `INCOME`, `EXPENSE`, `REFUND`)
- `amount` (number)
- `currency` (string) — inherited from the account
- `date` (string, format `YYYY-MM-DD`)
- `description` (string, absent when not set)

**Returns (on failure):** a failure result describing the violated rule; no transaction object is returned.

#### Scenario: Agent creates a valid transaction

- **GIVEN** an authenticated MCP connection and an `accountId` (and, if supplied, `categoryId`) the user owns
- **WHEN** the agent invokes `create_transaction` with valid `accountId`, `amount`, `date`, and `type` and a valid `basics` guide token
- **THEN** a transaction is recorded for that user and the tool returns the created transaction's `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, and `description`

#### Scenario: Agent submits an invalid transaction

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_transaction` with details that violate a business rule (for example a nonexistent account, a nonexistent category, or an amount that is not positive) and a valid `basics` guide token
- **THEN** no transaction is recorded and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `create_transaction` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_transaction` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and no transaction is recorded

### Requirement: Update Transaction via MCP

The system SHALL provide an MCP tool named `update_transaction` that lets an agent update an existing transaction's account, amount, category, date, description, and/or type on behalf of the authenticated user. The tool SHALL enforce the same business rules as transaction updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the transaction.

**Requires guides:** `basics`

**Input:**

- `id` (required, string, UUID) — transaction to update
- `accountId` (optional, string, UUID) — new account to associate the transaction with
- `amount` (optional, number, positive) — new transaction amount
- `categoryId` (optional, string, UUID, or `null`) — new category to assign; `null` removes the current category assignment
- `date` (optional, string, format `YYYY-MM-DD`) — new transaction date
- `description` (optional, string, max 500 characters, or `null`) — new description; `null` clears the current description
- `type` (optional, enum: `INCOME`, `EXPENSE`, `REFUND`) — new transaction type (transfers are not settable through this tool)
- `guideTokens` (required, array of strings) — a valid, current token for each guide this tool requires: `basics`

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
- **WHEN** the agent invokes `update_transaction` with any combination of a valid `accountId`, `amount`, `categoryId`, `date`, `description`, and `type` and a valid `basics` guide token
- **THEN** only the supplied fields are changed and the tool returns the updated transaction's `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, and `description`

#### Scenario: Agent clears a transaction's category or description

- **GIVEN** an authenticated MCP connection and an `id` for a transaction the user owns
- **WHEN** the agent invokes `update_transaction` with `categoryId` and/or `description` explicitly set to `null` and a valid `basics` guide token
- **THEN** the corresponding field is cleared on the transaction

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_transaction` with details that violate a business rule (for example a nonexistent transaction, a nonexistent account or category, a category whose type does not match the transaction's type, or an amount that is not positive) and a valid `basics` guide token
- **THEN** the transaction is left unchanged and the tool returns a failure describing what was invalid

#### Scenario: Agent invokes `update_transaction` without a valid guide token

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_transaction` without a valid `basics` guide token
- **THEN** the tool returns a failure naming the required guide and the transaction is left unchanged

### Requirement: MCP Data Isolation

The system SHALL scope every MCP tool to the authenticated user's own data. No MCP tool SHALL read or modify another user's accounts, categories, or transactions, regardless of the input supplied by the agent.

#### Scenario: Tool input cannot target another user's data

- **GIVEN** an authenticated MCP connection for one user
- **WHEN** the agent invokes any MCP tool, including with an `accountId` or `categoryId` belonging to another user
- **THEN** only the authenticated user's data is read or modified; a reference to another user's data is treated as not found

### Requirement: Token Regeneration Invalidates Prior Access

Regenerating a user's MCP access token SHALL immediately invalidate the previous token, so any connection still using it is denied.

#### Scenario: Old token stops working after regeneration

- **GIVEN** a user has regenerated their MCP access token
- **WHEN** a request to the MCP endpoint uses the previous token
- **THEN** the request is rejected

#### Scenario: New token grants access after regeneration

- **GIVEN** a user has regenerated their MCP access token
- **WHEN** a request to the MCP endpoint uses the new token
- **THEN** the connection is authenticated as that user
