# Feature Specification: Embed Account and Category Into Transaction GraphQL

**Feature Branch**: `007-embed-transaction-relations`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "embed account and category into transaction GraphQL"

## Overview

This feature extends the GraphQL API's Transaction type to embed related account and category data directly, allowing API consumers to fetch complete transaction context in a single GraphQL request instead of making separate queries for transactions, accounts, and categories.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Query Transaction with Embedded Account and Category via GraphQL (Priority: P1)

GraphQL API consumers can query a transaction and receive account and category details embedded directly in the response, eliminating the need for separate lookups or client-side data joining.

**Why this priority**: This is the core value of the feature - it directly addresses the inefficiency of loading transactions separately from accounts and categories.

**Independent Test**: Can be tested by querying a single transaction with embedded fields and verifying both account and category data are present in the response.

**Acceptance Scenarios**:

1. **Given** a transaction exists with an associated account and category, **When** querying via GraphQL with nested `account { id name isArchived }` and `category { id name isArchived }` fields, **Then** the GraphQL response includes both the current account and category data in a single request
2. **Given** a transaction with no category assigned, **When** querying via GraphQL, **Then** the `category` field returns `null` in the GraphQL response without errors
3. **Given** an archived account associated with a transaction, **When** querying via GraphQL, **Then** the account's `isArchived` flag in the response correctly reflects its current archived state in the database

---

### User Story 2 - Load Multiple Transactions via Single GraphQL Query with Batch Optimization (Priority: P1)

Frontend can load paginated transactions via a single GraphQL query with embedded account and category data, replacing the previous pattern of separate GraphQL queries for transactions, accounts, and categories.

**Why this priority**: Directly solves the N+1 query problem and eliminates unnecessary API requests. This delivers the same core value as Story 1 but at scale.

**Independent Test**: Can be tested by loading a page of transactions via GraphQL and verifying batch loading combines multiple field resolutions into minimal database operations.

**Acceptance Scenarios**:

1. **Given** 20 transactions from 5 different accounts, **When** making a single GraphQL query for all transactions with embedded `account { id name isArchived }` fields, **Then** database receives exactly 2 queries (1 for transactions + 1 batch operation for 5 accounts)
2. **Given** 20 transactions across multiple categories, **When** making a single GraphQL query with embedded `category { id name isArchived }` fields, **Then** database receives exactly 2 queries (1 for transactions + 1 batch operation for categories)
3. **Given** 20 transactions with mixed category assignments (some without categories), **When** making the GraphQL query, **Then** the batch loader correctly resolves both null and valid category references

---

### User Story 3 - Update Frontend GraphQL Operations to Use Embedded Fields (Priority: P1)

Frontend GraphQL operations and components can be updated to request and use the new embedded account and category fields directly from the Transaction type, eliminating client-side lookup maps.

**Why this priority**: Eliminates client-side data joining complexity and improves code maintainability. Required for frontend to fully benefit from the new GraphQL schema.

**Independent Test**: Can be tested by verifying a component renders transaction details using embedded fields from the GraphQL response without maintaining separate lookup maps.

**Acceptance Scenarios**:

1. **Given** a transaction list component receives data from a GraphQL query with embedded `account { id name isArchived }` and `category { id name isArchived }` fields, **When** rendering transaction items, **Then** account and category names display correctly by accessing `transaction.account.name` and `transaction.category.name` directly
2. **Given** the archive state changes for an account in the database, **When** the component refetches its GraphQL query, **Then** the updated `isArchived` flag is reflected in the newly fetched transaction data

### Edge Cases

- **Archived Account**: When an account is archived after a transaction is created, the embedded `account.isArchived` reflects the current archived state from the database
- **Null Category**: Null categories are correctly handled in batch loading alongside valid category references, returning `null` in the response
- **Missing Referenced Account**: If a transaction references an account ID that no longer exists (data integrity issue), the query succeeds and returns stub account data: `{ id: "<accountId>", name: "Unknown", isArchived: false }`
- **Missing Referenced Category**: If a transaction references a category ID that no longer exists, the query succeeds and returns stub category data: `{ id: "<categoryId>", name: "Unknown", isArchived: false }`
- **Pagination with Batch Loading**: Batch loading applies only within the current page's transaction set, not across pages

## Requirements *(mandatory)*

This feature introduces breaking changes to the GraphQL Transaction type by removing ID-only fields and replacing them with embedded objects containing the full data context.

### Functional Requirements

- **FR-001**: System MUST add an `account` field to the Transaction GraphQL type that returns a non-nullable `TransactionEmbeddedAccount` object
- **FR-002**: System MUST add a `category` field to the Transaction GraphQL type that returns a nullable `TransactionEmbeddedCategory` object
- **FR-003**: The `TransactionEmbeddedAccount` type MUST include `id`, `name`, and `isArchived` fields
- **FR-004**: The `TransactionEmbeddedCategory` type MUST include `id`, `name`, and `isArchived` fields
- **FR-005**: System MUST remove the `accountId` field from the Transaction type (breaking change)
- **FR-006**: System MUST remove the `categoryId` field from the Transaction type (breaking change)
- **FR-007**: System MUST use batch loading (DataLoader) to prevent N+1 queries when resolving embedded account and category fields
- **FR-008**: System MUST always fetch the current state of account and category data to reflect real-time changes (including archive status)
- **FR-008a**: System MUST handle missing referenced entities gracefully: if an account/category ID exists but the entity cannot be found, return stub data with `name: "Unknown"` instead of null or error
- **FR-009**: Frontend MUST update all GraphQL queries requesting transactions to include the `account { id name isArchived }` and `category { id name isArchived }` fields
- **FR-010**: Frontend MUST remove separate account and category queries, consolidating data fetching into single transaction queries
- **FR-011**: Frontend components on the transactions page MUST be updated to use `transaction.account.name` and `transaction.category.name` instead of client-side lookup maps

### Key Entities *(include if feature involves data)*

- **Transaction**: Existing entity, extended with non-nullable embedded `account` field and nullable embedded `category` field
- **TransactionEmbeddedAccount**: New lightweight type representing account context within a transaction (id, name, isArchived)
- **TransactionEmbeddedCategory**: New lightweight type representing category context within a transaction (id, name, isArchived)

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: A single GraphQL query for transactions returns complete account and category information embedded in the response, without requiring separate account/category queries
- **SC-002**: Loading 100 transactions via a single GraphQL query with embedded fields results in no more than 3 database queries (1 for transactions + 1 batch for accounts + 1 batch for categories)
- **SC-003**: Frontend components no longer maintain separate lookup maps; transaction account/category data is accessed directly from the GraphQL response
- **SC-004**: All existing frontend components correctly display transaction account and category information using the new embedded GraphQL fields
- **SC-005**: GraphQL schema correctly handles edge cases: null categories, archived accounts/categories, and transactions without associated categories

## Clarifications

### Session 2025-10-28

- **Q1**: Breaking Change Migration Strategy → **A**: Coordinated single cutover with simultaneous backend and frontend deployment. Remove `accountId` and `categoryId` only from GraphQL Transaction type schema; database records and internal models remain unchanged.
- **Q2**: Batch Loading Error Handling → **A**: Partial success with stubs. If a referenced account/category cannot be found but its ID exists, return stub data: `{ id: "<accountId>", name: "Unknown", isArchived: false }`. Prevents null surprises from data integrity issues.
- **Q3**: Frontend Component Scope → **A**: Update all components within the transactions page that currently display transaction data and use old ID-based lookups.

## Assumptions

- Accounts and categories use soft-delete (isArchived flag), so they can be archived without removing data
- Batch loading is the appropriate optimization strategy for preventing N+1 queries
- The Transaction type's account reference is always valid (transactions cannot reference deleted accounts)
- GraphQL field-level resolution is appropriate for lazy-loading embedded objects
- Database DynamoDB schema and transaction record structure remain unchanged

## Constraints

- **Schema-Only Breaking Change**: Removal of `accountId` and `categoryId` fields from GraphQL Transaction type only; no database schema changes
- **Coordinated Deployment**: Backend and frontend must be deployed together due to breaking change
- **No Data Migration**: Implementation must not modify existing DynamoDB tables or transaction records
- **Stubbed Missing Entities**: When batch loading encounters missing referenced accounts/categories, return stub data instead of null
