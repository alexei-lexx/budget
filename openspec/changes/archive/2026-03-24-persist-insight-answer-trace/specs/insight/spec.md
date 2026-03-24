## MODIFIED Requirements

### Requirement: Input Persistence

The system SHALL persist the question text, the last answer, and the last agent trace in local storage and restore them when the user returns to the Insight page.

#### Scenario: Stored question is restored on page revisit

- **GIVEN** the user previously entered a question
- **WHEN** they navigate away and return to the Insight page
- **THEN** the question field is restored to its previous value

#### Scenario: Stored answer is restored on page revisit

- **GIVEN** the user previously received an answer
- **WHEN** they navigate away and return to the Insight page
- **THEN** the last answer is displayed without requiring re-submission

#### Scenario: Stored agent trace is restored on page revisit

- **GIVEN** the user previously received an answer with an agent trace
- **WHEN** they navigate away and return to the Insight page
- **THEN** the agent trace trigger button is enabled and opens the trace from the last response

#### Scenario: Empty state is not shown when a stored answer exists

- **GIVEN** a previous answer is available in local storage
- **WHEN** the user returns to the Insight page before submitting a new question
- **THEN** the empty state prompt SHALL NOT be displayed
