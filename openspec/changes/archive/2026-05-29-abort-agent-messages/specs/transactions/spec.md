## ADDED Requirements

### Requirement: Abort Natural Language Transaction Creation

The system SHALL allow the user to cancel an in-flight natural language transaction creation request at any time while the AI is processing.
When aborted, the system SHALL immediately return to idle state and no transaction SHALL be created.
The input text SHALL be preserved after abort so the user can edit and resubmit without retyping.

#### Scenario: Stop button appears while request is in progress

- **WHEN** a natural language transaction creation request is in flight
- **THEN** a stop button is displayed in place of the send button

#### Scenario: Clicking stop cancels the request and restores idle state

- **GIVEN** a natural language transaction creation request is in flight
- **WHEN** the user clicks the stop button
- **THEN** the request is cancelled, the loading indicator disappears, and the input is re-enabled

#### Scenario: Input text is preserved after abort

- **GIVEN** the user submitted natural language text and then aborted the request
- **WHEN** the abort completes
- **THEN** the input field still contains the text the user submitted

#### Scenario: No transaction is created when request is aborted

- **GIVEN** a natural language transaction creation request is in flight
- **WHEN** the user aborts the request
- **THEN** no transaction is added to the list

#### Scenario: Send button returns after abort

- **GIVEN** the user aborted a request
- **WHEN** the abort completes
- **THEN** the stop button is replaced by the send button, and the user can submit a new request
