## MODIFIED Requirements

### Requirement: Excluded Category Filtering in Reports

The system SHALL omit transactions belonging to categories marked "Exclude from reports" from all report totals and category breakdowns. This SHALL apply to deleted categories in the same way as to active categories.

#### Scenario: Excluded category transactions do not appear in report totals

- **GIVEN** transactions in a category marked as excluded from reports
- **WHEN** viewing the monthly report
- **THEN** those transactions are excluded from income and expense totals
- AND the excluded category does not appear in the category breakdown

#### Scenario: Month with only excluded-category transactions shows zero

- **GIVEN** a month where all transactions belong to excluded categories
- **WHEN** viewing that month's report
- **THEN** the report shows zero income and zero expenses

#### Scenario: Deleted excluded category transactions do not appear in the report

- **GIVEN** a category marked as excluded from reports
- AND the user has deleted that category
- AND the category has transactions in the viewed period
- **WHEN** viewing the report for that period
- **THEN** those transactions are excluded from the totals
- AND they do not appear in any row of the category breakdown, including "Uncategorized"
