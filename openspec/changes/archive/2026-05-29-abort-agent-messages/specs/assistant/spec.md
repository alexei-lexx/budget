## ADDED Requirements

### Requirement: Abort Assistant Request

The system SHALL allow the user to cancel an in-flight assistant request at any time while the AI is processing.
When aborted, the system SHALL immediately return to idle state and preserve any previously displayed answer.
The input text SHALL be preserved after abort so the user can edit and resubmit without retyping.

#### Scenario: Stop button appears while request is in progress

- **WHEN** an assistant request is in flight
- **THEN** a stop button is displayed in place of the send button

#### Scenario: Clicking stop cancels the request and restores idle state

- **GIVEN** an assistant request is in flight
- **WHEN** the user clicks the stop button
- **THEN** the request is cancelled, the loading indicator disappears, and the input is re-enabled

#### Scenario: Input text is preserved after abort

- **GIVEN** the user submitted a question and then aborted the request
- **WHEN** the abort completes
- **THEN** the input field still contains the question the user submitted

#### Scenario: Previously displayed answer is not cleared on abort

- **GIVEN** a previous answer is displayed and a new request is in flight
- **WHEN** the user aborts the new request
- **THEN** the previously displayed answer remains visible

#### Scenario: Send button returns after abort

- **GIVEN** the user aborted a request
- **WHEN** the abort completes
- **THEN** the stop button is replaced by the send button, and the user can submit a new request
