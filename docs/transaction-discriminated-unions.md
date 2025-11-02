# Transaction Type: Discriminated Unions Design Decision

## Summary

Decision made to refactor Transaction type from **enum discriminator to discriminated unions** in the GraphQL schema.

## Context

The Transaction type currently uses a simple enum (`type: INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT`) as the only discriminator. However, transaction types have diverging fields:

- **TransferOut/TransferIn transactions**: Have `transferId` field (links paired transactions)
- **Expense transactions**: Will have refund-related fields in the future (refundId, refundStatus, refundAmount, etc.)
- **Income transactions**: No type-specific fields currently

## Why Discriminated Unions

### Problems with Enum Approach

```typescript
// Enum allows invalid combinations:
const tx: Transaction = {
  type: 'INCOME',
  transferId: '...',      // ❌ shouldn't exist on INCOME
  refundStatus: 'PENDING' // ❌ shouldn't exist on INCOME
}

// Requires defensive checks in code:
if (tx.type === 'TRANSFER_IN' && tx.transferId) { ... }
```

### Benefits of Discriminated Unions

```typescript
// Union types prevent invalid combinations at compile time:
type TransactionResult =
  | IncomeTransaction
  | ExpenseTransaction
  | TransferOutTransaction
  | TransferInTransaction

// TypeScript knows the exact shape:
if (tx.__typename === 'TransferInTransaction') {
  console.log(tx.transferId) // ✅ guaranteed to exist
}
```

**Advantages:**
- ✅ Type-safe: Can't misuse type-specific fields
- ✅ Self-documenting: Schema shows what each type actually contains
- ✅ Prevents bugs: Compile-time validation instead of runtime checks
- ✅ Better maintainability: Each type is explicitly defined with its fields
- ✅ Future-proof: Can easily add unique fields to any type (e.g., refund fields to Expense)

**Tradeoff:**
- More GraphQL boilerplate (interface + multiple types)
- Queries require fragments: `... on TransferOutTransaction { transferId }`
- Slightly more generated TypeScript code

The complexity is justified because the union accurately represents the actual data shape.

## Implementation Pattern

### GraphQL Schema Structure

```graphql
# Shared fields as interface
interface TransactionBase {
  id: ID!
  accountId: ID!
  amount: Float!
  date: String!
  description: String
  categoryId: ID
  createdAt: String!
  updatedAt: String!
}

# Type-specific implementations
type IncomeTransaction implements TransactionBase {
  id: ID!
  accountId: ID!
  amount: Float!
  date: String!
  description: String
  categoryId: ID
  createdAt: String!
  updatedAt: String!
}

type ExpenseTransaction implements TransactionBase {
  id: ID!
  accountId: ID!
  amount: Float!
  date: String!
  description: String
  categoryId: ID
  createdAt: String!
  updatedAt: String!
  # Future refund fields can be added here
}

type TransferOutTransaction implements TransactionBase {
  id: ID!
  accountId: ID!
  amount: Float!
  date: String!
  description: String
  categoryId: ID
  createdAt: String!
  updatedAt: String!
  transferId: ID!  # Transfer-specific field
}

type TransferInTransaction implements TransactionBase {
  id: ID!
  accountId: ID!
  amount: Float!
  date: String!
  description: String
  categoryId: ID
  createdAt: String!
  updatedAt: String!
  transferId: ID!  # Transfer-specific field
}

union TransactionResult =
  IncomeTransaction
  | ExpenseTransaction
  | TransferOutTransaction
  | TransferInTransaction
```

### Query Pattern

```graphql
query GetTransactions {
  transactions {
    ... on IncomeTransaction {
      id
      amount
      categoryId
    }
    ... on ExpenseTransaction {
      id
      amount
      categoryId
    }
    ... on TransferOutTransaction {
      id
      amount
      transferId
    }
    ... on TransferInTransaction {
      id
      amount
      transferId
    }
  }
}
```

## Future Considerations

### Refund Features

When refund functionality is implemented, ExpenseTransaction can easily add fields:

```graphql
type ExpenseTransaction implements TransactionBase {
  # ... existing fields ...
  refundId: ID
  refundStatus: RefundStatus
  refundAmount: Float
  refundReason: String
}
```

No other types are affected. The union pattern scales cleanly.

### Resolver Implementation

Resolvers will need to return the proper type-specific shape:

```typescript
// Example: transactionService.getTransaction() should return union type
return {
  __typename: 'TransferOutTransaction',
  id,
  accountId,
  amount,
  date,
  description,
  categoryId,
  createdAt,
  updatedAt,
  transferId  // Transfer-specific
}
```

## Related Files

- `backend/src/schema.graphql` - GraphQL schema (source of truth)
- `frontend/src/schema.graphql` - Auto-synced from backend schema
- `frontend/src/__generated__/` - Generated TypeScript types from schema

## Next Steps

1. Refactor `backend/src/schema.graphql` to use discriminated unions
2. Update resolvers to return proper `__typename` values
3. Update frontend queries to use fragments where needed
4. Verify generated TypeScript types are correct
5. Run type checks to catch any incompatibilities
