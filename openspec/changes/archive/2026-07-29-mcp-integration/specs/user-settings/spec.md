## ADDED Requirements

### Requirement: MCP Connection Section

The Settings page SHALL provide an MCP connection section that displays the user's MCP URL (including their access token) so it can be pasted into an AI agent client.

#### Scenario: User views their MCP URL

- **GIVEN** an authenticated user on the Settings page
- **WHEN** they view the MCP connection section
- **THEN** their MCP URL, including their current access token, is shown

### Requirement: Copy MCP URL

The MCP connection section SHALL provide a copy control that copies the full MCP URL, including the token, to the clipboard and confirms the action to the user.

#### Scenario: User copies the MCP URL

- **GIVEN** the MCP connection section is shown
- **WHEN** the user activates the copy control
- **THEN** the full MCP URL including the token is placed on the clipboard and a confirmation is shown

### Requirement: Regenerate MCP Token

The MCP connection section SHALL provide a control to regenerate the user's MCP access token. After regeneration, the displayed MCP URL SHALL reflect the new token and the user SHALL be informed that the previous URL no longer works.

#### Scenario: User regenerates their token

- **GIVEN** the MCP connection section is shown
- **WHEN** the user activates the regenerate control
- **THEN** the displayed MCP URL updates to contain the new token and a confirmation is shown
