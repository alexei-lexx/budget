# Feature Specification: Exclude Categories from Reports

**Feature Branch**: `028-exclude-non-operating`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "Exclude non-operating transactions from monthly reports. Capital transactions (investments, large purchases), loans to friends/family, and reimbursable expenses should not appear in income/expense reports."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exclude Category from Reports (Priority: P1)

A user wants to exclude investment transactions from their monthly spending analysis. They navigate to category management, select their "Investments" category, and enable "Exclude from reports". From this point forward, all transactions in this category are excluded from income/expense report totals.

**Why this priority**: This is the core mechanism that enables the entire feature. Without the ability to exclude categories from reports, no filtering can occur.

**Independent Test**: Can be fully tested by excluding a category from reports and verifying the setting persists across sessions.

**Acceptance Scenarios**:

1. **Given** a user with an existing expense category "Investments", **When** they access category settings and enable "Exclude from reports", **Then** the category is saved with the exclusion flag enabled
2. **Given** a user editing a category with "Exclude from reports" enabled, **When** they disable the option, **Then** the category is included in reports again
3. **Given** a user creating a new category, **When** they enable "Exclude from reports" during creation, **Then** the new category is created with the exclusion flag enabled

---

### User Story 2 - View Accurate Monthly Reports (Priority: P1)

A user who manages personal investments reviews their monthly report. Previously, a $5,000 stock purchase appeared as an expense, distorting their actual lifestyle spending. After marking "Investments" as excluded from reports, the monthly report now shows only their true living costs without investment transactions.

**Why this priority**: This is the primary value delivered by the feature—accurate spending visibility. Tied with P1 as it validates the category exclusion works correctly.

**Independent Test**: Can be tested by comparing monthly report totals before and after excluding a category with transactions.

**Acceptance Scenarios**:

1. **Given** transactions exist in an excluded category, **When** viewing the monthly report, **Then** those transactions are excluded from total income and total expense calculations
2. **Given** transactions exist in an excluded category, **When** viewing the category breakdown percentages, **Then** excluded categories do not appear in the breakdown
3. **Given** a month has only transactions in excluded categories, **When** viewing that month's report, **Then** the report shows zero income and zero expenses

---

### User Story 3 - Track Loans to Friends/Family (Priority: P2)

A user lends $500 to a friend. They record this as an expense under "Loans - Outgoing" (excluded from reports). When the friend repays $500, they record it as income under "Loans - Incoming" (also excluded). Their monthly report accurately reflects their real income and expenses, while the loan transactions are tracked but excluded from totals.

**Why this priority**: Demonstrates a common use case that validates bidirectional exclusions (both income and expense categories).

**Independent Test**: Can be tested by creating matching loan-out and loan-in transactions and verifying neither affects report totals.

**Acceptance Scenarios**:

1. **Given** an expense category "Loans - Outgoing" is excluded from reports, **When** recording a loan to a friend, **Then** the transaction appears in transaction history but not in monthly expense totals
2. **Given** an income category "Loans - Incoming" is excluded from reports, **When** receiving loan repayment, **Then** the transaction appears in transaction history but not in monthly income totals

---

### User Story 4 - Track Reimbursable Business Expenses (Priority: P2)

A user pays $200 for work supplies out of pocket. They record this under "Work Expenses" (excluded from reports). When reimbursed by their employer, they record the $200 under "Reimbursements" (also excluded). Neither transaction affects their personal spending/income analysis.

**Why this priority**: Another common use case that validates the feature works for employer reimbursement scenarios.

**Independent Test**: Can be tested by creating a reimbursable expense and corresponding reimbursement, verifying net-zero effect on reports.

**Acceptance Scenarios**:

1. **Given** categories for work expenses and reimbursements are excluded from reports, **When** viewing monthly report after recording both, **Then** personal income and expense totals remain unaffected

---

### Edge Cases

- What happens when a user excludes a category mid-month? The monthly report recalculates to exclude all transactions in that category, including historical ones.
- What happens when all transactions in a month belong to excluded categories? The report shows zero income and zero expenses with an empty category breakdown.
- What happens to existing transactions when a category's exclusion status changes? All transactions in that category are immediately included/excluded from reports based on the new status.
- How are refunds handled for excluded transactions? Refunds follow the same category rules—if the original transaction's category is excluded from reports, the refund is also excluded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to mark any category (income or expense) as "Exclude from reports"
- **FR-002**: System MUST persist the exclusion flag as part of category data
- **FR-003**: System MUST exclude transactions in excluded categories from monthly report income totals
- **FR-004**: System MUST exclude transactions in excluded categories from monthly report expense totals
- **FR-005**: System MUST exclude excluded categories from the category breakdown section of reports
- **FR-006**: System MUST display the exclusion status when viewing/editing a category
- **FR-007**: System MUST allow toggling a category's exclusion status at any time
- **FR-008**: System MUST apply exclusions retroactively to all existing transactions in the category
- **FR-009**: System MUST continue to display excluded transactions in transaction history/lists
- **FR-010**: System MUST continue to affect account balances with excluded transactions (only report totals are affected)
- **FR-011**: System MUST present the "Exclude from reports" toggle within the category edit/create dialog

### Key Entities

- **Category**: Existing entity. Gains a new attribute indicating whether it is excluded from reports. Default is included (not excluded).
- **Monthly Report**: Existing derived view. Calculation logic must filter out transactions belonging to excluded categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can exclude a category from reports in under 30 seconds
- **SC-002**: Monthly report totals accurately exclude 100% of transactions in excluded categories
- **SC-003**: Category breakdown percentages sum to 100% of included transactions only
- **SC-004**: Account balances remain accurate regardless of category exclusion status
- **SC-005**: Users can distinguish excluded from included categories at a glance in category management

## Clarifications

### Session 2026-01-19

- Q: Where should the "Exclude from reports" toggle appear in the UI? → A: In the existing category edit/create dialog as a toggle switch

## Assumptions

- The label "Exclude from reports" is user-facing and self-explanatory for personal finance users
- A single boolean flag per category is sufficient—transactions cannot be individually excluded, only via their category
- Exclusion status applies equally to all users (single-user system, no multi-tenant considerations)
- Default categories (if any exist) start as included; users must explicitly exclude categories from reports
