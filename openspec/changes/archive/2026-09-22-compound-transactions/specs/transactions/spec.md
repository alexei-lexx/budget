## ADDED Requirements

### Requirement: Compound Transaction Amount Display

The system SHALL display, for a transaction that is part of a compound transaction, its own amount together with the compound transaction's shared total (for example, "5 of 15 EUR"), so the user can see it as one fragment of a single purchase. A transaction that is not part of a compound transaction SHALL show only its own amount, unchanged.

#### Scenario: Compound transaction leg shows its amount against the shared total

- **GIVEN** a transaction that is part of a compound transaction with a shared total
- **WHEN** the user views the transaction card
- **THEN** the card shows the transaction's own amount together with the shared total, in the transaction's currency

#### Scenario: Ordinary transaction shows no compound total

- **GIVEN** a transaction that is not part of a compound transaction
- **WHEN** the user views the transaction card
- **THEN** only the transaction's own amount is shown, with no compound total
