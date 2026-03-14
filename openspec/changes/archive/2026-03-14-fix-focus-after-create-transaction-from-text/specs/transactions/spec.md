## ADDED Requirements

### Requirement: Focus Restored After Natural Language Transaction Creation

The system SHALL return focus to the natural language text input field immediately after a transaction is successfully created, so the user can enter the next transaction without a manual click.

#### Scenario: Input receives focus after successful creation

- GIVEN the user submitted natural language text and a transaction was created
- WHEN the input field is cleared
- THEN the text input field automatically receives focus
