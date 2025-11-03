# Transaction Type Refactoring: From Enum to Interface-Based Types

Read `backend/src/schema.graphql` for the latest schema definition.

## Overview

This document proposes refactoring the GraphQL schema to improve type safety and clarity for transaction types using GraphQL interfaces instead of a simple enum-based approach. This change will eliminate optional fields that only apply to specific transaction types and improve code generation with stricter type checking.

## Current State

### Schema Structure
The current schema uses a single `Transaction` type with a `TransactionType` enum:

```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
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
  transferId: String  # Only relevant for TRANSFER_IN and TRANSFER_OUT
}
```

### Current Problems

1. **Type Safety:** The `type` enum field only tells you what kind of transaction this is. You must manually check this enum value to know which fields are valid.

2. **Optional Field Ambiguity:** The `transferId` field is optional for all transactions, but it's only meaningful (and should always be present) for transfer transactions. This creates ambiguity:
   - Is `transferId` null because it's a non-transfer transaction, or because the data is incomplete?
   - GraphQL clients don't know which fields are guaranteed to exist for a specific transaction type.

3. **Future Scalability Issues:** When we add refund-related fields to expense transactions, we'll have more type-specific fields scattered across the schema with unclear applicability.

4. **Code Generation Limitations:** Generated TypeScript types treat all Transaction fields as having the same optionality regardless of transaction type. This reduces type safety in backend resolvers and frontend components.

5. **Schema Clarity:** Readers of the schema can't immediately see what fields are valid for each transaction type without tracing through resolver implementations.

## Proposed Solution

### Interface-Based Types

Use GraphQL interfaces to define common transaction fields while creating concrete types for each transaction category. Each type explicitly declares which fields it includes.

```graphql
interface Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  amount: Float!
  currency: String!
  date: String!
  description: String
}

type IncomeTransaction implements Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  amount: Float!
  currency: String!
  date: String!
  description: String
}

type ExpenseTransaction implements Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  amount: Float!
  currency: String!
  date: String!
  description: String
  # Future addition: refund-related fields will go here
}

type TransferOutTransaction implements Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  amount: Float!
  currency: String!
  date: String!
  description: String
  transferId: String!  # Now guaranteed to exist
}

type TransferInTransaction implements Transaction {
  id: ID!
  account: TransactionEmbeddedAccount!
  category: TransactionEmbeddedCategory
  amount: Float!
  currency: String!
  date: String!
  description: String
  transferId: String!  # Now guaranteed to exist
}
```

### Why Not Union Types?

GraphQL also offers union types as an alternative to interfaces. We're choosing interfaces because:

- **Shared Fields:** ~95% of transaction fields are identical across all types
- **Common Interface:** All transactions share the same core fields and structure
- **Future Extensibility:** Interfaces make it natural to add transaction-type-specific fields (e.g., refund status for expenses)
- **Better Code Generation:** Interfaces generate simpler, more usable TypeScript types

Union types would force clients to repeat common fields in each type definition, creating maintenance burden and redundancy. Interfaces handle this elegantly with a shared base.

## Benefits

### 1. Type Safety in Code Generation

**Backend Resolvers:**
```typescript
// Current: Must check type enum before accessing transferId
if (transaction.type === 'TRANSFER_OUT') {
  const transferId = transaction.transferId; // Could still be null
}

// Proposed: Type system knows which fields exist
if (transaction.__typename === 'TransferOutTransaction') {
  const transferId = transaction.transferId; // Guaranteed non-null
}
```

**Frontend Components:**
```typescript
// Current: No type safety guidance
<template>
  <div>{{ transaction.transferId }}</div>  <!-- Might be null -->
</template>

// Proposed: Type guards with type-specific types
<template v-if="isTransferTransaction(transaction)">
  <div>{{ transaction.transferId }}</div>  <!-- Type-safe, guaranteed to exist -->
</template>
```

### 2. Schema Self-Documentation

The schema now clearly declares:
- Which fields apply to which transaction types
- Which fields are always present vs. optional
- Where new type-specific fields should be added in the future

### 3. Improved Resolver Implementation

Resolvers can leverage type discrimination without manual `type` field checking:
- Apollo Server and other GraphQL implementations automatically handle `__typename` resolution
- Backend code can be organized by transaction type with dedicated type handlers
- Validation logic can be type-specific

### 4. Enhanced Frontend Type Safety

Generated types from the schema become much more useful:
- TypeScript knows exactly which fields exist for each transaction type
- IDE autocomplete becomes more helpful
- Type guards eliminate runtime errors from accessing non-existent fields

### 5. Future Extensibility

When expense transactions need refund-related fields:
```graphql
type ExpenseTransaction implements Transaction {
  # ... common fields ...
  refundStatus: RefundStatus
  refundAmount: Float
  refundDate: String
}
```

This addition is immediately clear and doesn't pollute other transaction types.

## Implementation Considerations

### Schema Changes

1. Replace `Transaction` type with `Transaction` interface
2. Create four concrete types: `IncomeTransaction`, `ExpenseTransaction`, `TransferOutTransaction`, `TransferInTransaction`
3. Keep the `TransactionType` enum for input types (clients specify which type they're creating/updating)
4. Update mutation return types to interface: `createTransaction()`, `updateTransaction()`, `deleteTransaction()` all return `Transaction!` (interface, not concrete type)
5. Update query return types: `transactions()` returns `[Transaction!]` (interface, not concrete type)

**Important:** Do NOT split mutations by type. Keep single `createTransaction`, `updateTransaction`, `deleteTransaction` mutations. Type discrimination happens on output via `__typename`, not on input via separate mutations.

### Backend Changes

1. **GraphQL Codegen:** Regenerate types from new schema
   - Generated types will include union of all four transaction types
   - Backend resolvers receive typed transaction objects

2. **Repository Layer:** No changes required to database queries
   - Database model remains unchanged
   - Mapping from stored data to GraphQL types happens at the resolver level

3. **Resolver Implementation:** Add `__typename` field resolution
   ```typescript
   Transaction: {
     __typename(transaction) {
       switch(transaction.type) {
         case 'INCOME': return 'IncomeTransaction';
         case 'EXPENSE': return 'ExpenseTransaction';
         case 'TRANSFER_OUT': return 'TransferOutTransaction';
         case 'TRANSFER_IN': return 'TransferInTransaction';
       }
     }
   }
   ```

### Frontend Changes

1. **GraphQL Codegen:** Regenerate types and composables
   - Generated composables will return transaction unions
   - Type guards needed to narrow types in components

2. **Type Guards:** Implement helpers for checking transaction types
   ```typescript
   const isTransferTransaction = (tx: Transaction): tx is TransferOutTransaction | TransferInTransaction =>
     tx.__typename === 'TransferOutTransaction' || tx.__typename === 'TransferInTransaction';
   ```

3. **Component Updates:** Update conditional rendering to use type guards
   - Only minimal updates needed where `transferId` is accessed
   - Most components won't need changes (they access common fields)

### Migration Path

This is a breaking change for GraphQL clients. Migration approach:

1. **Phase 1:** Deploy schema and backend changes
   - New schema published to GraphQL endpoint
   - Backend handles both type discrimination
   - Queries return new interface-based types

2. **Phase 2:** Frontend updates
   - Regenerate types from new schema
   - Update components to handle transaction type unions
   - Merge and deploy

3. **Phase 3:** Cleanup
   - Remove old `TransactionType` enum references from documentation
   - Update integration tests

## Database Impact

**Zero database schema changes required.** The database model for transactions remains unchanged. Only the GraphQL schema and resolvers are affected:

- Database still stores a `type` field with values: `INCOME`, `EXPENSE`, `TRANSFER_IN`, `TRANSFER_OUT`
- Mapping from database type values to GraphQL type discrimination happens at the resolver layer
- All existing queries and data remain valid

## Backward Compatibility

This is a **breaking change** for GraphQL API clients, but relatively minimal:
- Query responses change from concrete `Transaction` type to `Transaction` interface
- Clients must handle `__typename` field to discriminate between transaction types (instead of checking `type` enum)
- Mutations remain compatible - still use `TransactionType` enum for input
- Type-safe clients will need to handle transaction type unions in code

Recommend communicating this change in release notes and providing migration examples for clients.

## Future Enhancements

### Phase 1 (Current Proposal)
- Basic interface implementation with four transaction types
- `__typename` discrimination
- Type-safe field access

### Phase 2 (Future)
- Add refund-related fields to `ExpenseTransaction`:
  - `refundStatus: RefundStatus` (PENDING, COMPLETED, REJECTED)
  - `refundAmount: Float`
  - `refundDate: String`

- This addition is trivial once the interface structure is in place

### Phase 3 (Future)
- Add recurring transaction fields if needed
- Add transaction tags/labels
- Add custom metadata fields

All additions would naturally extend the interface-based structure without affecting other transaction types.

## Conclusion

Moving to interface-based types improves:
- **Type Safety:** Generated code is more precise about field availability
- **Schema Clarity:** Readers immediately understand type-specific fields
- **Maintainability:** Future extensions are additive, not disruptive
- **Developer Experience:** IDE autocomplete and type checking become more helpful

The refactoring aligns with GraphQL best practices for polymorphic types and sets a strong foundation for future transaction type enhancements.
