## MODIFIED Requirements

### Requirement: Month Navigation

The system SHALL allow users to navigate between months using Previous and Next controls when in monthly view mode. Navigation to future months is permitted.

#### Scenario: User navigates to the previous month

- **GIVEN** the user is viewing a monthly expense report
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

## ADDED Requirements

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
