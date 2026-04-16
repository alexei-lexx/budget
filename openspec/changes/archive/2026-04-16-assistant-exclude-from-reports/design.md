## Context

The assistant agent has tools to list, create, and update categories. Categories have an `excludeFromReports` boolean that controls whether their transactions appear in financial reports. The report service already respects this flag, but the assistant layer is completely unaware of it:

- `CategoryDto` (shared by create/update tools) omits `excludeFromReports`
- `get_categories` uses a local `CategoryData` interface that also omits it
- The system prompt doesn't mention the concept
- `create_category` hardcodes `excludeFromReports: false`
- `update_category` explicitly blocks changing it

## Goals / Non-Goals

**Goals:**

- Assistant sees which categories are report-excluded when listing them
- Assistant excludes report-excluded categories from spending/income calculations
- Assistant can set the flag when creating a category and toggle it when updating
- Tool descriptions explain the purpose of the flag
- System prompt explains the concept without hardcoding the property name

**Non-Goals:**

- Changing the report service or repository layer (already works correctly)
- Adding the flag to the GraphQL schema (UI already manages it independently)
- Modifying `aggregate_transactions` or `get_transactions` tools (assistant handles filtering by choosing which categoryIds to pass)

## Decisions

### 1. Reuse `CategoryDto` in `get_categories` tool

**Decision:** Replace the local `CategoryData` interface in `get_categories.ts` with `CategoryDto` extended with `recentDescriptions`.

**Why:** `CategoryDto` is already the shared representation used by create/update tools. Having a separate `CategoryData` with the same fields minus `excludeFromReports` is redundant. Adding the field to `CategoryDto` propagates it everywhere consistently.

**Alternative considered:** Keep `CategoryData` separate and add the field there too. Rejected — unnecessary duplication.

### 2. System prompt describes the concept, not the property name

**Decision:** Add a sentence to Background Knowledge explaining that categories can be marked to exclude their transactions from financial reports. Describe the behavioral rule: when computing spending or income totals, omit transactions from such categories and mention the omission.

**Why:** The prompt should teach the assistant the domain concept so it can reason about it naturally. Hardcoding a property name couples the prompt to implementation details.

**Where in the prompt:** Extend the existing **Category** paragraph in Background Knowledge. Add a behavioral rule to **Rules for Analysis and Calculations**.

### 3. Filtering happens at the assistant reasoning level, not in tools

**Decision:** The assistant decides which categories to include/exclude based on what `get_categories` returns. The `aggregate_transactions` and `get_transactions` tools remain unchanged.

**Why:** The tools already support `categoryIds` filtering. The assistant just needs to know which categories are excluded and pass the right IDs. This avoids duplicating report-service filtering logic in the tools and keeps the tools general-purpose.

### 4. `create_category` gets optional `excludeFromReports` parameter

**Decision:** Add `excludeFromReports` as an optional boolean to the create schema, defaulting to `false` when omitted.

**Why:** Matches the quiz decision. The tool already passes `excludeFromReports: false` to the service — making it configurable is a one-line schema change.

### 5. `update_category` gets optional `excludeFromReports` parameter

**Decision:** Add `excludeFromReports` as an optional boolean to the update schema. Remove the "not supported" line from the description.

**Why:** The service layer already supports updating this field. The tool was artificially blocking it.

### 6. Tool descriptions explain the flag's purpose

**Decision:** Add a brief explanation to `get_categories`, `create_category`, and `update_category` descriptions explaining that the flag controls whether transactions in the category are included in financial reports.

## Risks / Trade-offs

**Assistant may forget to filter** → Mitigated by explicit system prompt rule. The instruction to exclude report-excluded categories from calculations is placed in the analysis rules section where the assistant already follows step-by-step guidance.

**Extra tool call needed for calculations** → The assistant already fetches categories as part of its analysis workflow. It just needs to read the new field. No extra round-trip.

**Mentioning omission adds noise** → Only triggered for report-related queries (spending totals, income summaries). Non-report queries proceed without mention. This was a deliberate quiz decision.

## Constitution Compliance

- **Backend Layer Structure**: All changes are within the tool/agent layer. No service or repository modifications.
- **Test Strategy**: All modified files (`category-dto.ts`, `get-categories.ts`, `create-category.ts`, `update-category.ts`) have co-located test files that will be updated.
- **Code Quality Validation**: Tests, typecheck, and format will be run after implementation.
- **TypeScript Code Generation**: New schema fields use descriptive names and standard Zod types.
