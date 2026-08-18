## ADDED Requirements

### Requirement: Language names shown in their own language

The system SHALL display language names in language-selection controls using each language's own name (autonym), independent of the user's selected interface language.

#### Scenario: Language picker labels are not translated into the interface language

- **GIVEN** the user's interface language is German
- **WHEN** they view a language-selection dropdown, such as the Interface language or Voice input language setting
- **THEN** each option is labeled with that language's own name (e.g. "English", "Français"), not a German translation of it
