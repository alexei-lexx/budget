# GraphQL Contracts: Archived Account and Category References

**Status**: Existing - No Changes Required
**Purpose**: Document the GraphQL types used for archived transaction references

## Existing Types (Verified in Phase 0 Research)

### TransactionEmbeddedAccount

```graphql
type TransactionEmbeddedAccount {
  id: ID!
  name: String!
  isArchived: Boolean!
}
```

**Usage in Transaction**:
```graphql
type Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  # ... other fields
}
```

**Field Details**:
- `id` (ID!): UUID of the account, immutable
- `name` (String!): Account name at time of transaction, never null
- `isArchived` (Boolean!): Current archived status of account, set by backend

**Design Notes**:
- Embedded type captures account state independently of main Account entity
- `isArchived` reflects backend state (soft-delete pattern)
- Frontend receives this data already prepared; no transformation needed

### TransactionEmbeddedCategory

```graphql
type TransactionEmbeddedCategory {
  id: ID!
  name: String!
  isArchived: Boolean!
}
```

**Usage in Transaction**:
```graphql
type Transaction {
  id: ID!
  category: TransactionEmbeddedCategory  # Optional
  # ... other fields
}
```

**Field Details**:
- `id` (ID!): UUID of the category, immutable
- `name` (String!): Category name at time of transaction, never null
- `isArchived` (Boolean!): Current archived status of category, set by backend

**Design Notes**:
- Optional field (nullable in schema)
- Embedded type independent of main Category entity
- `isArchived` reflects backend state (soft-delete pattern)

## Query Fragment (Existing - Verified in Phase 0)

### TRANSACTION_FRAGMENT

```graphql
fragment TransactionFields on Transaction {
  id
  account {
    id
    name
    isArchived  # ← Used for this feature
  }
  category {
    id
    name
    isArchived  # ← Used for this feature
  }
  type
  amount
  currency
  date
  description
  transferId
}
```

**Status**: ✅ Already includes `isArchived` field in both account and category selections

## No Schema Changes Needed

**Why**:
1. `TransactionEmbeddedAccount.isArchived` field exists
2. `TransactionEmbeddedCategory.isArchived` field exists
3. Transaction queries already select these fields
4. Apollo Client already caches this data
5. Frontend can use the data immediately

**Confirmation**:
- Verified in `backend/src/schema.graphql` ✓
- Verified in `frontend/src/graphql/fragments.ts` ✓
- No backend resolver changes required ✓
- No data migration needed ✓
