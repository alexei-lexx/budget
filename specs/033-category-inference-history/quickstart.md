# Quickstart

## Prerequisites

- DynamoDB Local running: `docker compose up -d`
- `cd backend && npm install`

## Tests

```bash
cd backend
npm test -- src/services/agent-data-service.test.ts
npm test
npm run typecheck && npm run format
```

## Verify end-to-end

1. Create 3+ transactions with similar descriptions → same category (e.g., **Eating out**)
2. Enter a new ambiguous description — agent should pick **Eating out**
3. Enter an unambiguous description — agent should pick the correct category regardless of history

## Constants

| Constant | Value |
|---|---|
| `CATEGORY_HISTORY_LOOKBACK_DAYS` | `90` |
| `CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY` | `10` |
