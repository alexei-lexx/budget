## ADDED Requirements

### Requirement: Recurring Transaction Inference from History

The system SHALL resolve a missing amount by searching the user's transaction history, up to the last twelve months, for transactions matching the description, before asking the user for it. When at least two matching transactions agree on the exact same amount, the Assistant SHALL treat it as a recurring transaction and record the new transaction, dated today, using the type, account, category, amount, and description of the most recent match, with any detail stated explicitly in the new message overriding the matched value, and confirm it in the answer. When fewer than two transactions match, the matches disagree on the amount, or no transaction matches within the last twelve months, the Assistant SHALL treat the amount as unresolved.

#### Scenario: Recurring transaction match is used when history agrees on amount

- **GIVEN** the user has a monthly transaction described "gym abo" for 50 EUR, recorded consistently over recent months
- **WHEN** the user submits "gym" with no amount
- **THEN** a transaction is recorded today for 50 EUR, with the same account, category, and description as the matched transactions, and the Assistant's answer confirms it

#### Scenario: A single matching transaction is not treated as a recurring pattern

- **GIVEN** the user has exactly one transaction matching the described subject
- **WHEN** the user submits the same subject with no amount
- **THEN** no transaction is recorded and the Assistant's answer explains that the amount is missing

#### Scenario: Varying history is not treated as a recurring pattern

- **GIVEN** the user has several transactions described "groceries", each for a different amount
- **WHEN** the user submits "groceries" with no amount
- **THEN** no transaction is recorded and the Assistant's answer explains that the amount is missing

#### Scenario: No match within the last twelve months leaves the amount unresolved

- **GIVEN** the user has no transaction matching the described subject within the last twelve months
- **WHEN** the user submits text with no amount
- **THEN** no transaction is recorded and the Assistant's answer explains that the amount is missing
