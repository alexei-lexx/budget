# Phase 1: Data Model - Refunds Feature

**Date**: 2025-10-31
**Branch**: `009-refunds`
**Status**: Complete
**Reference**: [research.md](./research.md)

---

## Domain Model Overview

```
    ┌─────────────────┐
    │   Transaction   │
    │   (EXPENSE)     │
    └────────┬────────┘
             │ originalTransactionId
             │ (1:N relationship)
             ▼
    ┌─────────────────┐
    │   Transaction   │
    │    (REFUND)     │
    └─────────────────┘
```

Refunds are implemented as a **new transaction type** linking back to original expense transactions via the `originalTransactionId` field. This maintains architectural consistency with existing transfer pattern (which uses `transferId` to link paired transactions).

---

## Entity Definition: Transaction (Extended)

**Existing Entity Enhanced**

### Table: `transactions`
```
Partition Key: userId
Sort Key: id (UUID v4)
Global Secondary Indexes:
  - UserCreatedAtIndex (userId + createdAt DESC)
  - UserDateIndex (userId + date ASC)
```

### Fields

| Field | Type | Required | Description | Constraints |
|-------|------|----------|-------------|------------|
| userId | string | ✓ | Partition key (user isolation) | UUID v4, max 36 chars |
| id | string | ✓ | Sort key, unique per user | UUID v4, max 36 chars |
| accountId | string | ✓ | FK to Account table | UUID v4, valid account ownership |
| categoryId | string | | FK to Category table | UUID v4 or undefined |
| type | enum | ✓ | Transaction type | INCOME \| EXPENSE \| TRANSFER_IN \| TRANSFER_OUT \| **REFUND** |
| amount | number | ✓ | Transaction amount | positive, max 2 decimals |
| currency | string | ✓ | ISO 4217 code | 3-char code (USD, EUR, etc.) |
| date | string | ✓ | Transaction date | YYYY-MM-DD format |
| description | string | | Optional description | max 500 chars |
| transferId | string | | Links paired transfer transactions | UUID v4 or undefined |
| **originalTransactionId** | string | | **NEW: Links refund to original expense** | UUID v4 or undefined |
| isArchived | boolean | ✓ | Soft-delete flag | false by default |
| createdAt | string | ✓ | Creation timestamp | ISO 8601 (auto-set) |
| updatedAt | string | ✓ | Last update timestamp | ISO 8601 (auto-updated) |

### Type-Specific Constraints

#### REFUND Type Rules
```typescript
if (type === 'REFUND') {
  // MUST have these fields:
  originalTransactionId: required // Links to original
  currency: required // Same as original transaction
  accountId: required // Destination account (can differ from original)

  // CAN have these fields:
  categoryId: optional // MUST be INCOME type if provided
  description: optional
  date: optional (defaults to today)

  // CANNOT have these fields:
  transferId: undefined // Refunds don't use transfer linking

  // Derived fields (calculated, not stored):
  refunds: [] // Empty array (only EXPENSE has refunds)
  refundSummary: undefined // Not applicable for refund transactions
  originalTransactionId: must be populated // Identifies the linked expense
}

if (type === 'EXPENSE') {
  // Special handling when viewing expanded:
  refunds: Transaction[] // All REFUND type transactions with this.id = refund.originalTransactionId
  refundSummary: {
    totalRefunded: float
    remainingRefundable: float
    count: int
  }
  originalTransactionId: undefined // Expenses don't link to originals
}
```

### Validation Rules

#### Field Validation
1. **accountId**: Must be valid UUID; account must exist and belong to authenticated user
2. **categoryId**: If provided, must be valid UUID; category must exist and belong to user
3. **amount**: Must be positive number; max 2 decimal places
4. **currency**: Must be valid ISO 4217 code (3 chars)
5. **date**: Must be YYYY-MM-DD format; cannot be in future
6. **description**: Max 500 characters if provided
7. **type**: Must be one of enum values
8. **originalTransactionId** (REFUND only): Must be valid UUID; must reference existing EXPENSE transaction owned by user

#### Business Rules

**When Creating REFUND Transaction:**
1. **Original Exists**: Referenced expense transaction must exist and belong to authenticated user
2. **Expense Only**: Original transaction must have `type = EXPENSE`
3. **Destination Account**: Destination account must exist and belong to user (can be different from original)
4. **Currency Handling**: Refund amount stored in original transaction's currency (no conversion)
5. **Category Type**: If category provided, must be INCOME type (never EXPENSE)
6. **Amount Validation**: Must be positive; can exceed remaining refundable amount (allowed by design)
7. **Uniqueness**: No uniqueness constraint (multiple refunds allowed per expense)

**When Deleting/Archiving:**
1. **Soft-Delete**: Only set `isArchived = true`; do not remove from database
2. **Cannot Delete Original with Active Refunds**: Original expense cannot be deleted if it has non-archived refunds
3. **Refund Deletion Safe**: Deleting refund doesn't affect original transaction

**When Viewing:**
1. **Exclude Archived**: Queries exclude `isArchived = true` records by default
2. **Refund List**: EXPENSE transactions display refunds list (non-archived only)
3. **Summary Calculation**: Total refunded = sum of non-archived refund amounts; remaining = original amount - total refunded

---

## Data Model Relationships

### Relationships Diagram

```
User (Auth0)
  │
  ├─→ Account (multiple)
  │     │
  │     └─→ Transaction (multiple) ← accountId (FK)
  │           │
  │           ├─ type: INCOME/EXPENSE/TRANSFER_IN/TRANSFER_OUT
  │           │
  │           └─ For EXPENSE transactions:
  │               │
  │               └─→ Refund Transactions (multiple)
  │                     │
  │                     ├─ type: REFUND
  │                     ├─ originalTransactionId: points to EXPENSE
  │                     ├─ accountId: can be different from original
  │                     └─ currency: same as original
  │
  └─→ Category (multiple)
        │
        └─→ Transaction (optional categoryId)
            └─→ Refund (optional categoryId, INCOME only)
```

### Relationship Details

#### Transaction → Refund (1:N)
- **Primary**: Transaction with `type = EXPENSE`
- **Foreign**: Transaction with `type = REFUND` and `originalTransactionId = primary.id`
- **Cardinality**: One EXPENSE can have 0..N REFUNDs
- **Referential Integrity**: Original expense must exist before refund can be created
- **Cascade Delete**: Cannot delete original if it has active refunds
- **Query Pattern**: `findActiveByOriginalTransactionId(originalTransactionId, userId)`

#### Refund → Account (N:1)
- **Primary**: Account table
- **Foreign**: Transaction with `type = REFUND` and specific `accountId`
- **Cardinality**: Multiple refunds can go to same account
- **Currency Mismatch**: Permitted (destination account currency can differ from original)
- **Query Pattern**: Existing `findActiveByAccountId(accountId, userId)` returns refunds too

#### Refund → Category (0..1)
- **Primary**: Category table with `type = INCOME`
- **Foreign**: Transaction with `type = REFUND` and specific `categoryId`
- **Constraint**: Only INCOME categories allowed (not EXPENSE)
- **Optional**: Category can be undefined (uncategorized refund)
- **Query Pattern**: Existing `findActiveByCategoryId(categoryId, userId)` returns refunds

---

## State Transitions

### Refund Lifecycle

```
┌────────────────────┐
│   Created          │
│ isArchived: false  │
│ (active)           │
└─────────┬──────────┘
          │
    Create Refund
    Validate expense exists
    Check account ownership
    Check category type (if any)
          │
          ▼
┌────────────────────┐
│   Active           │
│ Visible in UI      │ ◄─────────────────┐
│ Affects balance    │                   │
└─────────┬──────────┘                   │
          │                              │
    Delete Refund                  Recreate via unarchive
    Set isArchived = true          (conceptually; not implemented)
          │                              │
          ▼                              │
┌────────────────────┐                   │
│   Archived         │                   │
│ (soft-deleted)     │───────────────────┘
│ Hidden from UI     │
│ Doesn't affect     │
│ balance            │
└────────────────────┘
```

### Original Transaction State with Refunds

```
EXPENSE Transaction States:

State 1: No Refunds
├─ refunds: []
├─ refundSummary: null (or omitted)
├─ displayAmount: original amount (normal styling)
└─ canDelete: true (no active refunds)

State 2: Partial Refunds
├─ refunds: [Refund1, Refund2, ...]
├─ refundSummary:
│  ├─ totalRefunded: 70 USD
│  ├─ remainingRefundable: 30 USD
│  └─ count: 2
├─ displayAmount: original amount (strikethrough) + remaining (normal)
├─ canEdit: true (with warning if new amount < totalRefunded)
└─ canDelete: false (has active refunds)

State 3: Fully Refunded (amount = totalRefunded)
├─ refunds: [Refund1, Refund2, ...]
├─ refundSummary:
│  ├─ totalRefunded: 100 USD
│  ├─ remainingRefundable: 0 USD
│  └─ count: 2
├─ displayAmount: original amount (strikethrough) + €0 (normal)
├─ canEdit: true (with warning)
└─ canDelete: false (has active refunds)

State 4: Over-Refunded (totalRefunded > amount)
├─ refunds: [Refund1, Refund2, Refund3, ...]
├─ refundSummary:
│  ├─ totalRefunded: 120 USD
│  ├─ remainingRefundable: -20 USD (negative)
│  └─ count: 3
├─ displayAmount: original amount (strikethrough) + remaining (normal)
├─ canEdit: true (with warning)
└─ canDelete: false (has active refunds)
```

---

## Account Balance Calculation

### Formula

```
Account Balance = initialBalance
                + sum(INCOME transactions, non-archived)
                + sum(TRANSFER_IN transactions, non-archived)
                + sum(REFUND transactions, non-archived)        // NEW
                - sum(EXPENSE transactions, non-archived)
                - sum(TRANSFER_OUT transactions, non-archived)
```

### Example Calculation

```
Account A (USD):
  Initial Balance: $1000

Transactions:
  1. INCOME: +$500 (salary)
  2. EXPENSE: -$100 (groceries)
  3. EXPENSE: -$80 (gas)
     - REFUND: +$50 (partial refund to Account A)
     - REFUND: +$30 (another refund to Account A)
  4. TRANSFER_OUT: -$200 (to Account B)
  5. TRANSFER_IN: +$100 (from Account C)

Calculation:
  Balance = 1000
          + 500 (INCOME)
          - 100 (EXPENSE)
          - 80 (EXPENSE)
          + 50 + 30 (REFUND - both affecting Account A)
          - 200 (TRANSFER_OUT)
          + 100 (TRANSFER_IN)
  = 1300

View of EXPENSE #3 (original):
  refundSummary:
    totalRefunded: 80 USD
    remainingRefundable: 0 USD
    count: 2
```

---

## Database Schema Changes

### Transaction Table - DynamoDB

**No table structure changes** - Adding new optional field to existing table:

```typescript
// Current interface
interface Transaction {
  userId: string;          // PK
  id: string;              // SK
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferId?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Enhanced interface (backward compatible)
interface Transaction {
  userId: string;          // PK
  id: string;              // SK
  accountId: string;
  categoryId?: string;
  type: TransactionType;   // Now includes REFUND
  amount: number;
  currency: string;
  date: string;
  description?: string;
  transferId?: string;
  originalTransactionId?: string; // NEW - only for REFUND type
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Extended enum
enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  REFUND = "REFUND",  // NEW
}
```

### Migration Path
- **Zero downtime**: New field is optional (`originalTransactionId?`)
- **Backward compatible**: Existing transactions unaffected
- **No index changes needed**: Queries filtered by type, not by originalTransactionId
- **Future optimization**: Could add GSI on `originalTransactionId` if needed

---

## Validation Rules Matrix

### Input Validation (GraphQL layer with Zod)

```
CreateRefundInput:
  originalTransactionId: UUID, required
  accountId: UUID, required
  amount: positive number, required, max 2 decimals
  categoryId: UUID, optional
  date: YYYY-MM-DD, optional
  description: max 500 chars, optional
```

### Business Validation (Service layer)

| Check | Type | Error Code | Message |
|-------|------|-----------|---------|
| Original transaction exists | Service | REFUND_001 | "Original transaction not found" |
| Original is EXPENSE | Service | REFUND_002 | "Refunds can only be created for expense transactions" |
| Original belongs to user | Service | REFUND_003 | "Not authorized to create refund for this transaction" |
| Destination account exists | Service | REFUND_004 | "Destination account not found" |
| Account belongs to user | Service | REFUND_005 | "Not authorized to use this account" |
| Category exists (if provided) | Service | REFUND_006 | "Category not found" |
| Category type is INCOME | Service | REFUND_007 | "Refunds can only use income-type categories" |
| Amount is positive | Input | REFUND_008 | "Refund amount must be positive" |
| Amount format | Input | REFUND_009 | "Refund amount must have max 2 decimal places" |

---

## Query Patterns

### Repository Methods (New/Enhanced)

#### New Method
```typescript
/**
 * Find all active refund transactions linked to an original expense
 */
async findActiveByOriginalTransactionId(
  originalTransactionId: string,
  userId: string,
): Promise<Transaction[]> {
  // DynamoDB query:
  // Filter: userId = ? AND originalTransactionId = ? AND isArchived = false
  // Sort: createdAt DESC (newest first)
}
```

#### Existing Method (No Changes)
```typescript
// TransactionRepository.findActiveByAccountId()
// Already returns all transaction types including REFUND
// No code changes needed
```

### GraphQL Query Patterns

#### Transaction with Refunds (Expanded View)
```graphql
query GetExpenseWithRefunds($transactionId: ID!) {
  transaction(id: $transactionId) {
    id
    amount
    date
    account { id name }
    category { id name }
    type

    # NEW fields (only populated for EXPENSE type):
    refunds {
      id
      amount
      date
      account { id name }
      category { id name }
    }
    refundSummary {
      totalRefunded
      remainingRefundable
      count
    }
  }
}
```

#### Create Refund Mutation
```graphql
mutation CreateRefund($input: CreateRefundInput!) {
  createRefund(input: $input) {
    id
    type
    amount
    account { id name }
    date
  }
}
```

---

## Summary of Changes

### Backend
- ✅ Add `REFUND` to TransactionType enum
- ✅ Add `originalTransactionId?: string` to Transaction interface
- ✅ Add `findActiveByOriginalTransactionId()` to TransactionRepository
- ✅ Create RefundService with `createRefund()`, `deleteRefund()` methods
- ✅ Update balance calculation to include REFUND type
- ✅ Add GraphQL resolvers for refund mutations

### Frontend
- ✅ Schema sync (auto-generated during build)
- ✅ Update Transaction type to include refunds field
- ✅ Update TransactionCard component to display refund section
- ✅ Create refund form modal
- ✅ Update transaction type filters to include REFUND

### Database
- ✅ No table structure changes (backward compatible)
- ✅ New optional field on Transaction table

---

## Constraints & Assumptions

### Hard Constraints
1. Refunds can ONLY link to EXPENSE transactions (enforced in service layer)
2. Refund category (if provided) must be INCOME type (enforced in validation)
3. Original transaction cannot be deleted if it has active refunds (enforced in service)
4. Refund amount stored in original transaction's currency (specification requirement)

### Soft Constraints
1. Multiple refunds allowed per expense (by design)
2. Over-refunding allowed (remaining can be negative) (by design)
3. Cross-currency refunds allowed (optional warning in UI)
4. Deleted refunds don't appear in UI (standard soft-delete pattern)

### Assumptions
1. Refund date defaults to today (can be overridden)
2. Refund destination account can differ from original
3. Refund transactions appear as separate items in transaction list (type = REFUND)
4. Refund transactions appear in account balance calculations
5. Refund transactions excluded from monthly expense reports (specification)

---

**Ready for Phase 1 Contracts & Quickstart**
