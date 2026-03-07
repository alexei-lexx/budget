# Quickstart: Distinguish Refund and Income Transactions

**Branch**: `032-distinguish-transactions` | **Date**: 2026-03-07

## What this feature does

Gives each transaction type a distinct Vuetify color in the transaction list:

| Type | Color | Visual |
|------|-------|--------|
| Income | `success` | Green |
| Refund | `info` | Blue |
| Transfer In | `warning` | Orange |
| Transfer Out | `warning` | Orange |
| Expense | `error` | Red |

Previously REFUND displayed as green (identical to INCOME), making them indistinguishable.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/utils/transaction.ts` | Add `getTransactionTypeColor()` |
| `frontend/src/components/transactions/TransactionCard.vue` | Use utility in `amountColor` computed |
| `frontend/src/components/transactions/TransactionForm.vue` | Use utility for icon colors in type toggle |

## Running the Dev Environment

```bash
# Start the frontend dev server
cd frontend
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) and navigate to the Transactions page.

## Manual Testing Checklist

1. Create an INCOME transaction → amount appears **green**
2. Create a REFUND transaction → amount appears **blue** (distinct from income)
3. Create an EXPENSE transaction → amount appears **red**
4. Create a transfer → both TRANSFER_IN and TRANSFER_OUT cards appear **orange**
5. Mix of all types in one list → all five types are visually distinct
6. Open "Create Transaction" form → EXPENSE icon=red, INCOME icon=green, REFUND icon=blue
7. Verify on mobile viewport (375px) that color indicators remain visible and don't truncate

## No Backend Steps

No backend changes, no codegen, no database migration.
