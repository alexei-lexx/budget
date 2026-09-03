## ADDED Requirements

### Requirement: Recurring Transaction Inference from History

The system SHALL resolve a missing amount by searching the user's transaction history, up to the last twelve months, for transactions matching the description, before treating the amount as unresolved. When at least two matching transactions agree on the exact same amount, the system SHALL treat it as a recurring transaction and create the new transaction, dated today, using the type, account, category, amount, and description of the most recent match, with any detail stated explicitly in the new submission overriding the matched value. When fewer than two transactions match, the matches disagree on the amount, or no transaction matches within the last twelve months, the system SHALL treat the amount as unresolved.

#### Scenario: Recurring transaction match is used when history agrees on amount

- **GIVEN** the user has a monthly transaction described "gym abo" for 50 EUR, recorded consistently over recent months
- **WHEN** the user types "gym" with no amount and submits
- **THEN** a transaction is created today for 50 EUR, with the same account, category, and description as the matched transactions

#### Scenario: A single matching transaction is not treated as a recurring pattern

- **GIVEN** the user has exactly one transaction matching the described subject
- **WHEN** the user types the same subject with no amount and submits
- **THEN** no transaction is created and an error message is displayed

#### Scenario: Varying history is not treated as a recurring pattern

- **GIVEN** the user has several transactions described "groceries", each for a different amount
- **WHEN** the user types "groceries" with no amount and submits
- **THEN** no transaction is created and an error message is displayed, the same as when no amount can be resolved

#### Scenario: No match within the last twelve months leaves the amount unresolved

- **GIVEN** the user has no transaction matching the described subject within the last twelve months
- **WHEN** the user types text with no amount and submits
- **THEN** no transaction is created and an error message is displayed
