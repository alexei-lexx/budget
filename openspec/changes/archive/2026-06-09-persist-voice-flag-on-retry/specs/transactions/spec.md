## ADDED Requirements

### Requirement: Voice Origin Preserved on Re-submission

The system SHALL retain the voice origin flag for a submission when the text was populated by voice and has not been subsequently modified by the user. When the initial voice-originated submission fails (e.g. due to a network error) and the user presses the submit button again without editing the text, the re-submission SHALL be treated as voice input and the AI agent SHALL apply the same voice amount-inference rules as for the original submission. If the user edits the text after the voice transcript was inserted — including correcting a single character — the voice origin flag SHALL be cleared and the re-submission SHALL be treated as keyboard input.

#### Scenario: Unedited voice input re-submitted with voice origin flag

- **GIVEN** the user submitted a voice transcript on the Transactions page and the submission failed
- **AND** the user has not edited the text since the transcript was inserted
- **WHEN** the user presses the submit button again
- **THEN** the submission is sent with the voice origin flag set
- **AND** the AI agent applies voice amount-inference rules

#### Scenario: Editing after voice input clears voice origin flag

- **GIVEN** the user submitted a voice transcript on the Transactions page and the submission failed
- **AND** the user has edited the text after the transcript was inserted
- **WHEN** the user presses the submit button again
- **THEN** the submission is sent without the voice origin flag
- **AND** the AI agent treats the amount as literal keyboard input

#### Scenario: Voice origin flag is cleared after a successful submission

- **GIVEN** the user submitted a voice transcript and the submission succeeded
- **WHEN** the user types new text and submits again
- **THEN** the new submission is treated as keyboard input, not voice input
