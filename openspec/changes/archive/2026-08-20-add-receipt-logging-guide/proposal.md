## Issue

**#552 — scan check**

## Why

Claude (via the MCP `create_transaction` tool) already logs receipts/checks from a photo, but the `create-transaction` guide has no rules for it — the model has to improvise store name, items, and units.

## What Changes

- `create-transaction` guide: allow store name in description (exception to "no parties"), itemize purchases with quantity/measure units when legible, never invent missing store/item/quantity/unit

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mcp-server`: `create-transaction` guide gains receipt/check description rules

## Impact

- `backend/src/mcp/tools/guides.ts` — `CREATE_TRANSACTION_INSTRUCTION` text only, no schema/tool changes

## Constitution Compliance

Prompt-text-only change; no schema, service, repository, or GraphQL code touched. No violations.
