# Feature Specification: Fix Refund Category Data Loss in Edit Form

**Feature Branch**: `016-fix-refund-category-edit`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "create spec 16, not 14, 15, 17 etc. exactly number 16
there is a bug
given refund with category selected in the transaction list
when open its edit transaction form
the category is not selected
and if I dont select it again and just save then transaction category is gone"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preserve Category When Editing Refund (Priority: P1)

Users need to edit refund transactions (e.g., update description, adjust amount, change date) without losing the category assignment. Currently, when opening the edit form for a refund that has a category assigned, the category field appears empty. If the user saves the form without re-selecting the category, the category data is permanently lost.

**Why this priority**: P1 because this is a critical data loss bug affecting core transaction management functionality. Users cannot safely edit refunds without risking data corruption, which undermines trust in the application and requires extra work to fix corrupted data.

**Independent Test**: Can be fully tested by creating a refund with a category, opening its edit form, verifying the category is pre-selected, making a minor change (like description), saving, and confirming the category is preserved.

**Acceptance Scenarios**:

1. **Given** a refund transaction with category "Groceries" exists in the transaction list, **When** user opens the edit form for this refund, **Then** the category field displays "Groceries" as the selected value
2. **Given** the edit form is open for a refund with category "Groceries", **When** user changes the description and saves without touching the category field, **Then** the transaction retains "Groceries" as its category
3. **Given** a refund transaction with category "Entertainment" exists, **When** user opens the edit form and explicitly changes the category to "Dining", **Then** the transaction is saved with "Dining" as the new category
4. **Given** a refund transaction with no category assigned, **When** user opens the edit form, **Then** the category field shows the empty/unselected state (no category placeholder)

---

### Edge Cases

- What happens when editing a refund whose assigned category has been deleted from the system?
- How does the system handle refunds that were created before categories existed (legacy data)?
- What happens if the user clears the category field intentionally (removes category assignment)?
- How does the form behave if category data is corrupted or in an invalid state?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Edit form MUST pre-populate the category field with the currently assigned category when opening a refund transaction for editing
- **FR-002**: Saving the edit form without modifying the category field MUST preserve the existing category assignment
- **FR-003**: Category field MUST accurately reflect the current category state (selected category name or empty state if no category assigned)
- **FR-004**: Users MUST be able to change the category to a different value and have that change persist
- **FR-005**: Users MUST be able to remove category assignment by clearing the category field (if this action is intentional)
- **FR-006**: System MUST handle deleted categories gracefully (display deleted category name or fallback indicator, prevent data loss)

### Key Entities

- **Refund Transaction**: A financial transaction representing money returned, includes fields for amount, date, description, account, and category assignment
- **Category**: An organizational label for transactions, with a name and identifier, can be assigned to refund transactions for expense tracking

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of refund transactions retain their category assignment when edited without explicit category changes
- **SC-002**: Users can successfully edit refund transaction fields (description, amount, date) without losing category data
- **SC-003**: Category field in edit form correctly displays the assigned category for 100% of refund transactions
- **SC-004**: Zero data loss incidents related to category assignments when editing refunds after fix implementation
