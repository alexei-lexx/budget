# Spec Delta

<!--
Archive note: when syncing this delta into the main spec, rename the scenario
"Ambiguous multiple amounts result in an error" to "Alternative amounts result in an error".
The MODIFIED block keeps the old name only because a MODIFIED delta cannot rename a scenario.
-->

## ADDED Requirements

### Requirement: Amount Breakdown in Natural Language Input

When the natural language text gives an amount breakdown and no total, the system SHALL create one transaction with the sum of the breakdown as its amount. The system SHALL infer the other fields with the same rules as for text with one amount. Multiple amounts that are not an amount breakdown (for example, "paid 10 or 20 euros") SHALL continue to result in an error.

#### Scenario: Amount breakdown is summed into one transaction

- **GIVEN** the user submits "meat 2 and milk 3 euro"
- **WHEN** the system processes the input
- **THEN** one transaction is created with amount 5
- AND the description lists the purchased items

#### Scenario: Amount breakdown across categories gives one transaction

- **GIVEN** the user submits "meat 2 and shampoo 3 euro"
- **WHEN** the system processes the input
- **THEN** one transaction is created with amount 5
- AND the category is inferred with the same rules as for text with one amount

#### Scenario: Alternative amounts still result in an error

- **GIVEN** the user submits "paid 10 or 20 euros"
- **WHEN** the system processes the input
- **THEN** no transaction is created
- AND an error message is displayed and the input text is preserved unchanged

## MODIFIED Requirements

### Requirement: Natural Language Transaction Creation

The system SHALL provide a text input field on the Transactions page that accepts free-text descriptions and uses AI inference to create transactions, showing a loading state during inference and displaying errors when required fields cannot be resolved.

#### Scenario: User creates a transaction from natural language

- **GIVEN** the user types "spent 45 euro at rewe yesterday" into the input and submits
- **WHEN** the system processes the input
- **THEN** a transaction is created with type expense, amount 45, description "rewe", and date set to yesterday
- AND the transaction appears at the top of the list and the input field is cleared

#### Scenario: Transaction type defaults to expense when no indicator is present

- **GIVEN** the user types "20" and submits
- **WHEN** the system infers the transaction type
- **THEN** the transaction type defaults to expense

#### Scenario: Income keywords set the type to income

- **GIVEN** the user types "received salary 4500 PLN" and submits
- **WHEN** the system infers the transaction type
- **THEN** the transaction type is set to income

#### Scenario: Refund keyword sets the type to refund

- **GIVEN** the user types "got a refund from zalando 29.99" and submits
- **WHEN** the system infers the transaction type
- **THEN** the transaction type is set to refund

#### Scenario: Account is inferred by currency when input mentions a currency

- **GIVEN** the user has one account in EUR
- **WHEN** they type "spent 45 euro at rewe" and submit
- **THEN** the EUR account is automatically selected without the user specifying it

#### Scenario: AI declines when no accounts exist

- **GIVEN** the user has no accounts
- **WHEN** they submit any text
- **THEN** an error is shown indicating the transaction could not be created

#### Scenario: Missing amount results in an error with preserved input

- **GIVEN** the user submits text with no numeric or written amount value
- **WHEN** the system cannot resolve the required amount
- **THEN** an error message is displayed and the input text is preserved unchanged

#### Scenario: Ambiguous multiple amounts result in an error

- **GIVEN** the user submits text containing two or more alternative amount values (e.g. "paid 10 or 20 euros")
- **WHEN** the system cannot determine which amount to use
- **THEN** an error message is displayed and the input text is preserved unchanged

#### Scenario: Loading state is shown during inference

- **GIVEN** the user submits valid input
- **WHEN** the AI inference is in progress
- **THEN** the input field and submit button are disabled and a loading indicator is shown

#### Scenario: Empty input is blocked before reaching the AI service

- **GIVEN** the input field is empty or contains only whitespace
- **WHEN** the user attempts to submit
- **THEN** submission is prevented client-side without invoking the AI service

#### Scenario: Only one transaction is persisted per submission

- **GIVEN** the user submits a natural language description
- **WHEN** the AI processes the request
- **THEN** exactly one transaction is persisted regardless of how many creation attempts the agent makes

#### Scenario: Agent retry after failure still creates the transaction

- **GIVEN** the agent's first creation attempt fails
- AND the agent retries
- **THEN** the retry succeeds and exactly one transaction is persisted
