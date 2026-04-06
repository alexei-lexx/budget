## MODIFIED Requirements

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
