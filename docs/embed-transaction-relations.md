# Transaction Embedded Account and Category

**Status**: Feature Design Complete
**Scope**: GraphQL Schema Extension + Frontend Query Updates

---

## Problem Statement

Frontend currently loads transactions, accounts, and categories as three separate requests, then performs client-side lookups to match each transaction to its account and category.

**Issues:**
- Requires loading complete account and category datasets upfront
- O(n) client-side lookups per transaction
- Multiple unnecessary data transfers
- Inefficient use of GraphQL

---

## Solution

Extend Transaction GraphQL type to embed account and category data directly.

**Changes:**
- Add `account` field to Transaction (non-nullable, with id, name, isArchived)
- Add `category` field to Transaction (nullable, with id, name, isArchived)
- Create `TransactionEmbeddedAccount` and `TransactionEmbeddedCategory` types
- Remove `accountId` and `categoryId` fields from Transaction (breaking change)
- Update frontend queries and components to use new embedded fields

---

## How It Works

### Backend Architecture

When frontend requests `transaction.account` or `transaction.category`:

1. **GraphQL resolvers** fetch current account/category data from database
2. **Batch loading** (DataLoader) combines multiple requests into single DB operation
3. **Returns current state** - always reflects live database state (including archive status)

**Why this approach:**
- No database schema changes needed
- No transaction record modifications
- Accounts/categories use soft-delete (isArchived flag), so always fetch fresh state
- Batch loading prevents N+1 queries (1 txn + 1 batch account + 1 batch category query, vs 1 + n)
- Lazy loading: fields only resolved if requested in GraphQL query

### Frontend Changes

1. **Update GraphQL queries** to request `account { id name isArchived }` and `category { id name isArchived }`
2. **Remove separate account/category queries** - consolidate into single transactions query
3. **Remove client-side lookup maps** - eliminate memory-based lookup logic
4. **Update components** to use `transaction.account.name` directly instead of looking up by ID
5. **Regenerate GraphQL types** via `npm run codegen`

---

## Design Decisions

**Why GraphQL-level only?**
- Zero database schema changes
- Zero data migration required
- Existing transactions immediately support new fields
- Frontend will be updated as part of this feature

**Why separate types (TransactionEmbeddedAccount/Category)?**
- Simplified views with minimal fields (id, name, isArchived)
- Clear API contract: these are transaction context, not full account/category objects
- Prevents accidental exposure of sensitive data

**Why always fetch fresh state?**
- Accounts/categories use soft-delete (isArchived flag)
- Must reflect real-time changes (e.g., account archived after transaction created)
- No stale snapshot data

**Why batch loading?**
- Prevents N+1 query problem
- 100 transactions from 10 accounts: 1 + 10 queries (batch) vs 1 + 100 (naive)
