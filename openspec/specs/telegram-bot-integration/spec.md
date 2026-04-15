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

The system SHALL route text messages sent to the connected bot through the Assistant, using prior exchanges from the current chat as context, and send the Assistant's response back to the user via Telegram. The Telegram bot SHALL inherit every capability the Assistant offers on the web Assistant page; any new Assistant capability SHALL be available through the bot without a separate Telegram-side requirement.

#### Scenario: User asks a finance question

- **WHEN** the user sends a text message to their connected bot in Telegram
- **THEN** the bot replies with the Assistant's answer

#### Scenario: AI service fails

- **WHEN** the user sends a text message but the Assistant is unable to produce an answer
- **THEN** the bot replies with an error message

#### Scenario: Follow-up question is answered in context

- **GIVEN** the user has previously exchanged messages with the bot in the current chat
- **WHEN** they send a follow-up question
- **THEN** the bot replies with an answer that takes prior exchanges in that chat into account

#### Scenario: Only recent exchanges are used as context

- **GIVEN** the user has had a long conversation with the bot in the current chat
- **WHEN** they send a new message
- **THEN** only the most recent exchanges are used as context for the Assistant

#### Scenario: Exchanges older than 24 hours are not used as context

- **GIVEN** some prior exchanges occurred more than 24 hours ago
- **WHEN** the user sends a new message
- **THEN** those older exchanges are not included in the context provided to the Assistant

#### Scenario: Assistant capabilities are available through the bot

- **GIVEN** the Assistant offers a capability on the web Assistant page (for example logging transactions, creating accounts, or renaming accounts)
- **WHEN** the user exercises that capability by sending a text message to their connected bot
- **THEN** the bot handles the message using the same Assistant behaviour as the web surface and replies with the result

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

