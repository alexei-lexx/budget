## MODIFIED Requirements

### Requirement: Multi-Currency Support

The system SHALL support any ISO 4217 currency code exposed by the runtime's internationalization data (including historical codes such as FRF and DEM), and SHALL allow accounts in different currencies to coexist without converting or mixing amounts between currencies.

#### Scenario: Any supported ISO 4217 currency is available

- **GIVEN** a user creating or editing an account
- **WHEN** they open the currency selector
- **THEN** every ISO 4217 currency code exposed by the runtime is available to pick

#### Scenario: Each account displays the correct currency symbol

- **GIVEN** accounts created in multiple currencies
- **WHEN** viewing the accounts list
- **THEN** each account displays its balance with the correct currency symbol

#### Scenario: Amounts are never converted between currencies

- **GIVEN** accounts in different currencies
- **WHEN** performing balance calculations
- **THEN** amounts are kept in their original currency and never converted

## ADDED Requirements

### Requirement: Personalized Currency Selection

The system SHALL personalize the currency selector in the account create and edit dialogs so that currencies the user already uses in their existing accounts appear at the top of the list, followed by the remaining currencies in alphabetical order.

#### Scenario: User with existing accounts sees their currencies first

- **GIVEN** an authenticated user with accounts in USD and CHF
- **WHEN** they open the currency selector in the new-account or edit-account dialog
- **THEN** USD and CHF appear at the top of the list (alphabetical among themselves)
- **AND** the remaining currencies follow in alphabetical order

#### Scenario: User's currencies are deduplicated in the list

- **GIVEN** a user with three accounts — two in EUR and one in JPY
- **WHEN** they open the currency selector
- **THEN** EUR appears once, not twice, in the top section

#### Scenario: New user with no accounts sees alphabetical list

- **GIVEN** an authenticated user with no accounts
- **WHEN** they open the new-account dialog
- **THEN** the currency list is presented in alphabetical order with no top section

### Requirement: Default Currency in New-Account Dialog

The system SHALL pre-select a default currency when the new-account dialog opens. When the user already has one or more accounts, the default SHALL be the first currency in the personalized list (i.e. an alphabetically-first currency already used by the user). When the user has no accounts, the default SHALL be the first currency in the alphabetical list.

#### Scenario: User with accounts opens the new-account dialog

- **GIVEN** an authenticated user whose accounts use CHF and USD
- **WHEN** they open the new-account dialog
- **THEN** CHF is selected by default

#### Scenario: User without accounts opens the new-account dialog

- **GIVEN** an authenticated user with no accounts
- **WHEN** they open the new-account dialog
- **THEN** the alphabetically-first available currency is selected by default

### Requirement: Current Currency Pre-Selected on Edit

The system SHALL pre-select the account's existing currency when the edit-account dialog opens.

#### Scenario: User edits an existing account

- **GIVEN** an existing account denominated in GBP
- **WHEN** the user opens the edit-account dialog for that account
- **THEN** GBP is selected in the currency field

### Requirement: Searchable Currency Selector

The system SHALL allow the user to narrow the currency list by typing in the currency selector, matching against currency codes.

#### Scenario: User searches by currency code

- **GIVEN** the currency selector is open
- **WHEN** the user types `JP`
- **THEN** the list narrows to currency codes starting with or containing `JP` (e.g. JPY)

#### Scenario: Typed search returns no matches

- **GIVEN** the currency selector is open
- **WHEN** the user types a string that matches no currency code
- **THEN** the list shows an empty state and no currency is selectable
