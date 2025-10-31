# Phase 1: Quickstart Guide - Refunds Feature

**Date**: 2025-10-31
**Branch**: `009-refunds`
**Status**: Complete
**Reference Implementation Path**: [data-model.md](./data-model.md) and [contracts/schema.graphql](./contracts/schema.graphql)

---

## Overview

This quickstart guide walks through testing the refunds feature after implementation. It assumes the backend and frontend code changes have been completed according to [data-model.md](./data-model.md).

---

## Part 1: Backend Setup & Testing

### 1. Verify Database Schema

The refunds feature adds an optional field to the existing `transactions` table. No table structure changes required.

```bash
# In backend directory
cd backend

# Start DynamoDB Local if not running
npm run db:setup

# Verify transaction table has new optional field in types:
# originalTransactionId?: string (only for REFUND type)
# See: src/models/Transaction.ts
```

### 2. Review Code Changes

Verify these files have been updated:

```bash
# Check Transaction model includes REFUND type
cat src/models/Transaction.ts
# Look for: enum TransactionType { ..., REFUND }
# Look for: originalTransactionId?: string

# Check TransactionRepository has new method
cat src/repositories/TransactionRepository.ts
# Look for: findActiveByOriginalTransactionId()

# Check GraphQL schema includes refund types
cat src/schema.graphql
# Look for: type RefundSummary { ... }
# Look for: refunds: [Transaction!]!
# Look for: originalTransactionId: String
# Look for: input CreateRefundInput { ... }
# Look for: createRefund(...): Transaction!
# Look for: deleteRefund(refundId: ID!): Boolean!

# Check RefundService exists
cat src/services/refundService.ts
# Look for: class RefundService { ... }
# Look for: createRefund(...) { ... }
# Look for: deleteRefund(...) { ... }
```

### 3. Run Backend Tests

```bash
# Run Jest tests for repositories and services
npm run test

# Expected: All existing tests pass + new refund tests pass
# Key test cases:
#   - RefundService.createRefund() validates original transaction
#   - RefundService.createRefund() checks category type (INCOME only)
#   - TransactionRepository.findActiveByOriginalTransactionId() returns correct refunds
#   - Account balance calculation includes REFUND type
#   - Cannot delete expense with active refunds
#   - Soft-delete (archive) refund works correctly
```

### 4. Start Backend Dev Server

```bash
# Terminal 1: DynamoDB Local
npm run db:start

# Terminal 2: Backend GraphQL server
npm run dev
# Server runs at http://localhost:4000/graphql
```

### 5. Test Refund Creation via GraphQL Playground

Open http://localhost:4000/graphql and run these queries:

#### Step 1: Create Test Data

```graphql
# Create a test account
mutation CreateAccount {
  createAccount(input: {
    name: "Test Account"
    initialBalance: 1000
    currency: "USD"
  }) {
    id
    name
    balance
  }
}
# Copy the account ID for next step
```

```graphql
# Create an expense transaction
mutation CreateExpense {
  createTransaction(input: {
    accountId: "[ACCOUNT_ID_FROM_PREVIOUS]"
    type: EXPENSE
    amount: 100
    date: "2025-10-31"
    description: "Test purchase"
  }) {
    id
    type
    amount
    date
  }
}
# Copy the transaction ID for next step
```

#### Step 2: Create Refund

```graphql
# Create a refund for the expense
mutation CreateRefund {
  createRefund(input: {
    originalTransactionId: "[EXPENSE_TRANSACTION_ID]"
    accountId: "[ACCOUNT_ID]"
    amount: 50
    date: "2025-10-31"
    description: "Partial refund"
  }) {
    id
    type
    amount
    originalTransactionId
  }
}
# Expected response:
# {
#   "id": "uuid-of-refund",
#   "type": "REFUND",
#   "amount": 50,
#   "originalTransactionId": "uuid-of-expense"
# }
```

#### Step 3: Query Expense with Refunds

```graphql
# Query the expense transaction and see its refunds
query GetExpense {
  transaction(id: "[EXPENSE_TRANSACTION_ID]") {
    id
    type
    amount
    description
    refunds {
      id
      type
      amount
      date
      originalTransactionId
    }
    refundSummary {
      totalRefunded
      remainingRefundable
      count
    }
  }
}
# Expected response:
# {
#   "id": "uuid-of-expense",
#   "type": "EXPENSE",
#   "amount": 100,
#   "description": "Test purchase",
#   "refunds": [
#     {
#       "id": "uuid-of-refund",
#       "type": "REFUND",
#       "amount": 50,
#       "date": "2025-10-31",
#       "originalTransactionId": "uuid-of-expense"
#     }
#   ],
#   "refundSummary": {
#     "totalRefunded": 50,
#     "remainingRefundable": 50,
#     "count": 1
#   }
# }
```

#### Step 4: Verify Account Balance

```graphql
# Check account balance includes refund
query GetAccount {
  account(id: "[ACCOUNT_ID]") {
    id
    name
    balance
  }
}
# Expected: balance = 1000 - 100 (expense) + 50 (refund) = 950
```

#### Step 5: Delete Refund (Soft-Delete)

```graphql
# Soft-delete (archive) the refund
mutation DeleteRefund {
  deleteRefund(refundId: "[REFUND_ID]")
}
# Expected: true

# Query again to verify refund removed from list
query GetExpense {
  transaction(id: "[EXPENSE_TRANSACTION_ID]") {
    refunds {
      id
    }
    refundSummary {
      totalRefunded
      remainingRefundable
      count
    }
  }
}
# Expected: refunds list empty, refundSummary null/empty
# Expected: balance = 1000 - 100 = 900 (refund no longer counted)
```

### 6. Test Error Cases

```graphql
# Error: Original transaction not EXPENSE type
mutation CreateRefundOnIncome {
  createRefund(input: {
    originalTransactionId: "[INCOME_TRANSACTION_ID]"
    accountId: "[ACCOUNT_ID]"
    amount: 50
  }) {
    id
  }
}
# Expected error: "Refunds can only be created for expense transactions"

# Error: Negative amount
mutation CreateRefundNegativeAmount {
  createRefund(input: {
    originalTransactionId: "[EXPENSE_ID]"
    accountId: "[ACCOUNT_ID]"
    amount: -50
  }) {
    id
  }
}
# Expected error: Input validation error on amount

# Error: EXPENSE category on refund
mutation CreateRefundWithExpenseCategory {
  createRefund(input: {
    originalTransactionId: "[EXPENSE_ID]"
    accountId: "[ACCOUNT_ID]"
    amount: 50
    categoryId: "[EXPENSE_CATEGORY_ID]"
  }) {
    id
  }
}
# Expected error: "Refunds can only use income-type categories"
```

---

## Part 2: Frontend Integration Testing

### 1. Verify Schema Sync

```bash
# In frontend directory
cd frontend

# Schema should auto-sync during dev
npm run dev
# Check: frontend/src/schema.graphql includes REFUND type

# Or manual sync
npm run codegen:sync-schema
npm run codegen
# Check: frontend/src/__generated__/graphql-types.ts includes REFUND in TransactionType enum
# Check: frontend/src/__generated__/vue-apollo.ts includes useCreateRefundMutation, etc.
```

### 2. UI Component Testing

After implementing frontend components (TransactionCard, RefundForm, etc.):

#### Test 1: Expense Card with Refund Button

1. Start frontend: `npm run dev` (http://localhost:5173)
2. Navigate to transactions list
3. Find an EXPENSE transaction
4. Expand the transaction card
5. Look for "Refund" button
   - ✅ Button visible for EXPENSE type
   - ❌ Button hidden for INCOME, TRANSFER types

#### Test 2: Refund Form Modal

1. Click "Refund" button on EXPENSE card
2. Refund form should open with:
   - Original transaction details (read-only)
   - Amount field pre-filled with original amount
   - "Remaining refundable" help text showing amount
   - Category dropdown showing only INCOME categories
   - Account dropdown pre-selected with original account
   - Date field pre-filled with today
   - Save and Cancel buttons
3. Modify amount and verify "remaining refundable" updates
4. Change account (verify cross-account refund supported)
5. Select INCOME category
6. Click Save
7. Verify refund appears in list

#### Test 3: Refund Display in Expanded View

1. Expand EXPENSE transaction with refunds
2. Verify display shows:
   - Original amount with strikethrough
   - Remaining amount with normal styling
   - "Refunds" section with list of refunds
   - Each refund shows: date, account, category, amount
   - Refund summary: "Total refunded: $XX, Remaining: $YY"

#### Test 4: Account Balance Update

1. Check account balance before refund
2. Create refund
3. Verify account balance updated within 2 seconds
4. Delete refund (soft-delete)
5. Verify account balance updated back

#### Test 5: Transaction List Filtering

1. Transaction list includes REFUND type
2. Filter by type "REFUND" shows only refund transactions
3. Filter by type "EXPENSE" shows only expenses (refunds in separate list items)

#### Test 6: Refund in Multiple Accounts

1. Create expense in Account A (USD)
2. Create refund to Account A (USD) - verify balance updated
3. Create another refund to Account B (different currency) - verify balance updated
4. Check both accounts have correct balance

---

## Part 3: Integration Test Scenarios

### Scenario 1: Simple Refund

```
Setup:
  - Account A: USD, $1000 initial
  - Expense: $100

Actions:
  1. Create expense for $100
  2. Account A balance: $900
  3. Create refund $100
  4. Account A balance: $1000
  5. Delete refund
  6. Account A balance: $900

Verification:
  ✅ Refund appears in expense refunds list
  ✅ Balance updates correctly
  ✅ Soft-delete removes from view but not database
```

### Scenario 2: Multiple Refunds

```
Setup:
  - Account A: USD, $1000 initial
  - Expense: $100

Actions:
  1. Create refund 1: $30 to Account A
  2. Account A balance: $930
  3. Create refund 2: $50 to Account A
  4. Account A balance: $980
  5. Delete refund 1
  6. Account A balance: $950
  7. Refund 2 still visible with correct summary

Verification:
  ✅ Multiple refunds work
  ✅ Summary shows: totalRefunded=50, remainingRefundable=50, count=1
  ✅ Refunds appear in correct order
```

### Scenario 3: Cross-Currency Refunds

```
Setup:
  - Account A: USD, $1000 initial
  - Account B: EUR, €500 initial
  - Expense: $100 USD in Account A

Actions:
  1. Create refund: $60 USD to Account B (EUR account)
  2. Verify Account A: $940 (deducted from expense)
  3. Verify Account B: €560 (refund in USD currency, not converted)
  4. Verify refund shows amount in USD

Verification:
  ✅ Refund amount stored in original currency
  ✅ Cross-currency refund permitted
  ✅ Each account balance includes refund (no conversion)
```

### Scenario 4: Over-Refunding

```
Setup:
  - Account A: USD, $1000 initial
  - Expense: $100

Actions:
  1. Create refund 1: $70
  2. Remaining: $30
  3. Create refund 2: $50 (exceeds remaining)
  4. Remaining: -$20 (negative, allowed)
  5. Account balance: $1020

Verification:
  ✅ Over-refunding permitted
  ✅ Summary shows negative remaining amount
  ✅ Account balance correctly reflects total refunds > original
```

### Scenario 5: Edit Original with Active Refunds

```
Setup:
  - Expense: $100
  - Refund: $60

Actions:
  1. Edit original expense amount to $50
  2. Should show warning: "Refunds total $60 but new amount is $50"
  3. Update allowed (with warning)
  4. Remaining: -$10

Verification:
  ✅ Warning displayed when new amount < totalRefunded
  ✅ Edit allowed (data consistency check, not prevention)
  ✅ Remaining amount updates to negative
```

---

## Part 4: Edge Cases & Validation

### Edge Case 1: Delete Original with Active Refunds

```
Setup:
  - Expense with active refunds

Action:
  1. Try to delete original expense

Expected:
  ❌ Error: "Cannot delete expense with active refunds"
  1. Delete all refunds first
  2. Then delete expense succeeds
```

### Edge Case 2: Create Refund for Non-Existent Expense

```
Action:
  1. Create refund with invalid originalTransactionId

Expected:
  ❌ Error: "Original transaction not found"
```

### Edge Case 3: Uncategorized Refund

```
Setup:
  - Refund form open
  - Category field empty

Action:
  1. Leave category empty (don't select)
  2. Click Save

Expected:
  ✅ Refund created successfully
  ✅ Refund.category = undefined
  ✅ Displays as "Uncategorized" in list
```

### Edge Case 4: Category Type Validation

```
Action:
  1. Try to create refund with EXPENSE category

Expected:
  ❌ Error: "Refunds can only use income-type categories"
  ✅ Category dropdown only shows INCOME categories
```

---

## Part 5: Performance Testing

### Test 1: Load Transaction with Many Refunds

```
Setup:
  - Expense transaction
  - 100 active refunds on same expense

Test:
  1. Query expense with all refunds
  2. Measure load time
  3. Expand transaction card in UI

Expectation:
  ✅ Query completes in < 1 second
  ✅ UI renders in < 2 seconds
  ✅ No performance degradation with 100 refunds
```

### Test 2: List 100 Transactions

```
Setup:
  - 100 transactions (mix of types)
  - 30 expenses with refunds (2-3 each)

Test:
  1. Load transaction list (collapsed view)
  2. Measure load time
  3. Expand 10 transactions

Expectation:
  ✅ List loads < 500ms (no refund details in collapsed view)
  ✅ Each expansion loads refunds < 200ms
  ✅ Lazy loading strategy prevents large initial payload
```

---

## Part 6: Cleanup & Verification

After completing tests, verify:

```bash
# 1. All Jest tests pass
cd backend && npm run test

# 2. No TypeScript errors
cd backend && npx tsc --noEmit
cd frontend && npm run type-check

# 3. Linting passes
cd backend && npm run lint
cd frontend && npm run lint

# 4. GraphQL schema valid
# (Verified via Apollo Server playground)

# 5. Database is consistent
# (Via DynamoDB Admin UI at http://localhost:8001)
```

---

## Troubleshooting

### Refund not appearing after creation

1. Check browser network tab - mutation returned success?
2. Check backend logs for any errors
3. Check DynamoDB Admin UI - is refund record in transactions table?
4. Verify query `refunds` field is included in GraphQL query
5. Check transaction type is EXPENSE

### Balance not updating

1. Verify refund transaction has correct type: "REFUND"
2. Check refund transaction has correct accountId
3. Verify `isArchived = false` on refund
4. Check account balance calculation includes REFUND type
5. Try refreshing page to verify data is on backend

### Refund form not showing

1. Verify transaction type is EXPENSE
2. Check TransactionCard component renders refund button
3. Verify refund form modal component exists
4. Check browser console for JavaScript errors
5. Verify GraphQL schema synced (check __generated__ files)

### Category dropdown showing wrong categories

1. Verify category filtering in refund form: `type = INCOME`
2. Check test data includes income categories
3. Verify category enum includes type field
4. Check GraphQL query includes category.type in response

---

## Summary

✅ Phase 1 complete with:
- **research.md**: Design decisions documented with pros/cons analysis
- **data-model.md**: Complete entity definitions and validation rules
- **contracts/schema.graphql**: GraphQL schema changes documented
- **quickstart.md**: This guide for testing and verification

🚀 **Ready to proceed with Phase 2: Task Generation** (`/speckit.tasks`)

---

## Quick Reference: Files to Implement

### Backend Files
1. `src/models/Transaction.ts` - Add REFUND type + originalTransactionId field
2. `src/repositories/transactionRepository.ts` - Add findActiveByOriginalTransactionId()
3. `src/services/refundService.ts` - New class with createRefund(), deleteRefund()
4. `src/resolvers/transaction.ts` - Add createRefund, deleteRefund mutations
5. `src/schema.graphql` - Add RefundSummary, extend Transaction, add CreateRefundInput

### Frontend Files
1. `src/graphql/operations/refunds.ts` - GraphQL queries and mutations
2. `src/components/TransactionCard.vue` - Add refund section + button
3. `src/components/RefundForm.vue` - New modal form component
4. `src/pages/TransactionList.vue` - Update type filtering for REFUND

### Testing
1. Backend tests for RefundService and TransactionRepository
2. Frontend manual UI testing (no E2E tests in MVP)

---

**For detailed implementation, refer to [data-model.md](./data-model.md) and [contracts/schema.graphql](./contracts/schema.graphql)**
