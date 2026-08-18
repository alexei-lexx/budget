## MODIFIED Requirements

### Requirement: Expandable Transaction Cards

The system SHALL display transaction cards in a collapsed state by default, expanding on click to reveal the description and action buttons, with multiple cards expandable independently.

#### Scenario: Collapsed card shows essential information only

- **GIVEN** a transaction card in its default collapsed state
- **WHEN** the user views the transactions list
- **THEN** only the transaction date, account name, category name, and signed amount are visible

#### Scenario: Clicking a collapsed card expands it

- **GIVEN** a collapsed transaction card
- **WHEN** the user clicks on it
- **THEN** the card expands showing the full description above the edit/delete buttons

#### Scenario: Clicking an expanded card collapses it

- **GIVEN** an expanded transaction card
- **WHEN** the user clicks on the card body (not on action buttons)
- **THEN** the card collapses back to showing only the essential information

#### Scenario: Action button clicks do not collapse the card

- **GIVEN** an expanded transaction card
- **WHEN** the user clicks the edit or delete button
- **THEN** the respective action is triggered and the card remains expanded

#### Scenario: Long descriptions wrap without truncation in expanded view

- **GIVEN** an expanded transaction card with a long description
- **WHEN** the description is displayed in the expanded section
- **THEN** the full text wraps to multiple lines without truncation

#### Scenario: Action buttons stay below the description when it wraps

- **GIVEN** an expanded transaction card with a description long enough to wrap onto multiple lines
- **WHEN** the description is displayed
- **THEN** the action buttons appear in their own row below the full description, not beside any line of it

#### Scenario: Layout stays stacked at every screen width

- **GIVEN** an expanded transaction card
- **WHEN** viewed at any screen width, from mobile to desktop
- **THEN** the description remains above the action buttons with no side-by-side arrangement at any width

#### Scenario: Multiple cards can be expanded simultaneously

- **GIVEN** multiple transaction cards on the page
- **WHEN** the user expands several cards
- **THEN** each expanded card maintains its expanded state independently
