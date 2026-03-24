# Reports Specification

## Purpose

This domain covers the monthly expense report by category. The report shows net spending per category (expenses minus refunds) for a selected month, supports multi-currency display, respects category exclusion flags, and provides sort controls positioned above their corresponding table columns.

## Requirements

### Requirement: Monthly Expense Report

The system SHALL generate a monthly expense report that groups transactions by category, showing the net amount and percentage of total spending for each category.

#### Scenario: Report loads for the current month by default

- **GIVEN** a user navigates to the Reports page
- **WHEN** the page loads
- **THEN** the current month's expense report is displayed automatically

#### Scenario: Categories are sorted alphabetically

- **GIVEN** a month with expenses across multiple categories
- **WHEN** viewing the report
- **THEN** categories are listed in alphabetical order

#### Scenario: Each category row shows amount and percentage

- **GIVEN** a report with expenses in multiple categories
- **WHEN** viewing the category breakdown
- **THEN** each row displays the category's total amount and its percentage of total spending

#### Scenario: Month with no transactions shows zero totals

- **GIVEN** a month with no transactions
- **WHEN** viewing that month's report
- **THEN** the report shows zero totals with an appropriate empty state message

### Requirement: Month Navigation

The system SHALL allow users to navigate between months using Previous and Next controls when in monthly view mode. Navigation to future months is permitted.

#### Scenario: User navigates to the previous month

- **GIVEN** the user is viewing a monthly report
- **WHEN** they click the Previous button
- **THEN** the report updates to show the previous month's data

#### Scenario: User navigates to the next month

- **GIVEN** the user is viewing a monthly expense report
- **WHEN** they click the Next button
- **THEN** the report updates to show the next month's data

#### Scenario: Month navigation is not shown in yearly mode

- **GIVEN** the user is in yearly view mode
- **WHEN** viewing the Expense Report page
- **THEN** the month navigation controls are not visible

### Requirement: View Mode Toggle

The system SHALL provide a toggle on the Expense Report page that allows users to switch between monthly and yearly view modes.

#### Scenario: Toggle is visible on the Expense Report page

- **GIVEN** a user navigates to the Expense Report page
- **WHEN** the page loads
- **THEN** a toggle with "Monthly" and "Yearly" options is visible in the page header

#### Scenario: Monthly mode is active by default

- **GIVEN** a user navigates to the Expense Report page with no URL parameters
- **WHEN** the page loads
- **THEN** the "Monthly" toggle option is selected and the current month's report is displayed

#### Scenario: Switching to yearly mode shows the yearly report

- **GIVEN** the user is in monthly view mode
- **WHEN** they click the "Yearly" toggle option
- **THEN** the view switches to yearly mode and the current year's expense report is displayed

### Requirement: Yearly Expense Report

The system SHALL generate a yearly expense report aggregating all transactions in a full calendar year (January 1 – December 31), grouped by category, with the same breakdown structure as the monthly report.

#### Scenario: Yearly report aggregates all 12 months

- **GIVEN** a user with expenses spread across multiple months of a year
- **WHEN** viewing the yearly expense report for that year
- **THEN** the report shows totals that include transactions from all 12 months

#### Scenario: Year with no transactions shows empty state

- **GIVEN** a year with no transactions
- **WHEN** viewing that year's report in yearly mode
- **THEN** the report shows an appropriate empty state message

### Requirement: Year Navigation

The system SHALL allow users to navigate between years using Previous and Next controls when in yearly view mode. Navigation to future years is permitted.

#### Scenario: User navigates to the previous year

- **GIVEN** the user is viewing a yearly expense report
- **WHEN** they click the Previous button
- **THEN** the report updates to show the previous year's data

#### Scenario: User navigates to the next year

- **GIVEN** the user is viewing a yearly expense report
- **WHEN** they click the Next button
- **THEN** the report updates to show the next year's data

### Requirement: Period URL State

The system SHALL encode the selected view mode and period in the URL so that reports are bookmarkable and shareable.

#### Scenario: Monthly report URL includes year and month

- **GIVEN** the user is viewing the March 2025 monthly report
- **WHEN** looking at the URL
- **THEN** the URL contains `?year=2025&month=3`

#### Scenario: Yearly report URL includes only year

- **GIVEN** the user is viewing the 2025 yearly report
- **WHEN** looking at the URL
- **THEN** the URL contains `?year=2025` with no `month` parameter

#### Scenario: Page loads from a yearly URL bookmark

- **GIVEN** a user navigates directly to the report page with `?year=2024` (no month param)
- **WHEN** the page loads
- **THEN** the yearly view mode is active and the 2024 yearly report is displayed

#### Scenario: Page loads from a monthly URL bookmark

- **GIVEN** a user navigates directly to the report page with `?year=2024&month=6`
- **WHEN** the page loads
- **THEN** the monthly view mode is active and the June 2024 monthly report is displayed

### Requirement: Multi-Currency Report Display

The system SHALL display amounts for different currencies in separate rows within each category, without converting or mixing currencies.

#### Scenario: Expenses in multiple currencies are shown separately

- **GIVEN** a category with expenses in both EUR and USD in the same month
- **WHEN** viewing the report
- **THEN** the category shows separate rows for each currency with no conversion applied

### Requirement: Net Expense Calculation Including Refunds

The system SHALL calculate each category's monthly total as the sum of expense transactions minus the sum of refund transactions within that month and category.

#### Scenario: Refunds reduce the category total

- **GIVEN** expenses of €1000 and refunds of €200 in the "Clothes" category for a given month
- **WHEN** viewing the monthly expense report
- **THEN** the report displays €800 for "Clothes"

#### Scenario: Categories without expenses show negative totals when refunds exist

- **GIVEN** refunds of €300 and no expenses in the "Travel" category for a given month
- **WHEN** viewing the monthly expense report
- **THEN** the report displays −€300 for "Travel"

#### Scenario: Categories with no transactions are not shown

- **GIVEN** a category with no expenses or refunds in a given month
- **WHEN** viewing the monthly expense report
- **THEN** that category does not appear in the breakdown

### Requirement: Excluded Category Filtering in Reports

The system SHALL omit transactions belonging to categories marked "Exclude from reports" from all report totals and category breakdowns.

#### Scenario: Excluded category transactions do not appear in report totals

- **GIVEN** transactions in a category marked as excluded from reports
- **WHEN** viewing the monthly report
- **THEN** those transactions are excluded from income and expense totals
- AND the excluded category does not appear in the category breakdown

#### Scenario: Month with only excluded-category transactions shows zero

- **GIVEN** a month where all transactions belong to excluded categories
- **WHEN** viewing that month's report
- **THEN** the report shows zero income and zero expenses

### Requirement: Report Sort Controls

The system SHALL display sort chips above their corresponding table columns — the category sort chip above the Category Name column and the amount sort chip above the Percentage column.

#### Scenario: Sort chips are positioned above their corresponding columns

- **GIVEN** the user is viewing the monthly expense report table
- **WHEN** they look at the table header area
- **THEN** the "category" sort chip appears above the Category Name column
- AND the "amount" sort chip appears above the Percentage column

#### Scenario: Clicking a sort chip sorts the table by that column

- **GIVEN** the sort chips are visible
- **WHEN** the user clicks the "category" chip
- **THEN** the table is sorted alphabetically by category name
- AND the chip displays an active state

#### Scenario: Only one sort chip is active at a time

- **GIVEN** one sort chip is currently active
- **WHEN** the user clicks the other sort chip
- **THEN** the newly clicked chip becomes active and the previous chip becomes inactive

### Requirement: Category Expansion Responsive Layout

The system SHALL display the expanded transaction list within the category breakdown table without horizontal overflow on any screen size, including mobile and tablet viewports. Each transaction row SHALL always show the transaction date and amount in full — only the middle content (account, category, description) MAY be truncated when space is limited.

#### Scenario: Expanded category transactions fit within the card on mobile

- **GIVEN** a user is viewing the monthly expense report on a narrow screen (e.g., 360px–768px wide)
- **WHEN** they expand a category row to show its transactions
- **THEN** the transaction list SHALL be fully contained within the report card width with no horizontal overflow or scroll

#### Scenario: Date and amount are always visible on narrow screens

- **GIVEN** a user is viewing the monthly expense report on a narrow screen (e.g., 360px–768px wide)
- **WHEN** they expand a category row to show its transactions
- **THEN** each transaction SHALL display the full date and the full amount
- **AND** any middle content (account name, category, description) MAY be truncated with an ellipsis to fit the available width
