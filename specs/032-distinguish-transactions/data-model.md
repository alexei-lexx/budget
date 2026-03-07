# Data Model: Distinguish Refund and Income Transactions

**Branch**: `032-distinguish-transactions` | **Date**: 2026-03-07

## Summary

No data model changes required. This feature is a pure presentation-layer fix.

The `TransactionType` enum already includes all required values: `EXPENSE`, `INCOME`, `REFUND`, `TRANSFER_IN`, `TRANSFER_OUT`. The `type` field is already returned by the GraphQL API and stored in the database.

## Existing Relevant Model

```typescript
// Already defined in frontend/src/composables/useTransactions.ts
// and backend/src/schema.graphql

type TransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER_IN" | "TRANSFER_OUT";
```

## New Utility (presentation layer only)

The only addition is a pure function in `frontend/src/utils/transaction.ts`:

```typescript
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case "INCOME":       return "success";  // green
    case "REFUND":       return "info";     // blue
    case "TRANSFER_IN":  return "warning";  // orange
    case "TRANSFER_OUT": return "warning";  // orange
    case "EXPENSE":      return "error";    // red
  }
}
```

This is not a data model entity — it is a view-layer mapping function with no persistence, migration, or API surface.

## No Migrations Required

No data migrations. No schema changes. No `npm run codegen` needed.
