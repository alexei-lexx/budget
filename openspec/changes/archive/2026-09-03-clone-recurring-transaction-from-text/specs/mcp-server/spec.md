## MODIFIED Requirements

### Requirement: Load Guides via MCP

The system SHALL provide an MCP tool named `load_guides` that returns the domain knowledge an agent needs in order to use the other MCP tools correctly. The tool SHALL return, for each requested guide, the guide's full text together with a **guide token** that proves the guide was delivered. `load_guides` SHALL NOT itself require a guide token.

An agent's memory can persist across chats. Without expiry, it could reuse a guide token recalled from an earlier, unrelated chat instead of loading the guide's current content.

A guide token SHALL be derived from the guide's content and the time it was issued. Deriving it from content SHALL ensure an agent cannot produce a valid token without receiving the guide, and SHALL ensure that changing a guide's content invalidates every token previously issued for it. Deriving it from time SHALL ensure a token issued at one time stops being accepted roughly an hour later, closing the cross-chat memory reuse gap.

**Input:**

- `names` (required, array of strings) — the guides to load

**Returns (on success):** an array of guide objects, one per requested name, each with:

- `name` (string) — the guide's name
- `token` (string) — the guide token to pass to tools that require this guide
- `instruction` (string) — the guide's full text

**Returns (on failure):** a failure result naming the unknown guide; no guides are returned.

**Available guides:**

- `basics` — the shared domain knowledge for reading and recording the user's finances: what accounts, categories, and transactions are and how they relate; what a category's report-exclusion setting means and that report-excluded categories are left out of totals; how a refund affects spending; how the two sides of a transfer behave and that they are not ordinary income or expense; that archived accounts and categories still hold historical transactions and must be included when analysing past periods; and the rules for analysis and calculation, including confirming the period with the user rather than assuming one
- `create-transaction` — the rules for inferring a new transaction's fields when they are not given explicitly: how to select type, amount, account, and category by priority (an explicit match first, then supplementary signals, then the user's transaction history); that when no amount is stated at all, the agent SHALL search the user's transaction history up to the last twelve months for transactions matching the description, and when at least two agree on the exact same amount, use their type, amount, account, category, and description for the new transaction, treating the amount as unresolved when fewer than two match, the matches disagree, or none is found; that date defaults to today unless a date is stated, and that a description must describe the item or service rather than the reason for the transaction and is left blank when nothing meaningful can be formed; that when recording from a photo of a receipt or check, the store or vendor name may be included in the description, and the purchased items SHALL be itemized with quantity and unit of measure when legible; and that a store name, item, quantity, or unit that is not legible SHALL NOT be invented

#### Scenario: Agent loads a guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["basics"]`
- **THEN** the tool returns one guide object with `name` = `basics`, the guide's full text, and a guide token for it

#### Scenario: Agent loads the create-transaction guide

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["create-transaction"]`
- **THEN** the tool returns one guide object with `name` = `create-transaction`, the guide's full text, and a guide token for it

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
