# Research: Transaction Duplication Feature

**Phase**: Phase 0 (Research & Clarification)
**Date**: 2025-12-02
**Status**: Complete

## Research Summary

All technical decisions for transaction duplication are well-established through the project constitution and existing codebase patterns. No external research required.

## Technical Decisions

### 1. GraphQL Mutation Strategy

**Decision**: Reuse existing `createTransaction` and `createTransfer` mutations with prefilled data from source transaction.

**Rationale**:
- Avoids duplicating validation logic
- Leverages existing input validation through Zod
- Follows schema-driven development principle
- No schema changes required

**Implementation Approach**:
1. Frontend passes source transaction ID to mutation resolver
2. Resolver/service loads source transaction
3. Service duplicates applicable fields (excluding auto-generated ones like ID, timestamps)
4. Creates new transaction using same mutation input flow

### 2. Frontend Button Placement

**Decision**: Add "Copy" button to transaction card, positioned right of "Edit" button.

**Rationale**:
- Consistent with existing card action button patterns
- Clear visual proximity to other transaction actions
- No new UI paradigm required

**Implementation Approach**:
1. Find existing transaction card component with Edit button
2. Add Copy button with same styling/sizing
3. Wire to form opening with prefilled data

### 3. Form Prefill Pattern

**Decision**: Use existing transaction form (create/edit modal) with initial values passed as props/query params.

**Rationale**:
- Reuses all existing form logic and validation
- Forms already support prefilled values
- No new UI components needed

**Implementation Approach**:
1. Determine how existing forms accept prefilled data
2. Create data structure with source transaction fields
3. Pass to form component on open event

### 4. Date Handling

**Decision**: Always set date to today's date when duplicating (regardless of source date).

**Rationale**:
- Specified in feature requirements (clarification response)
- Users almost always need current date for new transactions
- Reduces error rate of forgotten date updates
- User can override if needed

**Implementation Approach**:
- Don't include date in source data passed to form
- Let form default to today (if that's default behavior)
- Or explicitly set date field to today

### 5. Transfer Duplication Behavior

**Decision**: Open dedicated "Create New Transfer" form (not regular transaction form) for TRANSFER_IN/TRANSFER_OUT.

**Rationale**:
- Specified in feature requirements and clarifications
- Transfer form has specific fields (from account, to account) not in regular form
- Supports typical transfer duplication use case (repeating transfer)

**Implementation Approach**:
1. Check transaction type in duplicate handler
2. Route TRANSFER_* types to transfer form
3. Route EXPENSE/INCOME/REFUND to regular transaction form
4. Extract from_account, to_account, amount, description for transfer form

### 6. Authorization

**Decision**: Enforce user data isolation through authenticated context (already built into resolver pattern).

**Rationale**:
- Specified in constitution: user ID comes from JWT context, not input
- Existing resolver pattern already enforces this
- No additional auth logic needed

**Implementation Approach**:
- Resolver receives authenticated user ID from context
- Service filters source transaction by both ID and user ID
- Returns 403/unauthorized if user doesn't own transaction

### 7. Deleted Account/Category Handling

**Decision**: Display deleted account/category in form, allow user to select new value.

**Rationale**:
- Specified in feature requirements
- Forms already support selecting from available accounts/categories
- User can choose replacement before saving

**Implementation Approach**:
- Load source transaction data (may include deleted references)
- Form displays current selection (even if deleted)
- Dropdown/select lists show only active items
- User must select new value before saving (if original is deleted)

## Technology Stack Confirmation

- **Frontend**: Vue 3 + Vuetify + Apollo Client (confirmed, no changes)
- **Backend**: Apollo Server + Node.js (confirmed, no changes)
- **Language**: TypeScript strict mode (confirmed, no changes)
- **Database**: DynamoDB (confirmed, no changes)
- **Testing**: Jest (confirmed, no changes)

## Dependencies Required

**None**. Feature uses only existing project dependencies.

## Next Steps

Phase 0 research complete. Proceed to Phase 1 Design:
1. Generate data-model.md (define duplicate operation data structure)
2. Generate contracts/ (define new mutation contract if needed)
3. Generate quickstart.md (implementation walkthrough)
4. Update agent context for development
