## ADDED Requirements

### Requirement: Deleted Category in Category Breakdown

The system SHALL show the transactions of a deleted category in the category breakdown under the name of that category. The name of a deleted category SHALL have strikethrough styling. This SHALL apply to the monthly report and to the yearly report.

#### Scenario: Deleted category transactions appear under the category name

- **GIVEN** the category "Food" has expenses in the viewed month
- AND the user has deleted the category "Food"
- **WHEN** viewing the monthly expense report for that month
- **THEN** the category breakdown shows a row named "Food" with those expenses
- AND those expenses are not in the "Uncategorized" row

#### Scenario: Deleted category name has strikethrough styling

- **GIVEN** a deleted category has transactions in the viewed period
- **WHEN** viewing the report for that period
- **THEN** the name of the deleted category has strikethrough styling

#### Scenario: Deleted category name is identified as deleted

- **GIVEN** a deleted category "Food" has transactions in the viewed period
- **WHEN** the user points to the name of the deleted category
- **THEN** the hint "Deleted category" is shown in the language of the user

#### Scenario: Active and deleted categories with the same name show as two rows

- **GIVEN** an active category "Food" and a deleted category "Food"
- AND both categories have transactions in the viewed period
- **WHEN** viewing the report for that period
- **THEN** the category breakdown shows two rows named "Food"
- AND only the row of the deleted category has strikethrough styling

#### Scenario: Deleted category appears in the yearly report

- **GIVEN** a deleted category "Food" has expenses in the viewed year
- **WHEN** viewing the yearly expense report for that year
- **THEN** the category breakdown shows a row named "Food" with strikethrough styling

### Requirement: Uncategorized Row Label

The system SHALL show all transactions without a category in one row of the category breakdown. The label of this row SHALL be "Uncategorized" in the language of the user, in italic.

#### Scenario: Transactions without a category share one row

- **GIVEN** several expenses without a category in the viewed period
- **WHEN** viewing the report for that period
- **THEN** the category breakdown shows one row for all of these expenses

#### Scenario: Uncategorized label uses the language of the user

- **GIVEN** the language of the user is German
- AND the viewed period has expenses without a category
- **WHEN** viewing the report for that period
- **THEN** the label of the row for these expenses is "Unkategorisiert"

#### Scenario: Alphabetical sort uses the shown label

- **GIVEN** the language of the user is German
- AND the viewed period has expenses in the categories "Auto" and "Zoo" and expenses without a category
- **WHEN** the user sorts the table by category
- **THEN** the rows are in the order "Auto", "Unkategorisiert", "Zoo"
