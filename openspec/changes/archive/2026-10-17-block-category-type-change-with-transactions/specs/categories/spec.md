## MODIFIED Requirements

### Requirement: Category Editing

The system SHALL allow users to edit an existing category's name. The system SHALL allow users to change a category's type only while the category has no active transactions.

#### Scenario: User renames a category

- **GIVEN** an existing category
- **WHEN** the user edits the category name and saves
- **THEN** the updated name is reflected in all transaction forms that reference it

#### Scenario: User changes the type of a category without transactions

- **GIVEN** an expense category with no active transactions
- **WHEN** the user changes its type to income and saves
- **THEN** the category is saved as an income category
- **AND** it appears in the Income section

#### Scenario: Type change is rejected for a category with active transactions

- **GIVEN** an expense category with an active expense transaction
- **WHEN** the user changes its type to income and saves
- **THEN** the change is rejected
- **AND** an error message tells the user that the category has transactions
- **AND** the category keeps its expense type

#### Scenario: Deleted transactions do not block a type change

- **GIVEN** an expense category whose transactions are all deleted
- **WHEN** the user changes its type to income and saves
- **THEN** the category is saved as an income category

#### Scenario: Other edits still succeed on a category with active transactions

- **GIVEN** a category with active transactions
- **WHEN** the user changes its name or its "Exclude from reports" option and keeps its type
- **THEN** the change is saved
