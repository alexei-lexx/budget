# Feature Specification: Mark Deleted Accounts and Categories

**Feature Branch**: `008-mark-deleted-relations`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "strikethrough names of deleted accounts and categories in transactions"

## Overview

When users delete an account or category that has associated transactions, those transactions continue to reference the deleted account/category names. This creates confusion as users cannot distinguish between active and deleted references. This feature adds visual styling (strikethrough text with accessibility labels) to deleted account and category names displayed in transaction cards, making the distinction clear at a glance.

Since accounts and categories are soft-deleted (not removed), the backend returns them in transactions with an archived status flag. The system detects deleted references by checking this archived status flag rather than entity existence.

## Clarifications

### Session 2025-10-29

- Q: Should deleted references include accessibility indicators? → A: Strikethrough + aria-label with "Deleted: " prefix for screen reader support
- Q: How are deleted references determined? → A: By checking archived status flag on embedded account/category objects (archived = true indicates deleted)
- Q: Should soft-deleted accounts/categories appear in edit dropdowns? → A: No, show only active (non-archived) accounts/categories in selection dropdowns

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View transaction with deleted account (Priority: P1)

A user creates a transaction referencing Account A, then deletes Account A. When viewing the transactions list, the user should immediately recognize that the account reference is no longer valid through visual styling.

**Why this priority**: This is the core use case. Users need to understand that an account is deleted when viewing transactions. This is essential information for data integrity and user confidence.

**Independent Test**: Can be fully tested by creating a transaction, deleting its referenced account, then viewing the transaction list. The account name should be rendered with strikethrough styling.

**Acceptance Scenarios**:

1. **Given** a transaction exists with an embedded account reference, **When** that account is deleted, **Then** the account name appears with strikethrough text styling in the transaction card
2. **Given** a transaction with deleted account reference is viewed, **When** the user looks at the transactions list, **Then** the strikethrough is clearly visible and distinguishable from active accounts
3. **Given** multiple transactions where some reference deleted accounts, **When** viewing the list, **Then** only deleted account references have strikethrough styling

---

### User Story 2 - View transaction with deleted category (Priority: P1)

A user creates a transaction with a category, then deletes that category. When viewing the transaction, the category name should be visually marked as deleted.

**Why this priority**: Same critical importance as deleted accounts. Users need to identify deleted categories to understand transaction metadata completeness.

**Independent Test**: Can be fully tested by creating a transaction with a category, deleting the category, then viewing the transaction list. The category name should display with strikethrough styling.

**Acceptance Scenarios**:

1. **Given** a transaction exists with an embedded category reference, **When** that category is deleted, **Then** the category name appears with strikethrough text styling in the transaction card
2. **Given** both account and category are deleted, **When** viewing the transaction, **Then** both names are displayed with strikethrough styling independently
3. **Given** a transaction references a deleted category but active account, **When** viewing it, **Then** only the category name has strikethrough, account name appears normal

---

### User Story 3 - Interact with transaction having deleted references (Priority: P2)

A user should be able to perform all normal transaction operations (edit, delete) even if the transaction references deleted accounts or categories. The deleted reference marking is purely informational.

**Why this priority**: Ensures that the visual styling doesn't prevent users from managing their transactions. Users might want to edit or delete transactions with invalid references.

**Independent Test**: Can be fully tested by editing and deleting transactions that reference deleted accounts/categories. Operations should complete successfully, and styling should persist.

**Acceptance Scenarios**:

1. **Given** a transaction with deleted account reference, **When** the user clicks edit, **Then** the edit form opens successfully and the transaction can be modified
2. **Given** a transaction with deleted references, **When** the user initiates delete, **Then** the transaction deletes successfully
3. **Given** a transaction with deleted references, **When** the user expands the transaction card, **Then** the deleted reference styling persists in expanded view

---

### Edge Cases

- What happens when all references in a transaction are deleted (both account and category)?
- How does the system handle transactions where the account exists but category is deleted?
- Does strikethrough styling apply to transactions in expanded and collapsed states?
- What if a deleted account is restored - should the strikethrough be removed? (Assumption: No restoration feature exists, so this is out of scope)
- How should the styling render on mobile screens with limited space?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display deleted account names with strikethrough text styling in transaction cards
- **FR-002**: System MUST display deleted category names with strikethrough text styling in transaction cards
- **FR-003**: System MUST determine if an account is deleted by checking the archived status flag (archived = true indicates deleted)
- **FR-004**: System MUST determine if a category is deleted by checking the archived status flag (archived = true indicates deleted)
- **FR-005**: System MUST apply strikethrough styling independently to each deleted reference (account and category styled separately based on their archived status)
- **FR-006**: System MUST preserve strikethrough styling in both collapsed and expanded transaction card views
- **FR-007**: System MUST ensure strikethrough styling does not interfere with transaction editing or deletion operations
- **FR-008**: System MUST apply consistent strikethrough styling across all places where deleted account/category names are displayed in transactions
- **FR-009**: System MUST include aria-label attributes on strikethrough account/category names with "Deleted: " prefix for screen reader accessibility

### Key Entities

- **Transaction**: References both an account and optionally a category. The transaction itself is not deleted when its references are deleted; only the references are marked as deleted. Embedded account and category data in transaction includes the entity name and archived status flag.
- **Account**: Can be soft-deleted (archived status = true), which marks all transaction references to it as deleted. Embedded account data in transaction includes account name and archived status flag.
- **Category**: Can be soft-deleted (archived status = true), which marks all transaction references to it as deleted. Embedded category data in transaction includes category name and archived status flag.

### Data Considerations

- Account and category references are embedded in the transaction GraphQL schema (per previous architecture) with both name and archived status flag
- The system determines deletion status by checking the archived status flag on embedded account/category objects (archived = true indicates deleted)
- No data migration needed; existing transaction records already contain embedded account and category names with archived status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visually identify deleted account references in transaction cards within 1 second of viewing the list
- **SC-002**: Users can visually identify deleted category references in transaction cards within 1 second of viewing the list
- **SC-003**: 100% of deleted account names in transaction cards display with strikethrough styling
- **SC-004**: 100% of deleted category names in transaction cards display with strikethrough styling
- **SC-005**: Strikethrough styling is consistent across both mobile and desktop views
- **SC-006**: Transaction operations (edit, delete) work without errors on transactions with deleted references
- **SC-007**: Users report improved clarity in distinguishing deleted vs. active references in qualitative feedback

## Assumptions

- **Visual Styling Method**: Strikethrough text (CSS `text-decoration: line-through`) with aria-label prefix "Deleted: " for accessibility
- **Soft-Delete Architecture**: Accounts and categories are soft-deleted with an archived status flag; names and status are embedded in transaction data
- **Deletion Determination**: A reference is "deleted" if the archived status flag on the embedded account/category object is true
- **Embedded Data Integrity**: Transaction records will always contain the account/category name and archived status flag even if the entity is later deleted
- **Independent Styling**: Account and category styling are independent - either can be deleted while the other remains active
- **Mobile Consideration**: Strikethrough text should be readable on all supported screen sizes and resolutions
- **Edit Dropdown Behavior**: Only active (non-archived) accounts/categories are available for selection in transaction edit forms

## Out of Scope

- Account or category restoration functionality
- Cascading deletion of transactions when accounts/categories are deleted (transactions persist with deleted references)
- Special handling for accounts/categories deleted while a transaction edit form is open
- Bulk operations on transactions with deleted references
