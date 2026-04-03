## MODIFIED Requirements

### Requirement: Question Submission

The system SHALL accept a free-form question and submit it to the AI agent, which answers it in context of prior exchanges within the current session. Submission SHALL be blocked when the question is empty.

#### Scenario: Empty question is blocked

- **GIVEN** the input field is empty or contains only whitespace
- **WHEN** the user attempts to submit
- **THEN** submission is prevented and no AI request is made

#### Scenario: Valid question triggers AI analysis

- **GIVEN** the user has entered a question
- **WHEN** they submit
- **THEN** the AI agent is invoked and a loading indicator is displayed

#### Scenario: Follow-up question is answered in context

- **GIVEN** the user has previously asked questions in the current session
- **WHEN** they submit a follow-up question
- **THEN** the AI agent answers it in context of the prior exchanges in that session

#### Scenario: Only recent exchanges are used as context

- **GIVEN** the user has had a long conversation in the current session
- **WHEN** they submit a new question
- **THEN** only the most recent exchanges are used as context for the AI agent

#### Scenario: Exchanges older than 24 hours are not used as context

- **GIVEN** some prior exchanges occurred more than 24 hours ago
- **WHEN** the user submits a new question
- **THEN** those older exchanges are not included in the context provided to the AI agent

### Requirement: Input Persistence

The system SHALL persist the question text, the last answer, the last agent trace, and the current session between visits, and restore them when the user returns to the Insight page.

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

- **GIVEN** a previous answer is available from a previous visit
- **WHEN** the user returns to the Insight page before submitting a new question
- **THEN** the empty state prompt SHALL NOT be displayed

#### Scenario: Session is resumed on page revisit

- **GIVEN** the user has had a conversation in the current session
- **WHEN** they navigate away and return to the Insight page
- **THEN** subsequent questions are answered in context of the prior exchanges from that session
