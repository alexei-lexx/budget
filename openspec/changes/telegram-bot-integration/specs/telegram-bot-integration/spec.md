## ADDED Requirements

### Requirement: Finance Query via Telegram

The system SHALL route text messages sent to a connected Telegram bot through Insight and reply with the answer in Telegram.

#### Scenario: Text message receives an Insight answer

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they send a text message to the bot
- **THEN** the bot replies with the answer from Insight

#### Scenario: Insight failure sends an error reply

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they send a text message and Insight fails
- **THEN** the bot sends an error message in Telegram

### Requirement: Non-text Message Handling

The system SHALL reply to non-text Telegram messages informing the user that only text messages are supported.

#### Scenario: Non-text message receives a notice

- **GIVEN** the user has a connected Telegram bot
- **WHEN** they send a non-text message (photo, sticker, voice, etc.)
- **THEN** the bot replies "I can only process text messages"
