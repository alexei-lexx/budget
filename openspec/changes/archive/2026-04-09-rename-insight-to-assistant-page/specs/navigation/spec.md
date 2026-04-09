## MODIFIED Requirements

### Requirement: Section Navigation

The system SHALL provide a navigation menu with items in this order: Transactions, Accounts, Categories, Reports, Assistant, Settings.

#### Scenario: User navigates to a section via menu

- **GIVEN** an authenticated user on any page
- **WHEN** they click a section in the navigation menu
- **THEN** they are taken to that section's page without a full page reload

#### Scenario: Navigation menu items appear in the specified order

- **GIVEN** an authenticated user viewing the navigation menu
- **WHEN** they look at the menu items
- **THEN** the items appear in order: Transactions, Accounts, Categories, Reports, Assistant, Settings
