## ADDED Requirements

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

The system SHALL route text messages sent to the connected bot through the AI service and send the answer back to the user via Telegram.

#### Scenario: User asks a finance question

- **WHEN** the user sends a text message to their connected bot in Telegram
- **THEN** the bot replies with an AI-generated answer

#### Scenario: AI service fails

- **WHEN** the user sends a text message but the AI service is unable to produce an answer
- **THEN** the bot replies with an error message

### Requirement: Non-text messages rejected

The system SHALL reply with a standard message when the user sends a non-text message to the bot.

#### Scenario: User sends a non-text message

- **WHEN** the user sends a photo, sticker, voice note, or other non-text content
- **THEN** the bot replies "I can only process text messages"
