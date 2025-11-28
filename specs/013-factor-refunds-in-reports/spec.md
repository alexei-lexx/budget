# Feature Specification: Factor Refunds in Expense Reports

**Feature Branch**: `013-factor-refunds-in-reports`  
**Created**: 2025-11-28  
**Status**: Draft  
**Input**: User description: "consider refunds in monthly expense by category report if there are expense transaction with category "cloths" for 1000 euro overall and there are refunds with the same category for 200 euro then the report should show 800 euro for the "cloths" category of course i mean transactions for given month period"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correctly Calculated Category Totals in Reports (Priority: P1)

As a user, I want to see the monthly expense report by category, where the total for each category accurately reflects expenses minus any refunds, so I can understand my net spending.

**Why this priority**: This is the core functionality of the feature request and directly impacts the accuracy of financial reports.

**Independent Test**: A user can navigate to the monthly expense report and verify that for a category with both expenses and refunds, the displayed total is the net amount. This delivers the primary value of accurate reporting.

**Acceptance Scenarios**:

1. **Given** I have expenses of €1000 and refunds of €200 in the "Clothes" category for the current month, **When** I view the "Monthly Expense by Category" report, **Then** the report should display €800 for the "Clothes" category.
2. **Given** I have expenses of €500 in the "Groceries" category and no refunds for the current month, **When** I view the "Monthly Expense by Category" report, **Then** the report should display €500 for the "Groceries" category.
3. **Given** I have no expenses or refunds in the "Electronics" category for the current month, **When** I view the "Monthly Expense by Category" report, **Then** the "Electronics" category should not be displayed or show €0.
4. **Given** I have refunds of €300 but no expenses in the "Travel" category for the current month, **When** I view the "Monthly Expense by Category" report, **Then** the report should display -€300 for the "Travel" category.

---

### Edge Cases

- What happens when there are refunds for a category but no expenses in a given month? (Covered in User Story 1, Scenario 4)
- How are refunds from a previous month that are processed in the current month handled? (Assumption: Refunds are accounted for in the month they are processed/recorded).
- What happens if a refund transaction does not have a category? (Assumption: It will be handled as an uncategorized transaction).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST calculate the total for each category in the "Monthly Expense by Category" report by subtracting the sum of all refund transactions from the sum of all expense transactions within the reporting month.
- **FR-002**: The report MUST consider transactions only within the specified monthly period.
- **FR-003**: The system MUST correctly associate refund transactions with their corresponding expense categories.
- **FR-004**: The report MUST display the net total for categories, even if the result is negative (e.g., -€300).
- **FR-005**: The system MUST follow the existing implementation's approach to handle and aggregate amounts from multiple currencies within the report.
- **FR-006**: The system MUST maintain the existing report's behavior for all user interface elements, including loading states and error handling.


### Key Entities *(include if feature involves data)*

- **Transaction**: Represents a financial event. Key attributes include: amount, date, type (expense, refund), category.
- **Category**: Represents a user-defined spending category (e.g., "Clothes", "Groceries").
- **Report**: Represents the "Monthly Expense by Category" report. Key attributes: month, year, list of category totals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of category totals in the "Monthly Expense by Category" report accurately reflect the formula `(Total Expenses - Total Refunds)` for any given category within the selected month.
- **SC-002**: The report generation time for a user with up to 1000 transactions in a month must be less than 2 seconds.
- **SC-003**: When presented with test data, the calculated totals in the report must match manually verified calculations for all categories.

## Clarifications

### Session 2025-11-28

- Q: Should a refund transaction be directly linked to its original expense transaction? → A: No, refunds are independent and only matched by category.
- Q: Should the report handle transactions involving multiple currencies? → A: Yes, the report should follow the existing approach for handling multiple currencies.
- Q: What should be displayed to the user if the report data cannot be loaded or an error occurs during generation? → A: The existing behavior for error and data loading states should be maintained.