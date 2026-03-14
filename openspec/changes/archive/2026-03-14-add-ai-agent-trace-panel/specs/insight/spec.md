## ADDED Requirements

### Requirement: Agent Trace Access on Insight Page

The system SHALL expose the agent trace for each insight response via the insight GraphQL query. A trigger button SHALL always be visible near the question submit button, starting disabled, and becoming enabled after each successful response to give the user access to the agent trace panel for that response.

#### Scenario: Trace is available after asking a question

- **WHEN** the user submits a question and the AI responds successfully
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trigger button is positioned near the submit button

- **WHEN** the insight page is viewed after a response has been received
- **THEN** the trigger button is displayed in the same area as the question submit button
