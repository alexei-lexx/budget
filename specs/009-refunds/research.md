# Phase 0: Research Findings - Refunds Feature

**Date**: 2025-10-31
**Branch**: `009-refunds`
**Status**: Complete

## Executive Summary

Refunds feature implementation determined to follow **Option B: Refund as Transaction (Embedded Link)** pattern, mirroring existing transfer implementation. This recommendation balances architectural consistency, specification compliance, implementation complexity, and performance requirements.

---

## Research Topic 1: DynamoDB Transaction Schema & Current Patterns

### Decision: Single Transaction Table (Existing)

**Rationale:**
- Current system already stores transfers (linked via `transferId` field) in the Transaction table
- Refunds follow parallel pattern: one transaction (REFUND) linked to original via `originalTransactionId`
- No new table needed; minimal schema changes

### Findings

#### Current Transaction Table Structure
```
Table: transactions
  Partition Key: userId (enables per-user isolation)
  Sort Key: id (UUID v4)

Attributes:
  - accountId: string (FK to Account table)
  - categoryId?: string (optional)
  - type: TransactionType (INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT)
  - amount: number (positive value, no sign encoding)
  - currency: string (ISO code)
  - date: string (YYYY-MM-DD format)
  - description?: string
  - transferId?: string (links paired transfer transactions)
  - isArchived: boolean (soft-delete flag)
  - createdAt: string (ISO timestamp)
  - updatedAt: string (ISO timestamp)

Global Secondary Indexes:
  1. UserCreatedAtIndex (userId + createdAt DESC) - for pagination
  2. UserDateIndex (userId + date ASC) - for date-range queries
```

#### Balance Formula
```
Account Balance = initialBalance
                + sum(INCOME)
                + sum(TRANSFER_IN)
                - sum(EXPENSE)
                - sum(TRANSFER_OUT)
                + sum(REFUND)  // NEW: refunds add to balance
```

#### Existing Transfer Link Pattern
- Transfers create TWO transactions: TRANSFER_OUT (source account) and TRANSFER_IN (destination account)
- Both share same `transferId` UUID to establish pair
- Queried via: `TransactionRepository.findActiveByTransferId(transferId, userId)`
- Atomic creation using `TransactWriteCommand`

**For Refunds:**
- Refunds create ONE transaction: REFUND (destination account receiving refund)
- Links to original via: `originalTransactionId` UUID
- Query via: `TransactionRepository.findActiveByOriginalTransactionId(originalTransactionId, userId)` (NEW)
- Atomic operations using existing `TransactionRepository.create()`

---

## Research Topic 2: Data Loading Strategy

### Decision: Lazy Loading with Field Resolver

**Rationale:**
- Transaction list shouldn't include refund details by default (large payload for 100 transactions)
- Only expand refund details when original transaction card is expanded
- Matches existing pattern for embedded account/category data loading

### Findings

#### Current Loading Pattern (Account/Category)
```typescript
// In transactionResolvers.ts, field resolvers:
Transaction: {
  account: async (parent, _args, context) => {
    const account = await context.accountLoader.load(parent.accountId);
    return account; // Lightweight stub with id, name, isArchived
  },
  category: async (parent, _args, context) => {
    if (!parent.categoryId) return undefined;
    const category = await context.categoryLoader.load(parent.categoryId);
    return category;
  },
}
```

#### Pagination Strategy
- Relay cursor-based pagination using `createdAt` + `id` (stable navigation)
- Default page size: 10 transactions
- Max page size: 100 transactions
- Cursor encoded as Base64(JSON { createdAt, id })

#### Proposed Refund Loading Strategy
```typescript
// Transaction field resolver (NEW):
Transaction: {
  refunds: async (parent, _args, context) => {
    if (parent.type !== 'EXPENSE') return []; // Only for expenses
    const refunds = await context.transactionRepository.findActiveByOriginalTransactionId(
      parent.id,
      context.userId
    );
    return refunds;
  },
  refundSummary: async (parent, _args, context) => {
    if (parent.type !== 'EXPENSE') return null;
    const refunds = await context.transactionRepository.findActiveByOriginalTransactionId(
      parent.id,
      context.userId
    );
    return {
      totalRefunded: refunds.reduce((sum, r) => sum + r.amount, 0),
      remainingRefundable: parent.amount - refunds.reduce((sum, r) => sum + r.amount, 0),
      count: refunds.length,
    };
  },
}
```

**Performance:**
- Transaction list (100 items): O(1) query, no refund loading
- Single expanded transaction: 2 queries total (transaction + refunds for that transaction)
- No N+1 problem due to explicit field resolver pattern
- DataLoader could optimize if frontend queries multiple transactions' refunds simultaneously

---

## Research Topic 3: Refund Relationship Storage

### Decision: Embedded Link Field on Transaction

**Rationale:**
- Architectural consistency with existing transfer pattern
- No new table management or CDK changes
- Supports FR-019 requirement: "Refunds appear as separate items in transaction list"
- Reuses existing TransactionRepository infrastructure

### Findings

#### Three Options Analyzed

| Option | Storage | Pros | Cons | Complexity |
|--------|---------|------|------|-----------|
| **A** | Separate Refund Table | Clean separation of concerns, flexible schema | N+1 queries, more tables to manage, inconsistent pattern | High |
| **B** | Refund as Transaction (Recommended) | Consistent with transfers, single table, FR-019 support, minimal deployment | Semantic overload, conditional logic on type | Medium |
| **C** | Embedded Refund Array | Zero-query design, simple resolver | Normalization violation, breaks FR-019, can't search refunds independently | Low but problematic |

#### Architecture Details for Option B

**Database Schema Addition:**
```typescript
interface Transaction {
  // Existing fields...
  type: TransactionType; // Existing enum

  // NEW field:
  originalTransactionId?: string; // UUID linking to original expense
                                  // Only populated when type === 'REFUND'
}

enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  REFUND = "REFUND", // NEW
}
```

**Validation Rules (in RefundService):**
1. Original transaction must exist and type must be EXPENSE
2. Original transaction must belong to authenticated user
3. Destination account must exist and belong to user
4. Category (if provided) must be INCOME type
5. Amount must be positive
6. Cannot delete original transaction with active refunds

---

## Research Topic 4: GraphQL Type Evolution

### Decision: Extend Transaction Type with Refund Fields

**Rationale:**
- Minimal breaking changes
- Refund fields only meaningful for EXPENSE transactions
- Query structure follows existing patterns (account, category field resolvers)

### Findings

#### Schema Changes

**Existing Schema (Transaction type):**
```graphql
type Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  type: TransactionType!
  amount: Float!
  currency: String!
  date: String!
  description: String
  transferId: String
}
```

**New Schema (Extended Transaction type):**
```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
  REFUND  # NEW
}

type Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  type: TransactionType!
  amount: Float!
  currency: String!
  date: String!
  description: String
  transferId: String

  # NEW fields (only meaningful for EXPENSE transactions):
  refunds: [Transaction!]!     # Refund transactions linked to this expense
  refundSummary: RefundSummary # Calculated summary (total, remaining, count)

  # NEW field (only meaningful for REFUND transactions):
  originalTransactionId: String # Links refund back to original expense
}

type RefundSummary {
  totalRefunded: Float!
  remainingRefundable: Float!
  count: Int!
}

input CreateRefundInput {
  originalTransactionId: ID!
  accountId: ID!
  categoryId: ID
  amount: Float!
  date: String!
  description: String
}
```

**Breaking Changes:**
- None. All additions are new fields and enum values.

**Migration Impact:**
- Frontend must sync schema (automatic during `npm run dev` or `npm run build`)
- Frontend GraphQL operations can be updated incrementally
- Existing queries continue to work

---

## Research Topic 5: Implementation Architecture

### Decision: Service Layer with Repository Pattern

**Rationale:**
- Matches existing TransactionService and TransferService patterns
- Business logic isolated from resolvers
- Repository pattern maintains vendor independence

### Findings

#### New Components Needed

**1. RefundService** (mirrors TransferService pattern)
```typescript
// File: backend/src/services/refundService.ts

class RefundService {
  constructor(
    private transactionRepository: ITransactionRepository,
    private accountRepository: IAccountRepository,
    private categoryRepository: ICategoryRepository,
  ) {}

  async createRefund(
    userId: string,
    originalTransactionId: string,
    accountId: string,
    amount: number,
    categoryId?: string,
    description?: string,
    date?: string,
  ): Promise<Transaction> {
    // Validation:
    // 1. Original transaction exists and type is EXPENSE
    // 2. Original transaction belongs to user
    // 3. Destination account exists and belongs to user
    // 4. Category is INCOME type (if provided)

    // Create refund transaction with type REFUND
    const refund = await this.transactionRepository.create({
      userId,
      type: 'REFUND',
      accountId,
      amount,
      categoryId,
      description,
      date: date || new Date().toISOString().split('T')[0],
      originalTransactionId, // Links to original
      currency: originalTransaction.currency, // Refund in original currency
      isArchived: false,
    });

    return refund;
  }

  async deleteRefund(refundId: string, userId: string): Promise<void> {
    // Soft-delete (archive) the refund
    await this.transactionRepository.archive(refundId, userId);
  }
}
```

**2. GraphQL Resolvers** (refund mutations)
```typescript
// In backend/src/resolvers/transaction.ts

Mutation: {
  createRefund: async (
    parent,
    { input }: { input: CreateRefundInput },
    context: GraphQLContext,
  ): Promise<Transaction> => {
    // Validate input with Zod
    // Call RefundService.createRefund()
    // Return transaction with resolved fields
  },

  deleteRefund: async (
    parent,
    { refundId }: { refundId: string },
    context: GraphQLContext,
  ): Promise<boolean> => {
    // Call RefundService.deleteRefund()
    // Return success
  },
}
```

**3. Repository Enhancement**
```typescript
// In backend/src/repositories/transactionRepository.ts

interface ITransactionRepository {
  // Existing methods...
  findActiveByTransferId(transferId: string, userId: string): Promise<Transaction[]>;

  // NEW method (parallel to findActiveByTransferId):
  findActiveByOriginalTransactionId(
    originalTransactionId: string,
    userId: string,
  ): Promise<Transaction[]>;
}
```

#### Account Balance Calculation
```typescript
// In backend/src/services/accountService.ts

async getBalance(accountId: string, userId: string): Promise<number> {
  const account = await this.accountRepository.findById(accountId, userId);
  const transactions = await this.transactionRepository.findActiveByAccountId(
    accountId,
    userId,
  );

  const balance = transactions.reduce((sum, tx) => {
    switch (tx.type) {
      case 'INCOME':
      case 'TRANSFER_IN':
      case 'REFUND':  // NEW: refunds add to balance
        return sum + tx.amount;
      case 'EXPENSE':
      case 'TRANSFER_OUT':
        return sum - tx.amount;
      default:
        return sum;
    }
  }, account.initialBalance);

  return balance;
}
```

---

## Research Topic 6: Query Performance Analysis

### Decision: Lazy Loading via Field Resolver (Acceptable Performance)

**Rationale:**
- Transaction list queries don't load refund details (efficient)
- Single expanded transaction with refunds: 2 queries total (acceptable)
- Account balance calculation: single scan (no change from current)
- Refund creation: 2 validations + 1 insert (atomic, acceptable)

### Findings

#### Performance Characteristics

| Operation | Query Cost | Notes |
|-----------|-----------|-------|
| List transactions (100 items, collapsed) | O(n) = O(100) | Refunds not loaded; fast page load |
| Single expanded transaction + refunds | O(1) + O(1) = O(2) | 2 queries; field resolver pattern |
| Create refund | O(1) + O(1) = O(2) | Validate original + insert |
| Delete refund | O(1) | Soft-delete (archive) |
| Calculate account balance | O(n) | Single GSI scan; refunds included in sum |
| Load all refunds for transaction | O(1) | Single query by originalTransactionId |

#### Optimization Opportunities
1. **DataLoader batching** (if needed): Combine refund queries when loading multiple transactions
2. **GSI on originalTransactionId** (future): Add index if refund querying becomes bottleneck
3. **Refund count cache** (future): Pre-calculate count if displayed in list view

**Verdict:** Acceptable performance for MVP. Lazy loading pattern matches existing architecture.

---

## Research Topic 7: Cross-Currency Handling

### Decision: Refund Amount in Original Transaction Currency

**Rationale:**
- Specification requirement: "Store refund amount in original transaction's currency"
- Prevents currency conversion confusion
- Remaining amount calculated only in original currency
- Destination account currency is independent

### Findings

```typescript
interface Refund extends Transaction {
  // Required fields:
  originalTransactionId: string;   // Link to original
  type: 'REFUND';                  // Always REFUND

  // Inherited from original:
  currency: string;                // SAME as original transaction

  // User-selected:
  accountId: string;               // Can be any account (any currency)
  categoryId?: string;             // Must be INCOME type

  // Calculated:
  amount: number;                  // Refund amount in original's currency
}

// Example:
// Original: $100 USD expense
// Refund 1: $70 to USD account (straight deposit, easy)
// Refund 2: €40 to EUR account (amount in USD, not converted; unusual but permitted)
```

**Validation:**
- Amount must be positive number
- Amount stored in original transaction's currency (no conversion)
- Destination account can have different currency (no validation)
- Specification allows cross-currency refunds intentionally

---

## Research Topic 8: Soft-Deletion and Archival

### Decision: Reuse Existing `isArchived` Pattern

**Rationale:**
- Constitution requirement: All entities use soft-deletion
- Existing pattern: `isArchived` boolean field on transactions
- Refunds follow same archival as other transactions

### Findings

```typescript
interface Transaction {
  // All existing fields...
  isArchived: boolean; // Soft-delete flag for all types
}

// Refund deletion is just soft-delete:
await transactionRepository.archive(refundId, userId);

// Repository query scopes out archived records:
async findActiveByOriginalTransactionId(
  originalTransactionId: string,
  userId: string,
): Promise<Transaction[]> {
  // Query filters: userId = ? AND originalTransactionId = ? AND isArchived = false
}
```

**Implications:**
1. Deleted refunds remain in database (audit trail)
2. Deleted refunds don't appear in user-facing views
3. Deleting refund doesn't affect original transaction
4. Original transaction CAN be deleted only if all refunds are deleted (validation in service)

---

## Summary of Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Storage Strategy** | Option B: Refund as Transaction | Consistent with transfers, single table, supports FR-019 |
| **Data Loading** | Lazy via field resolver | Efficient pagination, matches existing patterns |
| **Relationship** | Embedded link field (`originalTransactionId`) | Simple, parallel to `transferId` |
| **GraphQL Type** | Extended Transaction type | Minimal breaking changes, leverages existing infrastructure |
| **Service Layer** | RefundService class | Mirrors TransferService pattern |
| **Repository** | New method `findActiveByOriginalTransactionId()` | Matches existing `findActiveByTransferId()` |
| **Currency** | Refund amount in original's currency | Specification requirement, prevents conversion |
| **Soft-Delete** | Reuse `isArchived` pattern | Constitutional requirement |

---

## Next Steps (Phase 1)

1. **Data Model Design** (`data-model.md`):
   - Detailed entity definitions with all fields
   - Relationship diagrams
   - State transitions and validation rules

2. **GraphQL Contracts** (`contracts/`):
   - Complete schema.graphql additions
   - Mutation signatures
   - Query patterns

3. **Quickstart Guide** (`quickstart.md`):
   - Setup steps
   - Testing refund creation
   - Expected output examples

4. **Agent Context Update**:
   - Register new entities and services
   - Document patterns for development team

---

## Research Completed
- ✅ DynamoDB schema investigation
- ✅ Current transaction loading patterns
- ✅ Transfer relationship implementation
- ✅ GraphQL type system review
- ✅ Three storage option analysis
- ✅ Performance estimation
- ✅ Cross-currency handling
- ✅ Architecture pattern alignment

**Ready for Phase 1: Design**
