# Feature Specification: Fix Pagination Cursor Bug - UserDateIndex Incompatibility

**Feature Branch**: `014-fix-date-pagination`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Fix pagination cursor bug - UserDateIndex incompatibility"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate Through Date-Filtered Transactions (Priority: P1)

As a user with many transactions across multiple dates, when I apply date range filters to view specific time periods, I need to navigate through multiple pages of results to review all matching transactions.

**Why this priority**: This is the core functionality that is currently broken. Users cannot access any transactions beyond the first page when date filters are applied, making the transaction list effectively unusable for filtered queries. This is a critical bug blocking a fundamental user workflow.

**Independent Test**: Can be fully tested by creating 50+ transactions across multiple dates, applying a date range filter, loading the first page, then attempting to load the second page. Success means all pages load without validation errors and all transactions are accessible.

**Acceptance Scenarios**:

1. **Given** I have 50 transactions between January 1-31, 2024, **When** I filter by date range "2024-01-01" to "2024-01-31" with page size 10 and request page 1, **Then** the first 10 transactions load successfully with a cursor for the next page
2. **Given** I received a cursor from the first page of date-filtered results, **When** I request the second page using that cursor while maintaining the same date filters, **Then** the next 10 transactions load successfully without validation errors
3. **Given** I am navigating through multiple pages of date-filtered transactions, **When** I continue clicking "Next" through all pages, **Then** all 50 transactions are accessible across 5 pages with no duplicates or missing items
4. **Given** I have applied date filters and reached the last page, **When** I check the page info, **Then** `hasNextPage` is false indicating no more results

---

### User Story 2 - View All Transactions Without Date Filters (Priority: P2)

As a user viewing my complete transaction history without filters, I need pagination to continue working correctly for unfiltered queries to maintain existing functionality.

**Why this priority**: This ensures the fix doesn't break existing working functionality. Unfiltered queries use UserCreatedAtIndex which already works correctly, and this must continue to work after the cursor format changes.

**Independent Test**: Can be fully tested by creating 50+ transactions, loading the first page without any filters, then navigating through subsequent pages. Success means pagination works exactly as it did before the fix.

**Acceptance Scenarios**:

1. **Given** I have 50 transactions without any date filters applied, **When** I request the first page with page size 10, **Then** the first 10 transactions load successfully with a cursor
2. **Given** I received a cursor from an unfiltered query, **When** I request the second page using that cursor, **Then** the next 10 transactions load successfully using UserCreatedAtIndex
3. **Given** I am paginating through unfiltered results, **When** I navigate through all pages, **Then** all transactions are accessible with no duplicates or missing items

---

### User Story 3 - Receive Clear Error for Invalid Cursors (Priority: P3)

As a user who encounters a corrupted or manipulated cursor, I need to receive a clear error message explaining that the cursor is invalid so I can restart my pagination session.

**Why this priority**: While less critical than the core pagination fix, proper error handling improves user experience and aids in debugging. Users should understand when something went wrong rather than seeing cryptic technical errors.

**Independent Test**: Can be fully tested by submitting malformed cursors (invalid base64, missing fields, corrupted JSON) and verifying that clear, actionable error messages are returned.

**Acceptance Scenarios**:

1. **Given** I provide a cursor with invalid base64 encoding, **When** the system attempts to decode it, **Then** I receive an error message "Invalid cursor format"
2. **Given** I provide a cursor missing required fields (e.g., no `id`), **When** the system validates the cursor structure, **Then** I receive an error message "Invalid cursor structure"
3. **Given** I provide a valid cursor but for a different user's data, **When** the system processes the request, **Then** I receive appropriate authorization/validation errors

---

### Edge Cases

- What happens when a legacy cursor (containing only `createdAt` and `id`, missing `date` field) is decoded?
- How does the system handle a cursor that has been manually tampered with or corrupted?
- What occurs when date filters are applied but result in zero transactions?
- How does pagination behave when a transaction's date or createdAt values are at boundary conditions (e.g., exactly at filter cutoff)?
- What happens if the same transaction appears on multiple pages due to timing issues during data updates?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cursor encoding MUST store three fields: `createdAt` (ISO timestamp), `date` (YYYY-MM-DD format), and `id` (UUID)
- **FR-002**: System MUST use `date` field from cursor when constructing ExclusiveStartKey for UserDateIndex queries
- **FR-003**: System MUST use `createdAt` field from cursor when constructing ExclusiveStartKey for UserCreatedAtIndex queries
- **FR-004**: Cursor decoding MUST validate that all required fields (`createdAt`, `date`, `id`) are present in the cursor structure
- **FR-005**: System MUST throw clear error messages when cursor validation fails (invalid format or missing fields)
- **FR-006**: System MUST select the appropriate index (UserDateIndex when date filters present, UserCreatedAtIndex otherwise)
- **FR-007**: Pagination MUST work correctly for queries with date filters (`dateAfter` and/or `dateBefore`)
- **FR-008**: Pagination MUST continue to work correctly for queries without date filters
- **FR-009**: Pagination MUST work correctly when date filters are combined with other filters (account, category, transaction type)
- **FR-010**: System MUST ensure no duplicate transactions appear across pagination pages
- **FR-011**: System MUST ensure no transactions are skipped when navigating between pages

### Key Entities

- **CursorData**: Represents pagination cursor metadata
  - Contains `createdAt` (ISO 8601 timestamp) for UserCreatedAtIndex queries
  - Contains `date` (YYYY-MM-DD string) for UserDateIndex queries
  - Contains `id` (UUID string) as unique transaction identifier
  - Encoded as base64 JSON string for transmission

- **Transaction**: Business entity representing financial transactions
  - Has `date` field (user-specified transaction date in YYYY-MM-DD format)
  - Has `createdAt` field (system-generated timestamp when record was created)
  - These can differ when users backdate transactions
  - Has `id` field (unique identifier)

- **ExclusiveStartKey**: Pagination marker for database queries
  - Must include partition key (`userId`)
  - Must include sort key (`date` for UserDateIndex or `createdAt` for UserCreatedAtIndex)
  - Must include unique identifier (`id`)
  - Format and field types must exactly match the index definition

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully navigate through all pages when date filters are applied without encountering validation errors
- **SC-002**: Pagination queries using UserDateIndex complete successfully with response time under 2 seconds
- **SC-003**: Pagination queries using UserCreatedAtIndex continue to work with no performance degradation
- **SC-004**: All transactions are retrievable across pagination pages with zero duplicates and zero missing items when tested with 100+ transactions
- **SC-005**: Invalid cursor attempts result in clear error messages within 100ms
- **SC-006**: Existing regression test "should paginate correctly when using date filters without duplicates or missing items" passes successfully
