# Telegram Bot Integration Specification

## Purpose

This domain covers connecting a personal Telegram bot to the application, managing its lifecycle (connect, test, disconnect), and routing user messages through the AI service to provide conversational responses via Telegram.

## Requirements

### Requirement: Connect a Telegram bot

The system SHALL allow a user to connect a personal Telegram bot by pasting a bot token and clicking Connect. On success, the UI SHALL display a masked token (last 4 characters visible, e.g., `••••1234`) and reveal Test and Disconnect actions. On failure, a snackbar error SHALL be shown and the token SHALL be retained in the input for retry.

#### Scenario: Successful connection

- **WHEN** the user pastes a valid bot token and clicks Connect
- **THEN** the Settings page shows the masked token, a Test button, and a Disconnect button

#### Scenario: Connection fails

- **WHEN** the user pastes a token and clicks Connect but the operation fails
- **THEN** a snackbar error is shown and the token remains in the input field

### Requirement: Disconnect a Telegram bot

The system SHALL allow a user to disconnect a connected bot. On success, the UI SHALL return to the token input state.

#### Scenario: Successful disconnection

- **WHEN** the user clicks Disconnect
- **THEN** the Settings page shows the empty token input and Connect button

### Requirement: Test a Telegram bot

The system SHALL allow a user to verify a connected bot is still active. A snackbar SHALL report success or failure. The connection state SHALL NOT change as a result.

#### Scenario: Test succeeds

- **WHEN** the user clicks Test and the bot is still registered
- **THEN** a snackbar success message is shown and the page state is unchanged

#### Scenario: Test fails

- **WHEN** the user clicks Test and the bot is no longer reachable
- **THEN** a snackbar failure message is shown and the page state is unchanged

### Requirement: One bot per user

The system SHALL allow at most one connected bot per user at a time. To connect a new bot the user MUST disconnect the existing one first.

#### Scenario: Connect is unavailable while a bot is connected

- **WHEN** a user has a bot connected
- **THEN** the token input and Connect button are not shown; only the masked token, Test, and Disconnect are visible

### Requirement: Telegram text message answered by AI

The system SHALL route text messages sent to the connected bot through the AI service, using prior exchanges from the current chat as context, and send the answer back to the user via Telegram.

#### Scenario: User asks a finance question

- **WHEN** the user sends a text message to their connected bot in Telegram
- **THEN** the bot replies with an AI-generated answer

#### Scenario: AI service fails

- **WHEN** the user sends a text message but the AI service is unable to produce an answer
- **THEN** the bot replies with an error message

#### Scenario: Follow-up question is answered in context

- **GIVEN** the user has previously exchanged messages with the bot in the current chat
- **WHEN** they send a follow-up question
- **THEN** the bot replies with an AI-generated answer that takes prior exchanges in that chat into account

#### Scenario: Only recent exchanges are used as context

- **GIVEN** the user has had a long conversation with the bot in the current chat
- **WHEN** they send a new message
- **THEN** only the most recent exchanges are used as context for the AI agent

#### Scenario: Exchanges older than 24 hours are not used as context

- **GIVEN** some prior exchanges occurred more than 24 hours ago
- **WHEN** the user sends a new message
- **THEN** those older exchanges are not included in the context provided to the AI agent

### Requirement: Immediate acknowledgement on text message

The system SHALL show a typing indicator to the user immediately upon receiving a text message, before the AI processes it.

#### Scenario: User sends a text message

- **WHEN** the user sends a text message to their connected bot in Telegram
- **THEN** the bot shows the native Telegram typing indicator while the AI processes the request, and sends only the AI answer as a reply

### Requirement: Non-text messages rejected

The system SHALL reply with a standard message when the user sends a non-text message to the bot.

#### Scenario: User sends a non-text message

- **WHEN** the user sends a photo, sticker, voice note, or other non-text content
- **THEN** the bot replies "I can only process text messages"

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
