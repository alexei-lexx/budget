## MODIFIED Requirements

### Requirement: Immediate acknowledgement on text message

The system SHALL respond to an incoming Telegram message webhook with an inline `sendChatAction` reply with `action: "typing"`, showing the native Telegram typing indicator. No "thinking..." text message SHALL be sent.

#### Scenario: User sends a text message

- **WHEN** the user sends a text message to their connected bot in Telegram
- **THEN** the bot shows the native Telegram typing indicator while the AI processes the request, and sends only the AI answer as a reply
