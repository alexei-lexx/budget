## ADDED Requirements

### Requirement: Single Transaction Creation Per Agent Request

The system SHALL ensure that at most one transaction is persisted per natural language transaction request, regardless of how many times the agent attempts to create one. Retries after a failed attempt SHALL still be permitted.

#### Scenario: Exactly one transaction is created per request

- **WHEN** the user submits a natural language transaction request
- **THEN** exactly one transaction is persisted

#### Scenario: Agent retry after failure still creates the transaction

- **WHEN** the agent's first creation attempt fails
- **AND** the agent retries
- **THEN** the retry succeeds and one transaction is persisted

#### Scenario: Agent cannot create a second transaction after a successful one

- **WHEN** the agent has already successfully created a transaction within the request
- **AND** the agent attempts to create another
- **THEN** the second attempt is rejected and no additional transaction is persisted
