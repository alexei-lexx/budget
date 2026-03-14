## ADDED Requirements

### Requirement: Agent Trace Access on Transactions Page

The system SHALL expose the agent trace for each natural language transaction creation via the createTransactionFromText GraphQL mutation. A trigger button SHALL always be visible near the natural language input submit button, starting disabled, and becoming enabled after each successful transaction creation to give the user access to the agent trace panel for that response.

#### Scenario: Trace is available after creating a transaction from text

- **WHEN** the user submits natural language input and the AI successfully creates a transaction
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trigger button is positioned near the natural language submit button

- **WHEN** the transactions page is viewed after a natural language transaction has been created
- **THEN** the trigger button is displayed in the same area as the natural language input submit button
