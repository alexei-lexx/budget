## ADDED Requirements

### Requirement: Telegram Bot Section

The Settings page SHALL include a Telegram Bot section where users can connect, disconnect, and test a personal Telegram bot.

#### Scenario: No bot connected — token input is shown

- **GIVEN** the user has no connected Telegram bot
- **WHEN** they open the Settings page
- **THEN** the Telegram Bot section shows a token input field and a Connect button

#### Scenario: Bot connected — masked token and actions are shown

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they open the Settings page
- **THEN** the Telegram Bot section shows the masked token, a Test button, and a Disconnect button

### Requirement: Connect Telegram Bot

The system SHALL allow users to connect a personal Telegram bot to their account by providing a bot token. On success, the section SHALL display the masked token with Test and Disconnect buttons. On failure, a snackbar error SHALL be shown and the token field SHALL retain its value for retry.

#### Scenario: Valid token connects the bot

- **GIVEN** the user has no connected Telegram bot
- **WHEN** they enter a valid bot token and click Connect
- **THEN** the bot is connected and the Telegram Bot section shows the masked token with Test and Disconnect buttons

#### Scenario: Invalid token shows an error snackbar

- **GIVEN** the user has no connected Telegram bot
- **WHEN** they enter an invalid bot token and click Connect
- **THEN** a snackbar error is shown and the token field retains its value

#### Scenario: Connecting a new token replaces the existing bot

- **GIVEN** the user already has a connected Telegram bot
- **WHEN** they enter a new token and click Connect
- **THEN** the existing bot is disconnected and the new bot is connected

### Requirement: Masked Token Display

The system SHALL display the connected bot token in masked form, showing only the last 4 characters (e.g., `••••1234`).

#### Scenario: Connected bot token is masked

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they view the Telegram Bot section
- **THEN** the token is shown as `••••XXXX` where XXXX are the last 4 characters of the token

### Requirement: Disconnect Telegram Bot

The system SHALL allow users to disconnect a connected Telegram bot. On success, the section SHALL revert to showing the token input form.

#### Scenario: Disconnecting removes the active bot

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they click Disconnect
- **THEN** the bot is disconnected and the token input form is shown

### Requirement: Test Telegram Bot

The system SHALL allow users to verify that a connected Telegram bot is still properly registered. The test SHALL show a snackbar with the result and SHALL NOT change the connection state.

#### Scenario: Test succeeds

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they click Test and the bot is reachable and registered
- **THEN** a success snackbar is shown and the connection state is unchanged

#### Scenario: Test fails

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they click Test and the bot is unreachable or no longer registered
- **THEN** a failure snackbar is shown and the connection state is unchanged
