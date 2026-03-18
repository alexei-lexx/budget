## ADDED Requirements

### Requirement: Voice Input for Natural Language Transaction Creation

The system SHALL provide a mic button inside the natural language text input area that captures speech via the browser's Web Speech API and auto-submits the transcript to the existing transaction creation pipeline. The mic button SHALL only appear on devices where the Web Speech API is supported.

#### Scenario: Mic button is visible when Web Speech API is supported

- **GIVEN** the user is on the Transactions page
- **WHEN** the browser supports the Web Speech API
- **THEN** a mic button is displayed inside the natural language text input area

#### Scenario: Mic button is hidden when Web Speech API is not supported

- **GIVEN** the user is on the Transactions page
- **WHEN** the browser does not support the Web Speech API
- **THEN** no mic button is displayed and the input area remains fully functional for keyboard input

#### Scenario: Tapping the mic starts recording

- **GIVEN** the mic button is visible and idle
- **WHEN** the user taps the mic button
- **THEN** the browser requests microphone permission if not already granted and speech recognition begins

#### Scenario: Mic icon pulses red while recording

- **GIVEN** speech recognition is active
- **WHEN** the user views the mic button
- **THEN** the mic icon is displayed in red with a pulsing animation to indicate active listening

#### Scenario: Recording auto-stops after silence

- **GIVEN** speech recognition is active
- **WHEN** the user stops speaking and a pause is detected
- **THEN** speech recognition stops automatically without requiring a manual tap to stop

#### Scenario: Transcript is auto-submitted

- **GIVEN** speech recognition has produced a non-empty transcript
- **WHEN** recognition ends
- **THEN** the transcript is submitted to the natural language transaction creation pipeline identically to a keyboard submission

#### Scenario: Empty transcript returns to idle silently

- **GIVEN** speech recognition ends with no detected speech
- **WHEN** the transcript is empty
- **THEN** the mic button returns to its idle state and no error or notification is shown to the user

#### Scenario: Mic button and text input are disabled during AI inference

- **GIVEN** a voice transcript has been submitted and AI inference is in progress
- **WHEN** the user views the input area
- **THEN** the mic button and text input are disabled until inference completes
