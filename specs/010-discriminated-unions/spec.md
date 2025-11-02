# Feature Specification: Discriminated Unions for Transaction Types

**Feature Branch**: `010-discriminated-unions`
**Created**: 2025-11-02
**Status**: Draft
**Related Document**: [Design Decision](../../docs/transaction-discriminated-unions.md)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend Developer Needs Type-Safe Transaction Schema (Priority: P1)

As a backend developer, I need the GraphQL schema to define separate transaction types with their specific fields so that I can implement resolvers that return correctly-shaped data and prevent invalid field combinations at the schema level.

**Why this priority**: This is the foundational change required for the entire feature. Without the schema refactoring, no other benefits are possible.

**Independent Test**: Can be tested by reviewing the GraphQL schema for proper interface implementation, discriminated union definition, and verifying that each transaction type implements the correct fields.

**Acceptance Scenarios**:

1. **Given** the GraphQL schema with discriminated unions, **When** a resolver returns a TransferOutTransaction, **Then** TypeScript compilation requires the `transferId` field and the return object must include `__typename: 'TransferOutTransaction'`
2. **Given** the GraphQL schema, **When** a query selects transaction data, **Then** it must use fragments (`... on TransferOutTransaction`) to access type-specific fields
3. **Given** ExpenseTransaction type defined in schema, **When** future refund functionality is added, **Then** refund fields can be added without modifying other transaction types or the union definition

---

### User Story 2 - Frontend Developer Needs Type-Safe Transaction Queries (Priority: P1)

As a frontend developer, I need generated TypeScript types that enforce transaction type structure so that the compiler prevents me from accessing fields that don't exist on a given transaction type, eliminating runtime errors.

**Why this priority**: Type safety at the frontend prevents bugs before runtime and improves developer experience with better IDE autocomplete.

**Independent Test**: Can be tested by running TypeScript type-checking on frontend code that queries transactions and verifying that accessing non-existent fields produces compilation errors.

**Acceptance Scenarios**:

1. **Given** a transaction with `__typename: 'TransferOutTransaction'`, **When** TypeScript code accesses `tx.transferId`, **Then** it compiles successfully
2. **Given** a transaction with `__typename: 'IncomeTransaction'`, **When** TypeScript code accesses `tx.transferId`, **Then** it produces a compilation error
3. **Given** generated types from the new schema, **When** a query uses fragments for each transaction type, **Then** TypeScript knows the exact shape within each fragment

---

### User Story 3 - Maintainer Needs Extensible Transaction System (Priority: P2)

As a system maintainer, I need the transaction type system to be extensible so that adding future fields to specific transaction types doesn't require modifying all other types or the union definition.

**Why this priority**: This reduces technical debt and makes the codebase easier to evolve. It's important but not blocking initial implementation.

**Independent Test**: Can be tested by adding a new field to ExpenseTransaction (e.g., refundStatus) and verifying no changes are required to other transaction types or the union.

**Acceptance Scenarios**:

1. **Given** the discriminated union schema, **When** a new field is added to ExpenseTransaction only, **Then** IncomeTransaction, TransferOutTransaction, and TransferInTransaction remain unchanged
2. **Given** the updated schema with refund fields, **When** a new transaction type is needed in the future, **Then** it can be added to the union without modifying existing types

---

### Edge Cases

- **Old Enum Type References**: How should legacy code or external integrations using the old enum-based `type` field be handled?
- **Null/Undefined Type-Specific Fields**: What happens if a resolver returns a TransferOutTransaction without the required `transferId` field?
- **Union Type Ordering**: Does the order of types in the union definition affect query execution or performance?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: GraphQL schema MUST define a `TransactionBase` interface containing all common transaction fields (id, accountId, amount, date, description, categoryId, createdAt, updatedAt)
- **FR-002**: GraphQL schema MUST define four concrete transaction types: `IncomeTransaction`, `ExpenseTransaction`, `TransferOutTransaction`, `TransferInTransaction`, each implementing `TransactionBase`
- **FR-003**: `TransferOutTransaction` and `TransferInTransaction` MUST include a required `transferId` field linking paired transactions
- **FR-004**: All four transaction types MUST be part of a `TransactionResult` union definition for GraphQL query results
- **FR-005**: Frontend queries selecting transactions MUST use inline fragments (`... on TransferOutTransaction { transferId }`) to access type-specific fields
- **FR-006**: Backend resolvers MUST return the correct `__typename` discriminator for each transaction type to enable proper deserialization
- **FR-007**: Generated TypeScript types from the schema MUST enforce type-specific field access at compile time
- **FR-008**: ExpenseTransaction type MUST be structured to allow future addition of refund-related fields (refundId, refundStatus, refundAmount, refundReason) without schema changes to other types
- **FR-009**: System MUST maintain backward compatibility for existing transaction queries during the migration period
- **FR-010**: All existing transaction queries must be updated to use fragments where querying type-specific fields

### Key Entities *(include if feature involves data)*

- **TransactionBase Interface**: Defines the shared contract for all transaction types with common fields: id, accountId, amount, date, description, categoryId, createdAt, updatedAt
- **IncomeTransaction Type**: Represents income transactions implementing TransactionBase without type-specific additional fields
- **ExpenseTransaction Type**: Represents expense transactions implementing TransactionBase, designed to support future refund fields
- **TransferOutTransaction Type**: Represents outgoing transfer transactions with required `transferId` field linking to paired TransferInTransaction
- **TransferInTransaction Type**: Represents incoming transfer transactions with required `transferId` field linking to paired TransferOutTransaction
- **TransactionResult Union**: GraphQL union combining all four transaction types for return types in queries

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: GraphQL schema successfully defines discriminated union with four transaction types and all queries execute without errors
- **SC-002**: TypeScript type-checking catches 100% of attempts to access type-specific fields on incorrect transaction types (e.g., accessing `transferId` on IncomeTransaction produces compilation error)
- **SC-003**: All transaction-related resolver implementations correctly return `__typename` discriminators for each transaction type
- **SC-004**: Zero runtime errors related to accessing undefined transaction fields across all transaction queries and mutations
- **SC-005**: Frontend codebase compiles successfully with no type errors after migration to new schema types
- **SC-006**: All existing transaction queries continue to work without modification during backward compatibility period
- **SC-007**: Documentation for new schema pattern is complete and accessible to both backend and frontend developers

## Assumptions

- All transaction types will continue to share the same common fields defined in the TransactionBase interface
- The backend already implements the TransferService with atomic two-transaction transfers using transferId
- Frontend has Apollo Client configured with proper schema syncing and code generation
- Backward compatibility is required only during a transition period, after which old enum-based code can be removed
- The primary benefit is internal type safety for developers, not user-facing functionality

## Dependencies & Constraints

- **GraphQL Schema Update**: Must be completed in backend before frontend can consume the new types
- **Resolver Implementation**: All transaction resolvers must be updated to include `__typename` in their return objects
- **Frontend Query Updates**: All GraphQL queries selecting transactions must be updated to use fragments for type-specific fields
- **TypeScript Code Generation**: Frontend code generation pipeline must successfully process the new schema and generate proper union types
- **Testing Coverage**: Existing transaction tests must pass with new schema, and new tests must verify type safety

## Architectural Implications

### Current State
- Transaction type is discriminated only by enum (INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT)
- Type-specific fields (transferId, future refundId) coexist in a single flattened Transaction type
- Runtime code must check transaction type before accessing type-specific fields

### After Implementation
- Each transaction type explicitly defines its shape with only its relevant fields
- GraphQL schema prevents invalid field combinations at the type level
- TypeScript enforces type safety at compile time
- Resolvers must be explicit about transaction type when returning data
- Queries use fragments for type-specific field selection

## Related Features

- **009-refunds**: Will add refund-related fields to ExpenseTransaction
- **007-embed-transaction-relations**: Links paired transactions via transferId (already implemented)
