# User Settings Specification

## Purpose

This domain covers user-configurable application preferences: the Settings page where users view and update their preferences, voice input language selection for speech recognition, and the transaction shortcuts limit that controls how many quick-action buttons appear in the transaction form.

## Requirements

### Requirement: Settings Page Access

The system SHALL provide a Settings page accessible from the navigation menu.

#### Scenario: Authenticated user can open Settings

- GIVEN an authenticated user
- WHEN they click Settings in the navigation menu
- THEN they are taken to the Settings page

### Requirement: Settings Page Shows Current Values

The system SHALL load the user's current saved settings from the backend when the Settings page is opened and pre-populate the form fields with those values.

#### Scenario: Settings page shows previously saved values

- GIVEN a user who has previously saved a voice input language and shortcuts limit
- WHEN they open the Settings page
- THEN the voice input language dropdown shows their saved language and the shortcuts limit field shows their saved value

#### Scenario: Settings page shows defaults when no values have been saved

- GIVEN a user with no saved settings
- WHEN they open the Settings page
- THEN the voice input language dropdown shows the best match for the browser language from the supported language list, falling back to English (United States) if no match is found, and the shortcuts limit field shows the system default (3)

### Requirement: Voice Input Language Setting

The system SHALL provide a dropdown of common languages for voice input recognition, displaying human-readable language names without requiring additional packages. The selected language SHALL be saved to the backend and applied whenever voice input is used.

#### Scenario: Language dropdown shows human-readable names

- GIVEN the Settings page is open
- WHEN the user views the voice input language dropdown
- THEN each option displays a human-readable language name rendered in the user's browser language (e.g., "English", "Polski", "Deutsch" when the browser language is Polish)

#### Scenario: Selecting and saving a language applies it to voice input

- GIVEN the user selects a language from the dropdown and saves
- WHEN they use voice input on the Transactions or Insight page
- THEN speech recognition uses the selected language

#### Scenario: No saved language falls back to browser default

- GIVEN a user with no saved voice input language
- WHEN voice input is used
- THEN speech recognition uses the browser's default language

### Requirement: Transaction Shortcuts Limit Setting

The system SHALL provide a numeric input to configure the maximum number of transaction shortcut buttons shown in the transaction form. A hint text SHALL be displayed below the input to illustrate the feature (e.g., "Card + Groceries", "Cash + Transport").

#### Scenario: Hint text is shown below the shortcuts limit input

- GIVEN the Settings page is open
- WHEN the user views the shortcuts limit field
- THEN a hint text is displayed below it illustrating what transaction shortcuts look like

#### Scenario: User sets a shortcuts limit and it is applied

- GIVEN the user enters a number in the shortcuts limit field and saves
- WHEN they open the transaction form
- THEN at most that many shortcut buttons are shown

#### Scenario: Empty shortcuts limit uses the system default

- GIVEN a user with no saved shortcuts limit
- WHEN they open the transaction form
- THEN the default number of shortcuts (3) is displayed

### Requirement: Save Settings

The system SHALL persist all settings to the backend when the user submits the form and SHALL confirm success with a snackbar notification. On failure, an error snackbar SHALL be shown without clearing the form.

#### Scenario: Saving valid settings shows a success snackbar

- GIVEN the user has changed one or more settings
- WHEN they submit the form
- THEN the updated settings are persisted to the backend and a success snackbar is shown

#### Scenario: Backend failure shows an error snackbar

- GIVEN a backend error occurs during save
- WHEN the user submits the form
- THEN an error snackbar is shown and the form values are preserved unchanged
