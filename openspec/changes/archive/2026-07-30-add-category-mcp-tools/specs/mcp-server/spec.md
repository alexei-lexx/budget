## ADDED Requirements

### Requirement: Create Category via MCP

The system SHALL provide an MCP tool named `create_category` that lets an agent create a new category on behalf of the authenticated user. The tool SHALL enforce the same business rules as category creation elsewhere in the system, and SHALL reject a request that violates those rules without creating a category.

**Input:**

- `name` (required, string) — category name
- `type` (required, enum: `INCOME`, `EXPENSE`) — category type
- `excludeFromReports` (optional, boolean, defaults to `false`) — whether to exclude transactions in this category from financial reports

**Returns (on success):** the created category object, with:

- `id` (string)
- `name` (string)
- `type` (enum: `INCOME`, `EXPENSE`)
- `excludeFromReports` (boolean)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; no category is created.

#### Scenario: Agent creates a valid category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_category` with a `name` and `type` that do not duplicate an existing active category
- **THEN** a category is created for that user and the tool returns the created category's `id`, `name`, `type`, `excludeFromReports`, and `isArchived`

#### Scenario: Agent submits an invalid category

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `create_category` with details that violate a business rule (for example a name that duplicates an existing active category, or a name outside the allowed length)
- **THEN** no category is created and the tool returns a failure describing what was invalid

### Requirement: Update Category via MCP

The system SHALL provide an MCP tool named `update_category` that lets an agent update an existing category's name, type, and/or report-exclusion setting on behalf of the authenticated user. The tool SHALL enforce the same business rules as category updates elsewhere in the system, and SHALL reject a request that violates those rules without modifying the category.

**Input:**

- `id` (required, string, UUID) — category to update
- `name` (optional, string) — new category name
- `type` (optional, enum: `INCOME`, `EXPENSE`) — new category type
- `excludeFromReports` (optional, boolean) — new report-exclusion setting

**Returns (on success):** the updated category object, with:

- `id` (string)
- `name` (string)
- `type` (enum: `INCOME`, `EXPENSE`)
- `excludeFromReports` (boolean)
- `isArchived` (boolean)

**Returns (on failure):** a failure result describing the violated rule; the category is left unchanged.

#### Scenario: Agent updates a category's name, type, and/or report-exclusion setting

- **GIVEN** an authenticated MCP connection and an `id` for a category the user owns
- **WHEN** the agent invokes `update_category` with a valid `name`, `type`, and/or `excludeFromReports`
- **THEN** the category is updated and the tool returns the updated category's `id`, `name`, `type`, `excludeFromReports`, and `isArchived`

#### Scenario: Agent submits an invalid update

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `update_category` with details that violate a business rule (for example a nonexistent category, or a name that duplicates another existing active category)
- **THEN** the category is left unchanged and the tool returns a failure describing what was invalid
