# Feature Specification: Display Original Names for Deleted Accounts and Categories

**Feature Branch**: `009-show-deleted-names`
**Created**: 2025-10-27
**Status**: Draft
**Input**: User description: "Show deleted account and category names on transaction cards. When an account or category is deleted, display the original account and category names instead of blank values."

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

### User Story 1 - View Transaction History After Deleting Account (Priority: P1)

A user has transactions recorded against an account they no longer use. They delete the account but want to review their transaction history. When viewing past transactions, they need to know which account the transaction belonged to, even though the account no longer exists.

**Why this priority**: This is the most critical user flow. Users regularly delete accounts (consolidation, closing old accounts, cleanup) and must be able to audit their transaction history. Without knowing which account a transaction came from, the financial history becomes confusing and unreliable.

**Independent Test**: Can be fully tested by: (1) Creating an account, (2) Recording transactions against it, (3) Deleting the account, (4) Viewing the transaction list and verifying the original account name is displayed, delivering the value of maintaining historical transaction context.

**Acceptance Scenarios**:

1. **Given** a user has transactions against an account, **When** the account is deleted, **Then** the transaction card still displays the original account name (not "Unknown Account")
2. **Given** a deleted account transaction is viewed, **When** the user looks at the transaction card, **Then** the account name appears exactly as it was before deletion

---

### User Story 2 - View Transaction History After Deleting Category (Priority: P1)

A user categorizes their expenses and income but later deletes a category (consolidation, mistake, reorganization). When reviewing their transaction history, they need to see what category the transaction was originally assigned to.

**Why this priority**: Category information is essential for financial analysis and understanding spending patterns. Losing category information on deleted categories makes historical analysis impossible. Users need to see what category they originally assigned, even if they later reorganize their category structure.

**Independent Test**: Can be fully tested by: (1) Creating a category, (2) Recording transactions with that category, (3) Deleting the category, (4) Viewing the transaction list and verifying the original category name is displayed, delivering historical categorization context.

**Acceptance Scenarios**:

1. **Given** a user has transactions assigned to a category, **When** the category is deleted, **Then** the transaction card displays the original category name
2. **Given** a transaction with a deleted category, **When** viewed on the transaction card, **Then** the category name is shown (not blank/missing)

---

### User Story 3 - Audit Trail Consistency (Priority: P2)

A user needs to maintain accurate financial records and audit trails. Historical transactions should reflect the original state of the data, not the current state after deletions.

**Why this priority**: Regulatory and personal financial audit requirements dictate that historical records should be immutable and accurate. This is a secondary priority after the primary user flows but important for data integrity.

**Independent Test**: Can be tested by: Creating transactions with accounts/categories, verifying the snapshot is saved, then deleting the related accounts/categories, and confirming the transaction still shows the original values.

**Acceptance Scenarios**:

1. **Given** a transaction with an associated account and category, **When** those entities are deleted, **Then** the transaction record maintains the original names in its display
2. **Given** any user reviewing their complete transaction history, **When** they filter or search, **Then** all transaction details are accurate and complete regardless of current account/category state

---

### User Story 4 - Distinguish Deleted Entities from Existing Ones (Priority: P2)

A user reviewing their transaction history needs to quickly identify which accounts and categories are still active versus which have been deleted. Visual distinction helps them understand the current state of their finances at a glance.

**Why this priority**: While the primary need is to see the original names, users also benefit from knowing whether an account/category still exists or has been deleted. This aids in decision-making (e.g., "Should I re-create this category?" or "This account is gone, should I consolidate?"). It's secondary to showing the names but important for UX clarity.

**Independent Test**: Can be fully tested by: (1) Creating transactions with both active and deleted accounts/categories, (2) Viewing the transaction list, (3) Verifying that deleted entities are visually distinct from active ones (e.g., different styling, text decoration, icon, color), delivering clear visual feedback about entity status.

**Acceptance Scenarios**:

1. **Given** a transaction list with both active and deleted accounts, **When** viewing the cards, **Then** deleted account names are visually distinguished from active account names
2. **Given** a transaction list with both active and deleted categories, **When** viewing the cards, **Then** deleted category names are visually distinguished from active category names
3. **Given** a user reviewing mixed transactions, **When** scanning the list, **Then** they can quickly identify which entities are deleted without reading additional text

---

### Edge Cases

- What happens when an account AND its related category are both deleted? (Both original names should display)
- What happens when a transaction has no category (optional field) and the account is deleted? (Account name should display, category field remains empty)
- What if a user views transactions for a different time period where the account/category didn't exist yet? (No change - original name still displays based on transaction record)
- What happens with transfer transactions (TRANSFER_IN/TRANSFER_OUT) when the related account is deleted? (Both accounts in the transfer pair should show original names)

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST display the original account name on transaction cards even when the account is archived (deleted)
- **FR-002**: System MUST display the original category name on transaction cards even when the category is archived (deleted)
- **FR-003**: System MUST NOT display "Unknown Account" or blank values for deleted accounts - display the actual original name instead
- **FR-004**: System MUST maintain consistency: the same deleted account/category always displays the same original name across all transaction cards
- **FR-005**: System MUST handle transactions with optional categories correctly (if no category, category field remains empty regardless of account deletion status)
- **FR-006**: System MUST resolve deleted account and category names from the backend data store where soft-deleted records are preserved
- **FR-007**: System MUST visually distinguish deleted accounts/categories from active ones using strikethrough text styling

### Key Entities *(include if feature involves data)*

- **Transaction**: Stores `accountId` and `categoryId` references that may point to deleted (archived) accounts/categories
- **Account**: Soft-deleted accounts (marked `isArchived: true`) still retain their original `name`, `currency`, and other properties needed for display
- **Category**: Soft-deleted categories (marked `isArchived: true`) still retain their original `name` and other properties needed for display

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 100% of transactions with deleted accounts display the original account name when viewed
- **SC-002**: 100% of transactions with deleted categories display the original category name when viewed
- **SC-003**: Users can differentiate deleted vs. active accounts/categories visually through strikethrough text styling
- **SC-004**: No "Unknown Account" or undefined/blank category names appear on transaction cards for deleted entities
- **SC-005**: Performance: Displaying transactions with deleted accounts/categories loads in under 1 second (same as with active entities)
- **SC-006**: All existing tests pass and new tests validate that deleted account/category names are correctly displayed

## Clarifications

### Session 2025-10-27

- Q: What type of visual distinction should indicate a deleted entity? → A: Strikethrough text styling

## Assumptions

- Deleted accounts and categories are soft-deleted (marked `isArchived: true`) rather than hard-deleted, so their data is preserved
- The backend can efficiently query for archived accounts/categories by ID
- Transaction references (`accountId`, `categoryId`) remain unchanged when accounts/categories are deleted
- The backend will provide information about whether an account/category is archived when returning transaction data or related entity data
- Deleted account and category names will be displayed with strikethrough styling to visually distinguish them from active entities

