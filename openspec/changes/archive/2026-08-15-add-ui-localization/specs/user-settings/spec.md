## ADDED Requirements

### Requirement: Interface Language Setting

The system SHALL provide an Interface language selector on the Settings page with English and German options. The selected interface language SHALL be stored with the user's account independently of the voice input language.

#### Scenario: User selects an interface language

- **GIVEN** an authenticated user on the Settings page
- **WHEN** they select German as the interface language and save their settings
- **THEN** German is stored as their interface-language preference without changing their voice input language

#### Scenario: Saved interface language is restored

- **GIVEN** a user has saved German as their interface language
- **WHEN** they sign in on any device
- **THEN** the application uses German as the interface language

#### Scenario: Interface language defaults to English

- **GIVEN** a user has not saved an interface-language preference
- **WHEN** they sign in or open Settings
- **THEN** English is used and shown as the interface language

#### Scenario: Interface language changes immediately after saving

- **GIVEN** an authenticated user is using the application in English
- **WHEN** they save German as the interface language
- **THEN** the application interface changes to German without requiring another sign-in

## MODIFIED Requirements

### Requirement: Voice Input Language Setting

The system SHALL provide a dropdown of common languages for voice input recognition, displaying human-readable language names without requiring additional packages. The selected language SHALL be saved to the backend and applied whenever voice input is used.

#### Scenario: Language dropdown shows human-readable names

- **GIVEN** the Settings page is open
- **WHEN** the user views the voice input language dropdown
- **THEN** each option displays a human-readable language name rendered in the user's selected interface language

#### Scenario: Selecting and saving a language applies it to voice input

- **GIVEN** the user selects a language from the dropdown and saves
- **WHEN** they use voice input on the Transactions or Assistant page
- **THEN** speech recognition uses the selected language

#### Scenario: No saved language falls back to browser default

- **GIVEN** a user with no saved voice input language
- **WHEN** voice input is used
- **THEN** speech recognition uses the browser's default language
