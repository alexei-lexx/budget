# Data Model: Embed Account and Category Into Transaction GraphQL

**Date**: 2025-10-28 | **Phase**: 1 Design

---

## Overview

This design extends the GraphQL Transaction type to embed related account and category data directly. No database schema changes are required—all modifications occur at the GraphQL API layer. The existing DynamoDB transaction records remain unchanged; embedding is achieved through field-level resolvers.

---

## Entity Definitions

### Transaction (Extended)

**GraphQL Type**: `Transaction`

**Fields** (existing):
| Field | Type | Description | Notes |
|-------|------|-------------|-------|
| `id` | ID! | Unique transaction identifier | UUID |
| `type` | TransactionType! | INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT | Enum |
| `amount` | Float! | Transaction amount in account currency | Positive |
| `currency` | String! | Currency code (USD, EUR, etc.) | 3-letter code |
| `date` | String! | Transaction date | ISO 8601 YYYY-MM-DD |
| `description` | String | Optional user-provided description | Max 500 chars |
| `transferId` | String | Links paired TRANSFER_OUT/TRANSFER_IN | For transfers only |

**Fields (deprecated - breaking change)**:
| Field | Replaced By | Reason |
|-------|-------------|--------|
| `accountId` | `account.id` | Clients should use embedded account object |
| `categoryId` | `category.id` | Clients should use embedded category object |

**Fields (new - embedded relations)**:
| Field | Type | Description | Validation |
|-------|------|-------------|-----------|
| `account` | TransactionEmbeddedAccount! | Non-nullable embedded account | Required; never null |
| `category` | TransactionEmbeddedCategory | Nullable embedded category | Optional transaction property |

**Constraints & Validation**:
- `amount` > 0
- `type` must be valid TransactionType enum
- `currency` must be 3-letter ISO code
- `date` must be valid ISO 8601 date
- `account` cannot be null (enforced in resolver)
- `category` can be null (for uncategorized transactions)

**State Transitions**:
- Created → (no changes during lifecycle)
- If source account archived → `account.isArchived` = true (reflected immediately)
- If category deleted → `category` becomes null (reflected immediately)

---

### TransactionEmbeddedAccount (New Type)

**GraphQL Type**: `TransactionEmbeddedAccount`

**Purpose**: Lightweight account representation embedded in Transaction responses

**Fields**:
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `id` | ID! | Account unique identifier | UUID from Accounts table |
| `name` | String! | Account display name | From Accounts.name |
| `isArchived` | Boolean! | Archive status at query time | From Accounts.isArchived (current state) |

**Data Freshness**:
- Fields always reflect current database state
- Not cached beyond single GraphQL request
- Updates to Account entity immediately visible in next query

**Null Handling**:
- If account ID valid but entity missing (data integrity issue):
  - DO NOT return stub object
  - DO return null in GraphQL response
  - Log warning for monitoring

**Related Entity**: Account (from Accounts table)

---

### TransactionEmbeddedCategory (New Type)

**GraphQL Type**: `TransactionEmbeddedCategory`

**Purpose**: Lightweight category representation embedded in Transaction responses

**Fields**:
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `id` | ID! | Category unique identifier | UUID from Categories table |
| `name` | String! | Category display name | From Categories.name |
| `isArchived` | Boolean! | Archive status at query time | From Categories.isArchived (current state) |

**Data Freshness**:
- Fields always reflect current database state
- Not cached beyond single GraphQL request
- Updates to Category entity immediately visible in next query

**Null Handling**:
- Field is nullable (Category is optional for transactions)
- Returns `null` if transaction has no categoryId
- Returns `null` if categoryId exists but category entity missing (data integrity issue)
- Log warning if entity missing but ID exists

**Related Entity**: Category (from Categories table)

---

## Relationships

### Transaction → Account (Non-Nullable)

```
Transaction.accountId (FK) → Account.id (PK)
|
└─> resolved via DataLoader batch query → TransactionEmbeddedAccount
    - accountLoader.load(transaction.accountId)
    - Returns Account fields: id, name, isArchived
    - Returns null if account missing (with warning log)
```

**Cardinality**: Many-to-One (Many transactions → One account)

**Mutability**: Read-only (cannot change transaction's account via embedded field)

**Performance**: Batched with DataLoader (multiple transactions load all unique accounts in single query)

---

### Transaction → Category (Nullable)

```
Transaction.categoryId (FK, Optional) → Category.id (PK)
|
└─> resolved via DataLoader batch query → TransactionEmbeddedCategory
    - categoryLoader.load(transaction.categoryId) if categoryId is not null
    - Returns Category fields: id, name, isArchived
    - Returns null if categoryId is null
    - Returns null if categoryId exists but category missing (data integrity issue)
```

**Cardinality**: Many-to-One (Many transactions → Zero or One category)

**Mutability**: Read-only (cannot change transaction's category via embedded field)

**Nullability**: Transaction.category is nullable; null when categoryId is null or entity missing

**Performance**: Batched with DataLoader (filters null categoryIds, batches non-null IDs)

---

## Database Schema (No Changes)

**Existing Transactions Table** (DynamoDB):

```
PK: id (String, UUID)
SK: none (single-table design uses GSI for sorting)

Attributes:
- id (UUID)
- userId (String, from Auth0 normalized to internal UUID)
- accountId (String, UUID FK)
- categoryId (String, UUID, optional FK)
- type (String: INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT)
- amount (Number, positive)
- currency (String, 3-letter code)
- date (String, ISO 8601)
- description (String, optional)
- transferId (String, optional, links paired transfers)
- createdAt (String, ISO timestamp)
- updatedAt (String, ISO timestamp)

GSI:
- GSI1PK: userId
- GSI1SK: date (ScanIndexForward: false for reverse chronological order)
```

**No Changes**: Database records unchanged; all modifications at GraphQL layer

---

## Resolver Implementation Strategy

### Account Field Resolver

```typescript
// Transaction.account field resolver
async account(
  parent: Transaction,           // DynamoDB transaction record
  args: unknown,
  context: GraphQLContext
): Promise<TransactionEmbeddedAccount | null> {
  if (!parent.accountId) {
    return null;  // Should not happen in practice (accountId required)
  }

  // Use DataLoader to batch-load accounts
  // Automatically prevents N+1 queries across multiple transactions
  const account = await context.loaders.accountLoader.load(parent.accountId);
  return account ? {
    id: account.id,
    name: account.name,
    isArchived: account.isArchived
  } : null;
}
```

**Batching**: Multiple transactions in single query batch all unique accountIds into single database query

**Cache**: Per-request cache; automatically cleared at end of GraphQL request

**Error Handling**: Missing account returns null with warning log

---

### Category Field Resolver

```typescript
// Transaction.category field resolver
async category(
  parent: Transaction,           // DynamoDB transaction record
  args: unknown,
  context: GraphQLContext
): Promise<TransactionEmbeddedCategory | null> {
  if (!parent.categoryId) {
    return null;  // Transaction is uncategorized
  }

  // Use DataLoader for batch loading
  const category = await context.loaders.categoryLoader.load(parent.categoryId);
  return category ? {
    id: category.id,
    name: category.name,
    isArchived: category.isArchived
  } : null;
}
```

**Nullability Handling**:
- Returns null if categoryId is null (standard case)
- Returns null if categoryId exists but entity missing (data integrity issue)

**Batching**: DataLoader handles filtering null IDs; only batches non-null IDs

---

## Data Validation Rules

### At GraphQL Input Layer
(Query variables validation - Zod schemas)

- Field selection validation: Can request `account { id name isArchived }`
- Fragment validation: TRANSACTION_FRAGMENT defines available nested fields
- No validation needed: Embedded fields are read-only (no mutations on these fields)

### At Service Layer
(Business logic)

- Cannot create transaction without account (accountId required)
- Can create transaction without category (categoryId optional)
- Cannot update transaction.account directly (read-only field)
- Cannot update transaction.category directly (read-only field)
- To change account: Create new transaction or update via separate Mutation

### At Repository Layer
(Database operations)

- Account lookup: If accountId references missing entity, return null (no error)
- Category lookup: If categoryId references missing entity, return null (no error)
- Log warnings for missing entities to track data integrity issues

---

## Edge Cases & Handling

### Edge Case 1: Archived Account
**Scenario**: Transaction references account that exists but is marked isArchived=true

**Behavior**:
- `account.isArchived` = true (reflects current archive state)
- API returns normally (no error)
- Frontend can gray out archived account reference

**Data Flow**:
```
Transaction.accountId: acc-123
Account acc-123: { isArchived: true, ... }
GraphQL Response: { account: { id: "acc-123", isArchived: true, name: "Old Savings" } }
```

---

### Edge Case 2: Null Category
**Scenario**: Transaction has no category assignment (categoryId = null)

**Behavior**:
- `category` field returns null
- No error in GraphQL response
- API succeeds normally

**Data Flow**:
```
Transaction.categoryId: null
GraphQL Response: { category: null }
```

---

### Edge Case 3: Missing Referenced Account (Data Integrity Issue)
**Scenario**: Transaction references account ID that no longer exists in Accounts table

**Behavior**:
- Batch loader queries account, gets null result
- Returns null for that account in batch results
- GraphQL field resolves to null
- Warning logged for monitoring: "Transaction references missing account (accountId: xxx)"

**Data Flow**:
```
Transaction.accountId: acc-deleted (doesn't exist in DB)
Batch Load Result: null
GraphQL Response: { account: null }
Log: { level: "warn", message: "Transaction references missing account", accountId: "acc-deleted" }
```

**Frontend Handling**:
```typescript
const accountName = transaction.account?.name ?? `Account ${transaction.accountId} (not found)`;
```

---

### Edge Case 4: Missing Referenced Category (Data Integrity Issue)
**Scenario**: Transaction references category ID that no longer exists

**Behavior**:
- Same as Edge Case 3, but for categories
- Category loader returns null
- GraphQL category field resolves to null
- Warning logged: "Transaction references missing category (categoryId: xxx)"

**Data Flow**:
```
Transaction.categoryId: cat-deleted (doesn't exist in DB)
Batch Load Result: null
GraphQL Response: { category: null }
Log: { level: "warn", message: "Transaction references missing category", categoryId: "cat-deleted" }
```

---

### Edge Case 5: Pagination with Batch Loading
**Scenario**: Loading 50 transactions paginated, each request loads 20 transactions

**Behavior**:
- Batch loader applies **within current page only**
- Page 1: 20 transactions → batch load 5 unique accounts, 8 unique categories
- Page 2: Different 20 transactions → separate batch load (new DataLoader instance per request)
- No cross-page batching (DataLoader is request-scoped)

**Rationale**: Prevents unbounded memory growth; each request has isolated DataLoader

---

## GraphQL Type Definitions

### New Types

```graphql
type TransactionEmbeddedAccount {
  id: ID!
  name: String!
  isArchived: Boolean!
}

type TransactionEmbeddedCategory {
  id: ID!
  name: String!
  isArchived: Boolean!
}
```

### Extended Transaction Type

```graphql
type Transaction {
  id: ID!
  accountId: ID!              # DEPRECATED - use account.id
  account: TransactionEmbeddedAccount!  # NEW
  categoryId: ID              # DEPRECATED - use category.id
  category: TransactionEmbeddedCategory # NEW
  type: TransactionType!
  amount: Float!
  currency: String!
  date: String!
  description: String
  transferId: String
  createdAt: String!
  updatedAt: String!
}
```

---

## Migration Compatibility

### Breaking Changes
- `accountId` field removed from GraphQL schema
- `categoryId` field removed from GraphQL schema
- Clients expecting these ID fields will receive GraphQL errors

### Backward Compatibility
- **Database**: No changes; accountId and categoryId remain in DynamoDB records
- **Temporary Approach** (if needed): Keep accountId and categoryId in schema for transition period, mark deprecated
- **Standard Approach**: Single coordinated deployment; update backend + frontend simultaneously

---

## Summary

| Aspect | Detail |
|--------|--------|
| **New Types** | TransactionEmbeddedAccount, TransactionEmbeddedCategory |
| **Modified Types** | Transaction (adds `account`, `category`; removes `accountId`, `categoryId`) |
| **Database Changes** | None (all at GraphQL layer) |
| **Performance Pattern** | DataLoader batching (97% query reduction) |
| **Cache Strategy** | Per-request, auto-cleared |
| **Missing Entity Handling** | Return null, log warning |
| **Breaking Changes** | Yes (accountId/categoryId removed) |
| **Deployment Strategy** | Coordinated single cutover (backend + frontend) |
