## ADDED Requirements

### Requirement: Category Type Compatibility

The system SHALL keep the category of a transaction compatible with the transaction type. An income category accepts only income transactions. An expense category accepts only expense and refund transactions. The system SHALL check this rule on each create and each edit, also when the edit keeps the current category or the current category is deleted.

#### Scenario: Income transaction is rejected in an expense category

- **GIVEN** an expense category "Food"
- **WHEN** a client creates an income transaction in "Food"
- **THEN** the request fails with a category type mismatch error
- **AND** no transaction is created

#### Scenario: Type change with a new mismatched category is rejected

- **GIVEN** an expense transaction
- **WHEN** a client changes its type to income and sets the expense category "Food"
- **THEN** the request fails with a category type mismatch error
- **AND** the transaction is unchanged

#### Scenario: Type change that keeps a mismatched category is rejected

- **GIVEN** an expense transaction in the expense category "Food"
- **WHEN** a client changes its type to income and keeps the category
- **THEN** the request fails with a category type mismatch error
- **AND** the transaction keeps its expense type and its category "Food"
- **AND** the account balance is unchanged

#### Scenario: Type change that keeps a compatible category succeeds

- **GIVEN** an expense transaction in the expense category "Food"
- **WHEN** a client changes its type to refund and keeps the category
- **THEN** the transaction is saved as a refund in "Food"

#### Scenario: Type change with a new compatible category succeeds

- **GIVEN** an expense transaction in the expense category "Food"
- **WHEN** a client changes its type to income and sets the income category "Salary"
- **THEN** the transaction is saved as income in "Salary"

#### Scenario: Type change that removes the category succeeds

- **GIVEN** an expense transaction in the expense category "Food"
- **WHEN** a client changes its type to income and removes the category
- **THEN** the transaction is saved as income without a category

#### Scenario: Type change that keeps a deleted mismatched category is rejected

- **GIVEN** an expense transaction in the expense category "Food"
- **AND** the category "Food" is deleted
- **WHEN** a client changes its type to income and keeps the category
- **THEN** the request fails with a category type mismatch error
- **AND** the transaction is unchanged

#### Scenario: Type change that keeps a deleted compatible category succeeds

- **GIVEN** an expense transaction in the expense category "Food"
- **AND** the category "Food" is deleted
- **WHEN** a client changes its type to refund and keeps the category
- **THEN** the transaction is saved as a refund in the deleted category "Food"
