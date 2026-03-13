## ADDED Requirements

### Requirement: Category Expansion Responsive Layout

The system SHALL display the expanded transaction list within the category breakdown table without horizontal overflow on any screen size, including mobile and tablet viewports. Each transaction row SHALL always show the transaction date and amount in full — only the middle content (account, category, description) MAY be truncated when space is limited.

#### Scenario: Expanded category transactions fit within the card on mobile

- **GIVEN** a user is viewing the monthly expense report on a narrow screen (e.g., 360px–768px wide)
- **WHEN** they expand a category row to show its transactions
- **THEN** the transaction list SHALL be fully contained within the report card width with no horizontal overflow or scroll

#### Scenario: Date and amount are always visible on narrow screens

- **GIVEN** a user is viewing the monthly expense report on a narrow screen (e.g., 360px–768px wide)
- **WHEN** they expand a category row to show its transactions
- **THEN** each transaction SHALL display the full date and the full amount
- **AND** any middle content (account name, category, description) MAY be truncated with an ellipsis to fit the available width
