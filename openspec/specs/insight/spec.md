# Insight Specification

## Purpose

This domain covers AI-powered financial Q&A: users ask free-form questions about their finances within a specified date range, and an AI agent queries their accounts, categories, and transactions to compute a plain-text answer. It includes date range selection with presets, input persistence, validation, and response display.

## Requirements

### Requirement: Date Range Selection

The system SHALL provide preset date range options (This Month, Previous Month, Last 3 Months, Last 6 Months, Last 12 Months, This Year, Previous Year, Custom) that automatically populate start and end dates, and SHALL reveal manual date input fields when Custom is selected.

#### Scenario: Selecting a preset populates the date range

- GIVEN the user is on the Insight page
- WHEN they select a preset such as "Last 3 Months"
- THEN the start and end dates are automatically calculated and applied

#### Scenario: Selecting Custom reveals date input fields

- GIVEN the user selects the Custom preset
- WHEN the preset changes
- THEN start and end date input fields appear for manual entry

#### Scenario: Switching away from Custom hides the date inputs

- GIVEN the user previously selected Custom and manual date fields are visible
- WHEN they select any other preset
- THEN the manual date input fields are hidden and dates are recalculated from the preset

### Requirement: Question Submission

The system SHALL accept a free-form question and submit it together with the selected date range to the AI agent. Submission SHALL be blocked when the question is empty or the date range is invalid.

#### Scenario: Empty question is blocked

- GIVEN the input field is empty or contains only whitespace
- WHEN the user attempts to submit
- THEN submission is prevented and no AI request is made

#### Scenario: Missing date fields are rejected

- GIVEN the Custom preset is selected and one or both date fields are empty
- WHEN the user attempts to submit
- THEN an error message is shown and no AI request is made

#### Scenario: Start date after end date is rejected

- GIVEN a date range where the start date is later than the end date
- WHEN the user attempts to submit
- THEN an error message is shown and no AI request is made

#### Scenario: Date range exceeding 365 days is rejected

- GIVEN a date range spanning more than 365 days
- WHEN the user submits a question
- THEN the system rejects the request with an error indicating the limit

#### Scenario: Valid question and date range triggers AI analysis

- GIVEN the user has entered a question and selected a valid date range
- WHEN they submit
- THEN the AI agent is invoked and a loading indicator is displayed

### Requirement: Input Persistence

The system SHALL persist the question text, selected date range preset, and any custom dates in local storage and restore them when the user returns to the Insight page.

#### Scenario: Stored values are restored on page revisit

- GIVEN the user previously entered a question and selected a preset
- WHEN they navigate away and return to the Insight page
- THEN the question field and date range preset are restored to their previous values

### Requirement: AI-Powered Financial Analysis

The system SHALL use an AI agent with access to the user's accounts, categories, and transactions to answer the question. The agent SHALL only query transactions within the selected date range and MAY perform sum, average, and arithmetic calculations.

#### Scenario: Agent retrieves data and answers the question

- GIVEN the user asks "What did I spend on food last month?" with a valid date range
- WHEN the AI agent processes the question
- THEN it queries the relevant transactions and returns a plain-text answer summarising the result

#### Scenario: Agent can access both active and archived accounts and categories

- GIVEN the user has archived accounts or categories that have associated transactions
- WHEN the AI agent retrieves data to answer a question
- THEN it can access archived entities to ensure complete and accurate answers

### Requirement: Plain Text Response Display

The system SHALL display the AI's answer as plain text, preserving whitespace and line breaks. Markdown formatting SHALL NOT be rendered.

#### Scenario: Answer is displayed as plain text

- GIVEN the AI has returned an answer
- WHEN the response is shown
- THEN the text appears as-is with whitespace and line breaks preserved, without any markdown rendering

### Requirement: Empty and Loading States

The system SHALL display an empty state prompt before any question has been asked, and a loading indicator while the AI is processing a question.

#### Scenario: Empty state is shown before the first question

- GIVEN the user opens the Insight page for the first time
- WHEN no question has been submitted yet
- THEN an empty state is displayed prompting the user to ask a question

#### Scenario: Loading indicator is shown during AI processing

- GIVEN the user has submitted a valid question
- WHEN the AI is processing
- THEN a loading indicator is displayed in place of the answer area

### Requirement: Error Handling

The system SHALL display an error message when the AI fails to return an answer, without clearing the user's question or date range inputs.

#### Scenario: AI failure shows an error message

- GIVEN the user submits a valid question
- WHEN the AI service fails or returns an error
- THEN an error message is displayed and the question and date range inputs remain unchanged

### Requirement: Agent Trace Access on Insight Page

The system SHALL expose the agent trace for each insight response via the insight GraphQL query. A trigger button SHALL always be visible near the question submit button, starting disabled, and becoming enabled after each completed response — success or failure — to give the user access to the agent trace panel for that response.

#### Scenario: Trace is available after asking a question successfully

- **WHEN** the user submits a question and the AI responds successfully
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trace is available after a failed insight response

- **WHEN** the user submits a question and the AI response fails
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trigger button is positioned near the submit button

- **WHEN** the insight page is viewed after a response has been received
- **THEN** the trigger button is displayed in the same area as the question submit button
