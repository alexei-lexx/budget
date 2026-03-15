## Why

The AI agent that creates transactions from natural language can call the `createTransaction` tool multiple times in a single request, persisting duplicate transactions even though only the last result is returned to the user.

## What Changes

- `createCreateTransactionTool` gains a `maxCreations` parameter (default `1`)
- The tool tracks successful creations via a closure counter; once the limit is reached it returns an error string instead of persisting another transaction
- Failed attempts do not increment the counter, preserving retry capability
- `CreateTransactionFromTextService` passes `maxCreations: 1` when constructing the tool

## Capabilities

### New Capabilities

- `transaction-creation-guard`: Enforces a per-request cap on the number of transactions the agent may successfully create

### Modified Capabilities

- `transactions`: Agent-initiated transaction creation is now limited to one successful creation per request

## Impact

- `backend/src/services/agent-tools/create-transaction-tool.ts` — new `maxCreations` param, closure counter
- `backend/src/services/create-transaction-from-text-service.ts` — pass `maxCreations: 1`
- Unit tests for the tool factory updated to cover limit enforcement and retry behaviour
