## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Log a transaction via Telegram text message

**Reason**: Covered by the delegation clause in "Telegram text message answered by AI". The Telegram bot inherits every Assistant capability, including transaction logging, so a per-capability requirement on the Telegram side is redundant and invites drift.

**Migration**: No user-facing change. Transaction logging from Telegram messages remains supported through the Assistant capability specified in `specs/assistant/spec.md` under "Transaction Creation from Natural Language".
