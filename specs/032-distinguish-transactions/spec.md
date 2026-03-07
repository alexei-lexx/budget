# Feature Specification: Distinguish Refund and Income Transactions

**Feature Branch**: `032-distinguish-transactions`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "work on a bug or little improvement https://github.com/alexei-lexx/budget/issues/205"

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

### User Story 1 - Visually Distinguish Transactions at a Glance (Priority: P1)

As a user reviewing my transaction list, I need to quickly identify which transactions are refunds and which are income, so that I can accurately understand my financial activity without having to click each transaction.

**Why this priority**: This is the core problem statement from the bug report. Users cannot distinguish transaction types visually, making the list harder to scan and understand.

**Independent Test**: Can be fully tested by viewing the transaction list and verifying that refund and income transactions have visually distinct indicators (colors, icons, or labels) that make them immediately recognizable.

**Acceptance Scenarios**:

1. **Given** a transaction list containing both refund and income transactions, **When** the user views the list, **Then** refund transactions display a distinct visual indicator (e.g., different color, icon, or badge) compared to income transactions
2. **Given** a user viewing the transaction list on mobile, **When** they scan the list, **Then** the visual distinction remains clear and doesn't obscure other transaction details
3. **Given** multiple transactions of the same type, **When** the user views the list, **Then** all refunds appear with consistent styling and all income appears with consistent styling

---

### User Story 2 - Maintain Visual Consistency Across Transaction Types (Priority: P2)

As a user, I need the visual indicators for refund and income transactions to fit naturally with other transaction types in the list, so that the interface feels cohesive and not cluttered.

**Why this priority**: While less critical than distinguishing refunds from income, maintaining overall consistency ensures the UI remains clean and professional. This prevents the new indicators from making the interface feel disorganized.

**Independent Test**: Can be tested by viewing the transaction list with various transaction types (expense, income, refund, transfer) and verifying that the visual treatment is consistent with the existing design language.

**Acceptance Scenarios**:

1. **Given** a transaction list with mixed transaction types (expense, income, refund, transfer), **When** the user views the list, **Then** all visual indicators follow consistent styling conventions
2. **Given** a user familiar with the app's design, **When** they view the new transaction indicators, **Then** the visual style immediately feels native to the app

---

### Edge Cases

- What happens when a refund transaction has an unusually long description - does the visual indicator remain visible?
- How do visual indicators appear when transactions are in different states (archived, pending, completed)?
- How does the distinction work in accessibility contexts (high contrast mode, screen readers)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display refund transactions with a distinct visual indicator (color, icon, label, or combination) in the transaction list
- **FR-002**: System MUST display income transactions with a distinct visual indicator that clearly differs from refund transactions
- **FR-003**: Visual indicators for refund and income transactions MUST be consistent across all views where transactions are displayed in a list
- **FR-004**: Visual indicators MUST not obscure or interfere with other transaction information (amount, date, description, category)
- **FR-005**: Visual distinction MUST remain apparent on all supported screen sizes and orientations
- **FR-006**: Visual indicators MUST be distinguishable for users with color blindness or low vision (WCAG AA compliance for color contrast)

### Key Entities

- **Transaction**: Existing entity with type (expense, income, refund, transfer) and visual presentation in lists
- **Visual Indicator**: The new element(s) added to distinguish transaction types - could be color, icon, badge, or combination

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify transaction type (refund vs. income) within 1 second of viewing the transaction list without clicking individual items
- **SC-002**: 100% of refund transactions in the list display a distinct visual indicator
- **SC-003**: 100% of income transactions in the list display a distinct visual indicator that differs from refund indicators
- **SC-004**: Visual indicators meet WCAG AA color contrast requirements for users with color vision deficiency
- **SC-005**: No user interface regression - all existing transaction information remains visible and readable

## Assumptions

- The visual indicator approach will be determined during planning/implementation (color, icon, label, or combination is left flexible)
- This fix applies to the transaction list view as the primary context; other transaction displays may be addressed separately
- Existing transaction data does not require migration - the type field already exists and contains the necessary information
- The fix does not require changes to the backend API or data model
