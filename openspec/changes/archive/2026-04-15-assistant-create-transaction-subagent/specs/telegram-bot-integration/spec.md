## ADDED Requirements

### Requirement: Log a transaction via Telegram text message

The system SHALL let the user log a transaction by describing it in a text message sent to their connected Telegram bot, in addition to asking finance questions. When the user describes a specific transaction they performed, the bot SHALL record the transaction and reply with a confirmation. When the user's intent is genuinely ambiguous between logging a transaction and asking a question, the bot SHALL reply with a clarifying question instead of guessing. When the user describes multiple transactions in a single message, the bot SHALL record each of them.

#### Scenario: User describes a transaction in Telegram

- **GIVEN** the user has a connected Telegram bot, an account, and a matching category
- **WHEN** the user sends "bought coffee 5€ today" to the bot
- **THEN** a transaction is recorded and the bot replies with a confirmation

#### Scenario: User describes multiple transactions in one Telegram message

- **GIVEN** the user has accounts and categories that match each described transaction
- **WHEN** the user sends "coffee 5€ and lunch 12€" to the bot
- **THEN** two transactions are recorded and the bot's reply confirms each of them

#### Scenario: Finance question in Telegram does not create a transaction

- **WHEN** the user sends "what did I spend on food last month?" to the bot
- **THEN** the bot replies with the answer and no transaction is created

#### Scenario: Ambiguous Telegram message triggers a clarifying reply

- **GIVEN** the user's message could plausibly be either a transaction log or a question
- **WHEN** the user sends an ambiguous input such as "spent 50 on rent?"
- **THEN** the bot replies with a clarifying question instead of recording a transaction or answering a question

#### Scenario: Missing required details are surfaced to the Telegram user

- **GIVEN** the user's Telegram message describes a transaction without enough detail to identify an account, category, or amount
- **WHEN** the message is processed
- **THEN** no transaction is recorded and the bot's reply explains what is missing
