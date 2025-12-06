# Feature Specification: Transfer Transaction Sort Order Fix

**Feature Branch**: `018-fix-transfer-sort`
**Created**: 2025-12-02
**Status**: Draft
**Input**: User description: "I create a transfer, I open transactions page, I expect to see transfer-related transactions in the following order: inbound, outbound. That follows the login: transfer transactions are sorted in the order from source to destination, on the page the order is reversed to show most recent transactions first. But the actual result is wrong - I see outbound, inbound that I treat as money moved from destination to source"

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

### User Story 1 - View Transfer Transactions in Correct Order (Priority: P1)

As a user who creates a transfer between accounts, I want the paired transfer transactions to appear in the correct sequence (inbound before outbound) on the main transactions page so that I can accurately understand the flow of money from source to destination.

**Why this priority**: This is a critical bug fix. When viewing the full transactions list (without account filtering), paired transfer transactions appear reversed, causing user confusion about the actual direction of money flow and breaking trust in the system's accuracy.

**Independent Test**: Can be fully tested by:
1. Creating a single transfer from Account A to Account B
2. Navigating to the transactions page (without filtering by account)
3. Verifying that transactions appear in this order:
   1. TRANSFER_IN transaction
   2. TRANSFER_OUT transaction

**Acceptance Scenarios**:

1. **Given** a user has created a transfer from Account A to Account B, **When** they view the transactions page showing all transactions, **Then** the transactions appear in this order:
   1. TRANSFER_IN (money entering Account B)
   2. TRANSFER_OUT (money leaving Account A)

### Edge Cases

- What happens when viewing the full transactions list with multiple transfers (some between same accounts, some between different accounts)? (Each pair should maintain correct order independently)
- What if a transfer's inbound and outbound transactions have identical timestamps? (Should still maintain inbound-before-outbound order)
- How does the ordering work with pagination when a transfer pair spans page boundaries? (Pair may be split across pages, but inbound-before-outbound order is maintained independently within each page)
- What about transfers created before the fix was deployed? (Migration populates `createdAtId` for all existing transactions, but legacy transfers use UUID IDs which aren't temporally sortable. Only new transfers with ULID IDs have guaranteed correct ordering.)

## Clarifications

### Session 2025-12-02

- Q: How should transfer pairs behave across pagination boundaries? → A: Allow pair to be split across pages, but ensure correct order within each page independently
- Q: Where should the sort order fix be implemented? → A: Database level via DynamoDB query/scan modifications to include secondary sort by transaction type priority
- Q: How should legacy transfers (created before the fix) be handled? → A: Migration populates `createdAtId` for all existing transactions to enable the new index. However, legacy transfers use UUID IDs (not temporally sortable), so only new transfers created after deployment (using ULID IDs) will have guaranteed correct sort order.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST correctly sort paired transfer transactions such that inbound (TRANSFER_IN) transactions appear before outbound (TRANSFER_OUT) transactions in the full transactions list
- **FR-002**: System MUST apply reverse chronological ordering (most recent first) to the transaction list while simultaneously preserving the correct inbound-before-outbound sequence within each related transfer pair
- **FR-003**: System MUST implement sorting fix at the database query level (DynamoDB) using secondary sort criteria to ensure all query results are correctly ordered
- **FR-004**: System MUST maintain transaction ordering consistency when multiple transfers exist between the same or different account pairs
- **FR-005**: System MUST ensure the ordering fix applies to all queries returning transactions (paginated list, filtered results, all viewing modes without additional application-level reordering)

### Key Entities *(include if feature involves data)*

- **Transaction**: Represents a single movement of money with attributes: `id`, `type` (TRANSFER_IN or TRANSFER_OUT for transfers), `amount`, `date`, `account`, `transferId` (links to paired transaction), `description`, `category`
- **Transfer Pair**: Two related transactions (one TRANSFER_IN, one TRANSFER_OUT) created simultaneously with the same `transferId`, representing money movement from source account to destination account. Must display with inbound before outbound in transaction lists

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of newly created transfers display inbound transaction before outbound transaction on the full transactions list
- **SC-002**: When viewing the transactions page with no account filter, paired transfer transactions maintain correct inbound-before-outbound order while respecting reverse chronological (most recent first) sorting
- **SC-003**: Multiple transfer pairs in the transactions list each maintain correct order independently (no cross-pair ordering issues)
- **SC-004**: All new transfer transactions created after the fix is deployed display in correct order (using ULID IDs for temporal sorting). Legacy transfers (with UUID IDs) remain queryable but ordering within same timestamp is non-deterministic.

## Assumptions

- Transfer transactions are always created as paired TRANSFER_IN (inbound) and TRANSFER_OUT (outbound) transactions within a single atomic operation
- Paired transfer transactions are linked via a `transferId` field that identifies which transactions belong together
- Transaction timestamps reflect the creation time, with paired transactions having the same or near-identical timestamps
- The fix is implemented at the DynamoDB query level using secondary sort criteria (transaction type priority)
- Migration populates `createdAtId` for all existing transactions to enable index queries
- Legacy transfers use UUID IDs (non-temporal), so correct ordering only guaranteed for new transfers with ULID IDs
- Only transfers created after deployment will have deterministic sort order when timestamps match
- Transfer pairs may be split across pagination boundaries, but inbound-before-outbound order is maintained independently within each page
- Reverse chronological sorting (most recent first) is the primary sort, and transfer pair ordering is a secondary constraint within that
- Transfer operations are already fully implemented; this fix addresses only the display ordering of existing transfers
