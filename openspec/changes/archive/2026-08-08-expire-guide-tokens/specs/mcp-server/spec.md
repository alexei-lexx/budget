## MODIFIED Requirements

### Requirement: Load Guides via MCP

The system SHALL provide an MCP tool named `load_guides` that returns the domain knowledge an agent needs in order to use the other MCP tools correctly. The tool SHALL return, for each requested guide, the guide's full text together with a **guide token** that proves the guide was delivered. `load_guides` SHALL NOT itself require a guide token.

A guide token SHALL be derived from the guide's content and the time it was issued, so that an agent cannot produce a valid token without receiving the guide, so that changing a guide's content invalidates every token previously issued for it, and so that a token issued at one time stops being accepted roughly an hour later.

**Input:**

- `names` (required, array of strings) — the guides to load

**Returns (on success):** an array of guide objects, one per requested name, each with:

- `name` (string) — the guide's name
- `token` (string) — the guide token to pass to tools that require this guide
- `instruction` (string) — the guide's full text

**Returns (on failure):** a failure result naming the unknown guide; no guides are returned.

**Available guides:**

- `basics` — the shared domain knowledge for reading and recording the user's finances: what accounts, categories, and transactions are and how they relate; what a category's report-exclusion setting means and that report-excluded categories are left out of totals; how a refund affects spending; how the two sides of a transfer behave and that they are not ordinary income or expense; that archived accounts and categories still hold historical transactions and must be included when analysing past periods; and the rules for analysis and calculation, including confirming the period with the user rather than assuming one

#### Scenario: Agent loads a guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["basics"]`
- **THEN** the tool returns one guide object with `name` = `basics`, the guide's full text, and a guide token for it

#### Scenario: Agent loads several guides in one call

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with more than one name
- **THEN** the tool returns one guide object per requested name, each pairing that guide's own text with its own token

#### Scenario: Agent requests an unknown guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with a name that is not an available guide
- **THEN** the tool returns a failure naming the unknown guide

#### Scenario: Editing a guide changes its token

- **GIVEN** a guide whose text has been changed
- **WHEN** the agent invokes `load_guides` for that guide
- **THEN** the returned token differs from the token issued for the previous text

#### Scenario: Reloading a guide roughly an hour later changes its token

- **GIVEN** a guide whose content has not changed
- **WHEN** the agent invokes `load_guides` for that guide roughly an hour after it last did so
- **THEN** the returned token differs from the token issued the first time

### Requirement: Guide Token Enforcement

Every MCP tool other than `load_guides` SHALL declare which guides it requires, and SHALL require a `guideTokens` input carrying a valid, current token for each guide it declares. A tool invoked without a valid token for every guide it requires SHALL be rejected, and SHALL NOT read or modify any data.

The rejection SHALL name the guides the tool requires and SHALL instruct the agent to load them and retry. The rejection SHALL NOT disclose a valid guide token, so that the agent cannot satisfy the requirement from the rejection alone without receiving the guide's content.

Tokens for guides a tool does not require SHALL be ignored rather than rejected, so that a single `load_guides` call can cover every tool used in a session.

Guide tokens SHALL NOT act as credentials: a valid guide token SHALL NOT grant any access to data, and SHALL NOT substitute for MCP endpoint authentication.

A guide token SHALL remain valid for roughly one hour after it was issued, and SHALL also remain valid for a further hour beyond that so that a call made shortly after the one-hour mark does not fail solely because of that timing. A token older than that extended window SHALL be treated the same as any other invalid token.

#### Scenario: Tool invoked without a guide token is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes a tool that requires a guide without supplying `guideTokens`
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified

#### Scenario: Tool invoked with an invalid guide token is rejected

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes a tool that requires a guide with a `guideTokens` value that is not a valid, current token for that guide — for example a guessed value, a placeholder, or a token issued for an earlier version of the guide
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified

#### Scenario: Rejection does not disclose a valid token

- **GIVEN** an authenticated MCP connection
- **WHEN** a tool rejects an invocation for a missing or invalid guide token
- **THEN** the failure does not contain a valid guide token for any required guide

#### Scenario: A token used shortly after its first hour still succeeds

- **GIVEN** an authenticated MCP connection and a guide token that was issued and has just passed roughly one hour old
- **WHEN** the agent invokes a tool that requires that guide with that token
- **THEN** the tool proceeds as if the token were current, and no data access is denied solely because of that timing

#### Scenario: A stale token from well beyond the tolerance window is rejected

- **GIVEN** an authenticated MCP connection and a guide token issued roughly two hours or more ago
- **WHEN** the agent invokes a tool that requires that guide with that token
- **THEN** the tool returns a failure naming the required guide and instructing the agent to load it and retry, and no data is read or modified
