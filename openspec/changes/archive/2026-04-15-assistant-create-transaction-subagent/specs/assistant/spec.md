## ADDED Requirements

### Requirement: Transaction Creation from Natural Language

The system SHALL let the user log a transaction by describing it in natural language through the Assistant, in addition to answering finance questions. When the user describes a specific transaction they performed (for example, "bought coffee 5€" or "paid 50 for rent yesterday"), the Assistant SHALL record the transaction and confirm it in the answer. When the user's intent is genuinely ambiguous between logging a transaction and asking a question, the Assistant SHALL ask a clarifying question instead of guessing. When the user describes multiple transactions in a single message, the Assistant SHALL record each of them.

#### Scenario: User describes a single transaction

- **GIVEN** the user has an account and a matching category
- **WHEN** the user submits "bought coffee 5€ today"
- **THEN** a transaction is recorded against the appropriate account and category, and the Assistant's answer confirms the recorded transaction

#### Scenario: User describes multiple transactions in one message

- **GIVEN** the user has accounts and categories that match each described transaction
- **WHEN** the user submits "coffee 5€ and lunch 12€"
- **THEN** two transactions are recorded and the Assistant's answer confirms each of them

#### Scenario: Finance question is answered without creating a transaction

- **WHEN** the user submits "what did I spend on food last month?"
- **THEN** the Assistant answers the question and no transaction is created

#### Scenario: Ambiguous intent triggers a clarifying question

- **GIVEN** the user's message could plausibly be either a transaction log or a question
- **WHEN** the user submits an ambiguous input such as "spent 50 on rent?"
- **THEN** the Assistant asks a clarifying question instead of recording a transaction or answering a question

#### Scenario: Missing required details are surfaced to the user

- **GIVEN** the user describes a transaction without enough detail to identify an account, category, or amount
- **WHEN** the user submits the description
- **THEN** no transaction is recorded and the Assistant's answer explains what is missing

#### Scenario: Mixed turn logs a transaction and answers a question

- **GIVEN** the user has accounts and categories that match the described transaction
- **WHEN** the user submits "log coffee 5€ and show this week's total"
- **THEN** the transaction is recorded and the Assistant's answer also reports the requested total

### Requirement: Voice-Originated Transaction Disambiguation

The system SHALL disambiguate voice-originated amounts when the user logs a transaction through the Assistant. When a transaction description originates from voice input, the Assistant SHALL consider that the transcript may have lost decimal separators during speech recognition and SHALL use the user's past transactions in the same category or account as a reference to choose the most plausible amount. When the same description is submitted by typing, the amount SHALL be interpreted literally.

#### Scenario: Voice input amount is reconciled against past transactions

- **GIVEN** the user submits a transaction description via voice input on the Assistant page
- **AND** the user has past transactions in the same category or account
- **WHEN** the transcript contains an amount that may have lost its decimal separator during speech recognition
- **THEN** the Assistant records the transaction with an amount chosen in light of the user's past transactions rather than blindly using the literal transcript value

#### Scenario: Keyboard input is interpreted literally

- **GIVEN** the user submits a transaction description by typing
- **WHEN** the amount is parsed
- **THEN** the amount is interpreted literally and voice-input disambiguation is not applied
