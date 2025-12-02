# GraphQL Mutation Contracts

**Phase**: Phase 1 (Design & Contracts)
**Date**: 2025-12-02

## Overview

Transaction duplication reuses existing mutations (`createTransaction`, `createTransfer`). No new mutations required. This document defines how existing mutations are called to support duplication.

## Existing Mutations Used

### `createTransaction` - Regular Transaction Duplication

**Used for**: EXPENSE, INCOME, REFUND transaction duplication

**GraphQL Schema** (existing):

```graphql
mutation CreateTransaction($input: CreateTransactionInput!) {
  createTransaction(input: $input) {
    id
    date
    amount
    currency
    accountId
    categoryId
    description
    type
    userId
    createdAt
    updatedAt
    isArchived
  }
}

input CreateTransactionInput {
  date: Date!
  amount: Decimal!
  currency: String!
  accountId: UUID!
  categoryId: UUID
  description: String
  type: TransactionType!
  # Note: userId and createdAt/updatedAt are set by backend
}

enum TransactionType {
  INCOME
  EXPENSE
  REFUND
  TRANSFER_IN
  TRANSFER_OUT
}
```

**Duplicate Call Example**:

```graphql
mutation DuplicateTransaction($input: CreateTransactionInput!) {
  createTransaction(input: $input) {
    id
    date
    amount
    currency
    accountId
    categoryId
    description
    type
  }
}
```

**Input Prefill From Source** (when duplicating a regular transaction):

```typescript
// Loaded from source transaction
const prefillData: CreateTransactionInput = {
  date: new Date(), // Always today, not source.date
  amount: source.amount,
  currency: source.currency,
  accountId: source.accountId,
  categoryId: source.categoryId, // May be null
  description: source.description, // May be null
  type: source.type // EXPENSE, INCOME, or REFUND
};
```

### `createTransfer` - Transfer Duplication

**Used for**: TRANSFER_IN, TRANSFER_OUT transaction duplication

**GraphQL Schema** (existing):

```graphql
mutation CreateTransfer($input: CreateTransferInput!) {
  createTransfer(input: $input) {
    fromTransactionId
    toTransactionId
    fromAccountId
    toAccountId
    amount
    date
    description
    createdAt
    updatedAt
  }
}

input CreateTransferInput {
  fromAccountId: UUID!
  toAccountId: UUID!
  amount: Decimal!
  date: Date!
  description: String
  # Note: userId is inferred from authenticated context
}
```

**Duplicate Call Example**:

```graphql
mutation DuplicateTransfer($input: CreateTransferInput!) {
  createTransfer(input: $input) {
    fromTransactionId
    toTransactionId
    fromAccountId
    toAccountId
    amount
    date
  }
}
```

**Input Prefill From Source** (when duplicating a transfer):

```typescript
// Loaded from source transfer
const prefillData: CreateTransferInput = {
  fromAccountId: source.fromAccountId,
  toAccountId: source.toAccountId,
  amount: source.amount,
  date: new Date(), // Always today, not source.date
  description: source.description // May be null
};
```

## No New Mutations Required

✓ Existing `createTransaction` mutation validates and creates transactions
✓ Existing `createTransfer` mutation validates and creates transfers
✓ Both mutations already enforce user data isolation via authenticated context
✓ Both mutations already apply same validation as manual creation
✓ Date field always explicitly passed from frontend (always today)

## Frontend Integration

### Load Duplicate Data

The frontend needs to load the source transaction data to prefill the form. This can be done in two ways:

**Option 1: Use Existing Transaction Query** (RECOMMENDED)

```graphql
query GetTransaction($id: UUID!) {
  transaction(id: $id) {
    id
    date
    amount
    currency
    accountId
    categoryId
    description
    type
    # For transfers, may need linked transaction info
  }
}
```

**Option 2: New Query** (if needed for transfer complexity)

```graphql
query GetDuplicateData($transactionId: UUID!) {
  transaction(id: $transactionId) {
    id
    date
    amount
    currency
    accountId
    categoryId
    description
    type
    # Type-specific nested fields for transfers
    linkedTransactions {
      id
      type
      fromAccountId
      toAccountId
    }
  }
}
```

### Frontend Flow

```typescript
// 1. User clicks Copy button on expanded transaction
// 2. Frontend loads source transaction data
const sourceData = await getTransaction(transactionId);

// 3. Determine form type based on transaction type
if (sourceData.type === 'TRANSFER_IN' || sourceData.type === 'TRANSFER_OUT') {
  // Open transfer form with prefill
  const transferPrefill = buildTransferDuplicateData(sourceData);
  openTransferForm(transferPrefill);
} else {
  // Open regular transaction form with prefill
  const txnPrefill = buildTransactionDuplicateData(sourceData);
  openTransactionForm(txnPrefill);
}

// 4. User edits form (optional) and saves
// 5. Existing createTransaction/createTransfer mutation is called
// 6. Form closes, transaction list refreshed
```

## Validation & Error Handling

**Inherited from existing mutations**:
- Invalid amount (non-positive, format errors)
- Invalid account (not found, deleted)
- Invalid category (not found, deleted, wrong type)
- Invalid date (past for certain transaction types, if applicable)
- Missing required fields

**Authorization** (inherited):
- Resolver verifies authenticated user can access source transaction
- Resolver verifies user owns source transaction
- Service layer filters all queries by userId
- Repository layer enforces userId isolation

## Next Steps

1. Create quickstart.md with implementation walkthrough
2. Update agent context for development
3. Generate tasks.md for implementation sprint
