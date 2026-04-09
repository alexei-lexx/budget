## MODIFIED Requirements

### Requirement: Input Persistence

The system SHALL persist the question text, the last answer, the last agent trace, and the current session between visits, and restore them when the user returns to the Assistant page.

#### Scenario: Stored question is restored on page revisit

- **GIVEN** the user previously entered a question
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the question field is restored to its previous value

#### Scenario: Stored answer is restored on page revisit

- **GIVEN** the user previously received an answer
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the last answer is displayed without requiring re-submission

#### Scenario: Stored agent trace is restored on page revisit

- **GIVEN** the user previously received an answer with an agent trace
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the agent trace trigger button is enabled and opens the trace from the last response

#### Scenario: Empty state is not shown when a stored answer exists

- **GIVEN** a previous answer is available from a previous visit
- **WHEN** the user returns to the Assistant page before submitting a new question
- **THEN** the empty state prompt SHALL NOT be displayed

#### Scenario: Session is resumed on page revisit

- **GIVEN** the user has had a conversation in the current session
- **WHEN** they navigate away and return to the Assistant page
- **THEN** subsequent questions are answered in context of the prior exchanges from that session

### Requirement: Empty and Loading States

The system SHALL display an empty state prompt before any question has been asked, and a loading indicator while the AI is processing a question.

#### Scenario: Empty state is shown before the first question

- **GIVEN** the user opens the Assistant page for the first time
- **WHEN** no question has been submitted yet
- **THEN** an empty state is displayed prompting the user to ask a question

#### Scenario: Loading indicator is shown during AI processing

- **GIVEN** the user has submitted a valid question
- **WHEN** the AI is processing
- **THEN** a loading indicator is displayed in place of the answer area

### Requirement: Agent Trace Access on Assistant Page

The system SHALL expose the agent trace for each assistant response via the assistant GraphQL mutation. A trigger button SHALL always be visible near the question submit button, starting disabled, and becoming enabled after each completed response — success or failure — to give the user access to the agent trace panel for that response.

#### Scenario: Trace is available after asking a question successfully

- **WHEN** the user submits a question and the AI responds successfully
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trace is available after a failed assistant response

- **WHEN** the user submits a question and the AI response fails
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trigger button is positioned near the submit button

- **WHEN** the assistant page is viewed after a response has been received
- **THEN** the trigger button is displayed in the same area as the question submit button

### Requirement: Voice Input for Assistant Query

The system SHALL provide a mic button inside the natural language text input area on the Assistant page that captures speech via the browser's Web Speech API and auto-submits the transcript to the existing assistant query pipeline. The mic button SHALL only appear on devices where the Web Speech API is supported. Speech recognition SHALL use the user's saved voice input language when set, falling back to the browser's default language when not set.

#### Scenario: Mic button is visible when Web Speech API is supported

- **GIVEN** the user is on the Assistant page
- **WHEN** the browser supports the Web Speech API
- **THEN** a mic button is displayed inside the natural language text input area

#### Scenario: Mic button is hidden when Web Speech API is not supported

- **GIVEN** the user is on the Assistant page
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
- **THEN** the transcript is submitted to the assistant query pipeline identically to a keyboard submission

#### Scenario: Empty transcript returns to idle silently

- **GIVEN** speech recognition ends with no detected speech
- **WHEN** the transcript is empty
- **THEN** the mic button returns to its idle state and no error or notification is shown to the user

#### Scenario: Tapping the mic does not open the virtual keyboard

- **GIVEN** the user is on a mobile device
- **WHEN** the user taps the mic button (regardless of whether the textarea has focus)
- **THEN** the virtual keyboard does not open

#### Scenario: Mic button and text input are disabled during AI inference

- **GIVEN** a voice transcript has been submitted and AI inference is in progress
- **WHEN** the user views the input area
- **THEN** the mic button and text input are disabled until inference completes

#### Scenario: Voice input uses the user's saved language

- **GIVEN** the user has saved a voice input language in Settings
- **WHEN** they tap the mic button on the Assistant page
- **THEN** speech recognition uses the saved language

#### Scenario: Voice input falls back to browser language when none is saved

- **GIVEN** the user has not saved a voice input language
- **WHEN** they tap the mic button on the Assistant page
- **THEN** speech recognition uses the browser's default language
