# UI Localization Specification

## Purpose

Provide a consistent localized interface for the application in English and German.

## Requirements

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

The system SHALL format dates and monetary amounts according to the browser locale independently of the user's selected interface language, except spelled-out date components such as month names, which SHALL follow the interface language as part of the localized interface text.

#### Scenario: Currency amount follows the browser locale

- **GIVEN** the browser locale is German and the user's interface language is English
- **WHEN** they view a transaction of 1234.5 EUR
- **THEN** the amount is displayed as "1.234,50 €", not "€1,234.50"

#### Scenario: Month name follows the interface language

- **GIVEN** the browser locale is English and the user's interface language is German
- **WHEN** they view the monthly report header for March 2024
- **THEN** it reads "März 2024", not "March 2024"

### Requirement: Preserve user-provided content

The system SHALL not translate user-provided or server-generated content while localizing the interface.

#### Scenario: User-provided names and descriptions remain unchanged

- **GIVEN** the user's interface language changes
- **WHEN** they view account names, category names, transaction descriptions, or assistant responses
- **THEN** those values remain exactly as provided

### Requirement: Language names shown in their own language

The system SHALL display language names in language-selection controls using each language's own name (autonym), independent of the user's selected interface language.

#### Scenario: Language picker labels are not translated into the interface language

- **GIVEN** the user's interface language is German
- **WHEN** they view a language-selection dropdown, such as the Interface language or Voice input language setting
- **THEN** each option is labeled with that language's own name (e.g. "English", "Français"), not a German translation of it
