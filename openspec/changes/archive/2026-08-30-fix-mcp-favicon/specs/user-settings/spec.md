## MODIFIED Requirements

### Requirement: MCP Connection Section

The Settings page SHALL provide an MCP connection section that displays the user's MCP URL (including their access token) so it can be pasted into an AI agent client. The displayed URL SHALL use the same domain the app itself is served from, not an internal or infrastructure-specific domain.

#### Scenario: User views their MCP URL

- **GIVEN** an authenticated user on the Settings page
- **WHEN** they view the MCP connection section
- **THEN** their MCP URL, including their current access token, is shown

#### Scenario: MCP URL uses the app's own domain

- **GIVEN** an authenticated user on the Settings page served from the app's domain
- **WHEN** they view the MCP connection section
- **THEN** the shown MCP URL's domain matches the domain the page was loaded from, not an internal infrastructure domain
