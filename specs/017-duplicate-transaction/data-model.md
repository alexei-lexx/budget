# Data Model: Transaction Duplication

**Phase**: Phase 1 (Design & Contracts)
**Date**: 2025-12-02
**Status**: Complete

## Overview

Transaction duplication reuses existing transaction and transfer data structures. No new database entities required. This document defines the data flow for the duplication feature.

## Existing Entities (No Schema Changes)

### Transaction

**Existing Fields Used for Duplication**:

| Field | Type | Source | Target | Notes |
|-------|------|--------|--------|-------|
| `id` | UUID | Source Transaction | ❌ (Not copied) | New transaction gets new ID |
| `date` | Date | ❌ (Not copied) | Target | Always set to today |
| `amount` | Decimal | Source Transaction | ✓ Copied | Same amount from original |
| `currency` | String (3-char) | Source Transaction | ✓ Copied | Same currency code |
| `accountId` | UUID | Source Transaction | ✓ Copied | Same account |
| `categoryId` | UUID | Source Transaction | ✓ Copied (may be null) | Same category or null |
| `description` | String | Source Transaction | ✓ Copied (may be null) | Same description or null |
| `type` | Enum | Source Transaction | ✓ Copied | One of: INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT |
| `userId` | UUID | Authenticated User | ✓ Set | From JWT context, not copied |
| `createdAt` | Timestamp | System | ❌ (Not copied) | New timestamp |
| `updatedAt` | Timestamp | System | ❌ (Not copied) | New timestamp |
| `isArchived` | Boolean | System | ✓ Set to false | New transaction always active |

**Soft-Deletion Behavior**:
- Duplicating archived transactions is allowed (shows deleted account/category in form)
- Created transaction always has `isArchived = false`
- Follows existing transaction creation patterns

### Transfer

**Existing Fields Used for Transfer Duplication**:

| Field | Type | Source | Target | Notes |
|-------|------|--------|--------|-------|
| `fromAccountId` | UUID | Source Transfer | ✓ Copied | Source account |
| `toAccountId` | UUID | Source Transfer | ✓ Copied | Destination account |
| `amount` | Decimal | Source Transfer | ✓ Copied | Same amount |
| `date` | Date | ❌ (Not copied) | Target | Always set to today |
| `description` | String | Source Transfer | ✓ Copied (may be null) | Same description or null |
| `linkedTransactionIds` | UUID[] | ❌ (Not copied) | Target | New transfer creates new linked transactions |

**Transfer Creation Pattern**:
- Creating a transfer automatically creates two linked transaction records (TRANSFER_OUT + TRANSFER_IN)
- Duplication reuses this pattern
- Original transfer links are not duplicated

## Data Flow for Duplication

### Regular Transaction Duplication (EXPENSE, INCOME, REFUND)

```
User clicks Copy on expanded transaction
         ↓
Frontend captures source transaction ID
         ↓
Frontend calls getDuplicateTransactionData(transactionId) [if needed]
         ↓
Resolver loads source transaction (with authorization check)
         ↓
Create mutation called with prefilled form data:
  - amount, currency, accountId, categoryId, description, type
  - date: today's date
  - userId: from authenticated context
         ↓
Transaction saved to database with new ID
         ↓
Form closes, transaction list refreshed
```

### Transfer Duplication (TRANSFER_IN, TRANSFER_OUT)

```
User clicks Copy on expanded transfer transaction
         ↓
Frontend captures source transaction ID (identifies as transfer)
         ↓
Frontend calls getDuplicateTransferData(transactionId) [if needed]
         ↓
Resolver loads source transaction + linked transfer data
         ↓
Transfer create mutation called with prefilled form data:
  - fromAccountId, toAccountId, amount, description
  - date: today's date
  - userId: from authenticated context
         ↓
Transfer created (generates 2 linked transactions automatically)
         ↓
Form closes, transaction list refreshed
```

## Data Access Patterns

### Load Source Transaction

```typescript
// Service method
async duplicateTransaction(transactionId: string, userId: string) {
  // Load source transaction
  const sourceTransaction = await this.transactionRepository
    .findById(transactionId, userId);

  if (!sourceTransaction) {
    throw new NotFoundError('Transaction not found');
  }

  // Build prefill data based on type
  if (sourceTransaction.type === TransactionType.TRANSFER_IN ||
      sourceTransaction.type === TransactionType.TRANSFER_OUT) {
    return this.buildTransferDuplicateData(sourceTransaction);
  } else {
    return this.buildTransactionDuplicateData(sourceTransaction);
  }
}
```

### Regular Transaction Duplication Data

```typescript
interface TransactionDuplicateData {
  amount: Decimal;
  currency: string;
  accountId: UUID;
  categoryId?: UUID;
  description?: string;
  type: TransactionType; // EXPENSE, INCOME, or REFUND
  date: Date; // Always today
}
```

### Transfer Duplication Data

```typescript
interface TransferDuplicateData {
  fromAccountId: UUID;
  toAccountId: UUID;
  amount: Decimal;
  description?: string;
  date: Date; // Always today
}
```

## Validation Rules

**Applied at GraphQL Layer** (input validation via Zod):
- amount: positive decimal, matches existing createTransaction validation
- currency: valid 3-char code
- accountId: required UUID, must exist
- categoryId: optional UUID, if provided must exist and belong to user
- description: optional string, max length (from existing rules)
- date: valid date

**Applied at Service Layer** (business logic validation):
- Source transaction must belong to authenticated user
- Source account must exist (deleted accounts allowed to display, but new transaction must use valid account)
- Source category must exist (deleted categories allowed to display, but new transaction must use valid category)
- Category type must match transaction type (if category exists)

**Applied at Repository Layer**:
- All queries filtered by userId
- All inserts include userId

## Schema Changes Required

**None**. Feature uses existing `createTransaction` and `createTransfer` mutations with no new fields or types.

## Next Steps

1. Define GraphQL contracts (API endpoints)
2. Create quickstart.md with implementation details
3. Update agent context
4. Generate tasks.md for implementation phase
