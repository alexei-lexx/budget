## MODIFIED Requirements

### Requirement: Agent Trace Trigger Button

The system SHALL display a trigger button near the send button on each AI-powered page. The trigger button SHALL always be visible but disabled before any request has been made and while a request is in progress. It SHALL become enabled once any response has been received — whether successful or failed — and remain enabled until the next request begins.

#### Scenario: Trigger button is disabled before the first request

- **WHEN** the user opens an AI-powered page and has not yet submitted a request
- **THEN** the trigger button is visible but disabled

#### Scenario: Trigger button becomes enabled after a successful response

- **WHEN** the AI response completes successfully
- **THEN** the trigger button becomes enabled near the send button

#### Scenario: Trigger button becomes enabled after a failed response

- **WHEN** the AI response completes with a failure
- **THEN** the trigger button becomes enabled near the send button

#### Scenario: Trigger button is disabled while a request is in progress

- **WHEN** the user submits a new request and the AI is processing
- **THEN** the trigger button is visible but disabled

#### Scenario: Trigger button re-enables after subsequent responses

- **WHEN** the user submits a second request and the AI responds
- **THEN** the trigger button is enabled and reflects the latest response trace
