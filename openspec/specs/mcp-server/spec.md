# MCP Server Specification

## Purpose

This domain covers exposing the user's financial data and actions to AI agents via the Model Context Protocol (MCP): token-based authentication of MCP requests, and the MCP tools for listing accounts, categories, and transactions, and creating transactions.

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

### Requirement: List Accounts via MCP

The system SHALL provide an MCP tool named `get_accounts` that lists the authenticated user's accounts.

**Input:**

- `scope` (required, enum: `ACTIVE`, `ARCHIVED`, `ALL`) — which accounts to return: only non-archived, only archived, or both

**Returns:** an array of account objects, each with:

- `id` (string) — account identifier
- `name` (string) — account name
- `currency` (string) — account currency code
- `isArchived` (boolean) — whether the account is archived

#### Scenario: Agent lists active accounts

- **GIVEN** an authenticated MCP connection and the user has both active and archived accounts
- **WHEN** the agent invokes `get_accounts` with `scope` = `ACTIVE`
- **THEN** only the user's non-archived accounts are returned, each with `id`, `name`, `currency`, and `isArchived`, and no other user's accounts are included

#### Scenario: Agent lists archived accounts

- **GIVEN** an authenticated MCP connection and the user has archived accounts
- **WHEN** the agent invokes `get_accounts` with `scope` = `ARCHIVED`
- **THEN** only the user's archived accounts are returned

#### Scenario: Agent lists all accounts

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_accounts` with `scope` = `ALL`
- **THEN** both active and archived accounts belonging to the user are returned

### Requirement: List Categories via MCP

The system SHALL provide an MCP tool named `get_categories` that lists the authenticated user's categories.

**Input:**

- `scope` (required, enum: `ACTIVE`, `ARCHIVED`, `ALL`) — which categories to return: only non-archived, only archived, or both

**Returns:** an array of category objects, each with:

- `id` (string) — category identifier
- `name` (string) — category name
- `type` (enum: `INCOME`, `EXPENSE`) — category type
- `excludeFromReports` (boolean) — whether transactions in this category are excluded from reports
- `isArchived` (boolean) — whether the category is archived

#### Scenario: Agent lists active categories

- **GIVEN** an authenticated MCP connection and the user has both active and archived categories
- **WHEN** the agent invokes `get_categories` with `scope` = `ACTIVE`
- **THEN** only the user's non-archived categories are returned, each with `id`, `name`, `type`, `excludeFromReports`, and `isArchived`, and no other user's categories are included

#### Scenario: Agent lists archived categories

- **GIVEN** an authenticated MCP connection and the user has archived categories
- **WHEN** the agent invokes `get_categories` with `scope` = `ARCHIVED`
- **THEN** only the user's archived categories are returned

#### Scenario: Agent lists all categories

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_categories` with `scope` = `ALL`
- **THEN** both active and archived categories belonging to the user are returned

### Requirement: List Transactions via MCP

The system SHALL provide an MCP tool named `get_transactions` that lists the authenticated user's transactions filtered by date range and, optionally, by account, category, and type.

**Input:**

- `startDate` (required, string, format `YYYY-MM-DD`) — inclusive start of the date range
- `endDate` (required, string, format `YYYY-MM-DD`) — inclusive end of the date range
- `accountIds` (optional, array of strings) — restrict results to these account IDs
- `categoryIds` (optional, array of strings) — restrict results to these category IDs
- `types` (optional, array of enum: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`, `REFUND`) — restrict results to these transaction types

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
- **WHEN** the agent invokes `get_transactions` with a valid `startDate` and `endDate`
- **THEN** the user's own transactions within that range are returned, each with `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, `description`, and `transferId`, and no other user's transactions are included

#### Scenario: Agent filters transactions by account, category, and type

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `get_transactions` with `accountIds`, `categoryIds`, and/or `types` in addition to a date range
- **THEN** only transactions matching all supplied filters are returned

#### Scenario: Inverted date range is rejected

- **WHEN** the agent invokes `get_transactions` with a `startDate` after `endDate`
- **THEN** the tool reports a validation failure and returns no transactions

#### Scenario: Date range exceeding the limit is rejected

- **WHEN** the agent invokes `get_transactions` with a date range spanning more than 365 days
- **THEN** the tool reports a validation failure and returns no transactions

### Requirement: Create Transaction via MCP

The system SHALL provide an MCP tool named `create_transaction` that lets an agent record a new transaction on behalf of the authenticated user. The tool SHALL enforce the same business rules as transaction creation elsewhere in the system, and SHALL reject a request that violates those rules without recording a transaction.

**Input:**

- `accountId` (required, string, UUID) — account to record the transaction against
- `amount` (required, number, positive) — transaction amount
- `categoryId` (optional, string, UUID) — category to assign
- `date` (required, string, format `YYYY-MM-DD`) — transaction date
- `description` (optional, string, max 500 characters) — short description
- `type` (required, enum: `INCOME`, `EXPENSE`, `REFUND`) — transaction type (transfers are not creatable through this tool)

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
- **WHEN** the agent invokes `create_transaction` with valid `accountId`, `amount`, `date`, and `type`
- **THEN** a transaction is recorded for that user and the tool returns the created transaction's `id`, `accountId`, `categoryId`, `type`, `amount`, `currency`, `date`, and `description`

#### Scenario: Agent submits an invalid transaction

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_transaction` with details that violate a business rule (for example a nonexistent account, a nonexistent category, or an amount that is not positive)
- **THEN** no transaction is recorded and the tool returns a failure describing what was invalid

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
