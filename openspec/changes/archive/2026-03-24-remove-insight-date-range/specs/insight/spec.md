## REMOVED Requirements

### Requirement: Date Range Selection

**Reason**: The AI agent now infers the date range from the question or defaults to the current month. Explicit selection is unnecessary friction.
**Migration**: No migration needed. The agent handles time context autonomously.

## MODIFIED Requirements

### Requirement: Question Submission

The system SHALL accept a free-form question and submit it to the AI agent. Submission SHALL be blocked when the question is empty.

#### Scenario: Empty question is blocked

- GIVEN the input field is empty or contains only whitespace
- WHEN the user attempts to submit
- THEN submission is prevented and no AI request is made

#### Scenario: Valid question triggers AI analysis

- GIVEN the user has entered a question
- WHEN they submit
- THEN the AI agent is invoked and a loading indicator is displayed

### Requirement: Input Persistence

The system SHALL persist the question text in local storage and restore it when the user returns to the Insight page.

#### Scenario: Stored question is restored on page revisit

- GIVEN the user previously entered a question
- WHEN they navigate away and return to the Insight page
- THEN the question field is restored to its previous value

### Requirement: AI-Powered Financial Analysis

The system SHALL use an AI agent with access to the user's accounts, categories, and transactions to answer the question. The agent SHALL infer the relevant date range from the question when querying transactions, defaulting to the current month when no time period is specified. When the agent assumes a time period, it SHALL state it in the answer. The agent MAY perform sum, average, and arithmetic calculations.

#### Scenario: Agent infers the date range from the question

- GIVEN the user asks a question with a time reference (e.g. "What did I spend on food last month?")
- WHEN the AI agent processes the question
- THEN it determines the appropriate date range from the question and queries matching transactions

#### Scenario: Agent defaults to current month when no time period is specified

- GIVEN the user asks a question with no time reference (e.g. "What did I spend the most on?")
- WHEN the AI agent processes the question
- THEN it uses the current month as the date range

#### Scenario: Agent states the assumed date range in the answer

- GIVEN the agent assumed a time period because the question did not specify one
- WHEN the answer is returned
- THEN the answer includes the date range the agent assumed

#### Scenario: Agent can access both active and archived accounts and categories

- GIVEN the user has archived accounts or categories that have associated transactions
- WHEN the AI agent retrieves data to answer a question
- THEN it can access archived entities to ensure complete and accurate answers

### Requirement: Error Handling

The system SHALL display an error message when the AI fails to return an answer, without clearing the user's question.

#### Scenario: AI failure shows an error message

- GIVEN the user submits a valid question
- WHEN the AI service fails or returns an error
- THEN an error message is displayed and the question input remains unchanged
