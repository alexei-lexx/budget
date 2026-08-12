## Purpose

Provide a consistent localized interface for the application in English and German.

## ADDED Requirements

### Requirement: Localized application interface

The system SHALL present all client-owned visible and accessible interface text in the user's selected interface language. English and German SHALL be available interface languages.

#### Scenario: User views the interface in English

- **GIVEN** the user's interface language is English
- **WHEN** they use any application page or control
- **THEN** client-owned labels, actions, help text, dialogs, empty states, notifications, validation messages, and accessible labels are displayed in English

#### Scenario: User views the interface in German

- **GIVEN** the user's interface language is German
- **WHEN** they use any application page or control
- **THEN** client-owned labels, actions, help text, dialogs, empty states, notifications, validation messages, and accessible labels are displayed in German

### Requirement: Browser-locale financial and date formatting

The system SHALL format dates and monetary amounts according to the browser locale independently of the user's selected interface language.

#### Scenario: Browser locale is German while interface language is English

- **GIVEN** the browser locale is German and the user's interface language is English
- **WHEN** they view a date or monetary amount in the application
- **THEN** the value is displayed using German locale conventions

#### Scenario: Browser locale is United States English while interface language is German

- **GIVEN** the browser locale is United States English and the user's interface language is German
- **WHEN** they view a date or monetary amount in the application
- **THEN** the value is displayed using United States English (`en-US`) locale conventions

### Requirement: Preserve user-provided content

The system SHALL not translate user-provided or server-generated content while localizing the interface.

#### Scenario: User-provided names and descriptions remain unchanged

- **GIVEN** the user's interface language changes
- **WHEN** they view account names, category names, transaction descriptions, or assistant responses
- **THEN** those values remain exactly as provided
