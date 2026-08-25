## MODIFIED Requirements

### Requirement: Filter Panel Access

The system SHALL provide a Filter toggle button in the Transactions page header action bar, positioned before the "Add Transaction" and "Add Transfer" buttons. The filter panel SHALL be hidden by default and toggled by clicking the Filter button. When the header action bar's buttons do not fit on one line, the row SHALL wrap onto additional lines instead of overflowing or hiding a button.

#### Scenario: Filter button opens the panel

- **GIVEN** the filter panel is closed
- **WHEN** the user clicks the Filter button
- **THEN** the filter panel expands inline below the page header

#### Scenario: Filter button closes the panel

- **GIVEN** the filter panel is open
- **WHEN** the user clicks the Filter button again
- **THEN** the filter panel collapses

#### Scenario: Filter button shows active-filter indicator when filters are applied

- **GIVEN** one or more filters are currently applied
- **WHEN** the user views the Transactions page header
- **THEN** the Filter button displays a dot badge indicating active filters

#### Scenario: Filter button dot badge is absent when no filters are applied

- **GIVEN** no filters are currently applied
- **WHEN** the user views the Transactions page header
- **THEN** the Filter button displays no badge

#### Scenario: Filter button is responsive

- **GIVEN** the user is on a screen 600 pixels wide or wider
- **WHEN** the user views the Transactions page header
- **THEN** the Filter button shows a label and an icon

#### Scenario: Filter button is icon-only on mobile

- **GIVEN** the user is on a screen narrower than 600 pixels
- **WHEN** the user views the Transactions page header
- **THEN** the Filter button shows only an icon with an accessible aria-label

#### Scenario: Header action bar wraps when buttons do not fit on one line

- **GIVEN** the Filter, Add Transaction, and Add Transfer buttons together are wider than the header
- **WHEN** the user views the Transactions page header
- **THEN** the buttons wrap onto a second line and every button remains visible
