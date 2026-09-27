## Why

The transaction-creation guide infers fields in this order: type, amount, account, category, date, description. But the account priority rules include "prefer the account most used with the inferred category" — a signal that needs category already resolved. Since category is inferred after account, this rule cannot be applied without resolving category out of order. Reordering to infer category before account removes this dependency: category inference does not need account, so it can run first, and account's category-based tie-break then has what it needs.

## What Changes

- Reorder the create-transaction guide/prompt so the Category section is inferred before the Account section, in both places that carry this text:
  - `backend/src/mcp/tools/guides.ts` (`create-transaction` MCP guide instruction)
  - `backend/src/langchain/agents/create-transaction-agent.ts` (inapp Assistant system prompt)
- Update the `create-transaction` guide summary in `openspec/specs/mcp-server/spec.md` to match the new field order
- No change to the selection rules themselves (currency match, name match, recurring match, category history, overall history for account; name match, recurring match, signal match for category) — only their order

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mcp-server`: the `create-transaction` guide's documented field-inference order changes from type, amount, account, category to type, amount, category, account

## Impact

- `backend/src/mcp/tools/guides.ts` — `CREATE_TRANSACTION_INSTRUCTION` text
- `backend/src/langchain/agents/create-transaction-agent.ts` — `SYSTEM_PROMPT_TEMPLATE` text
- `openspec/specs/mcp-server/spec.md` — `create-transaction` guide summary line
- No API, schema, or database changes. No behavior change to selection criteria — only the order in which fields are inferred, which resolves an internal dependency in the current text.

## Constitution Compliance

- No constitution principle governs prompt/guide text ordering; this change touches only prompt strings and spec prose, not architecture, layering, or data access.
- No violations identified.
