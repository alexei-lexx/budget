# Accounts Specification

## Purpose

This domain covers financial account management: creating accounts with a name, currency, and initial balance; editing and archiving accounts; calculating real-time balances based on transactions; and the expandable card UI pattern used to access account actions.

## Requirements

### Requirement: Account Creation

The system SHALL allow authenticated users to create financial accounts with a custom name, a selected currency, and an initial balance.

#### Scenario: User creates a new account

- **GIVEN** an authenticated user on the Accounts page
- **WHEN** they click "Add New Account", enter a name, select a currency, set an initial balance, and submit
- **THEN** the account is created and appears in the accounts list

### Requirement: Account Editing

The system SHALL allow users to edit an existing account's name and initial balance.

#### Scenario: User updates account details

- **GIVEN** an existing account
- **WHEN** the user edits the account name or initial balance and saves
- **THEN** the updated values are reflected immediately in the accounts list

### Requirement: Account Archiving

The system SHALL allow users to archive accounts, removing them from the active view while retaining all associated transactions.

#### Scenario: User archives an account

- **GIVEN** an account with transactions
- **WHEN** the user archives the account
- **THEN** the account is hidden from the main accounts view
- AND its associated transactions are preserved in the system

### Requirement: Account Listing

The system SHALL display all active accounts belonging to the authenticated user, with their names, currencies, and current balances.

#### Scenario: User views the accounts page

- **GIVEN** an authenticated user with multiple accounts
- **WHEN** they view the Accounts page
- **THEN** all active accounts are displayed with their names, currencies, and calculated balances

#### Scenario: No cross-user data is visible

- **GIVEN** multiple users in the system
- **WHEN** a user views the Accounts page
- **THEN** only their own accounts are displayed

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

### Requirement: Real-Time Balance Calculation

The system SHALL calculate each account's balance as: initial balance + INCOME + TRANSFER_IN + REFUND − EXPENSE − TRANSFER_OUT, updating immediately when transactions change.

#### Scenario: Balance reflects initial balance on a new account

- **GIVEN** a newly created account with an initial balance of $1000
- **WHEN** viewing the account
- **THEN** the balance shows $1000.00

#### Scenario: Balance increases when income is added

- **GIVEN** an account with an existing balance
- **WHEN** an INCOME transaction is added
- **THEN** the account balance immediately updates to include the income amount

#### Scenario: Balance can go negative

- **GIVEN** an account with a positive balance
- **WHEN** an EXPENSE transaction larger than the balance is added
- **THEN** the balance correctly shows a negative amount

#### Scenario: Balance recalculates when a transaction is deleted

- **GIVEN** an account with multiple transactions
- **WHEN** a transaction is deleted
- **THEN** the balance immediately recalculates without the deleted transaction

#### Scenario: Transfer amounts are reflected in both accounts

- **GIVEN** a TRANSFER_OUT on account A and TRANSFER_IN on account B
- **WHEN** viewing both accounts
- **THEN** account A balance is reduced by the transfer amount and account B balance is increased

### Requirement: Expandable Account Cards

The system SHALL display account cards in a collapsed state by default, revealing edit and delete actions only when the card is expanded by clicking.

#### Scenario: Account card is collapsed by default

- **GIVEN** a user viewing the accounts list
- **WHEN** a card is in its default state
- **THEN** only the account name and balance are visible, with no edit or delete buttons shown

#### Scenario: Clicking a collapsed card expands it

- **GIVEN** a collapsed account card
- **WHEN** the user clicks on the card
- **THEN** edit and delete buttons appear in the expanded area, aligned to the right

#### Scenario: Clicking an expanded card collapses it

- **GIVEN** an expanded account card
- **WHEN** the user clicks on the card body (not on action buttons)
- **THEN** the card returns to its collapsed state and action buttons are hidden

#### Scenario: Action button clicks do not collapse the card

- **GIVEN** an expanded account card
- **WHEN** the user clicks the edit or delete button
- **THEN** the respective action is triggered without collapsing the card

#### Scenario: Multiple cards expand independently

- **GIVEN** multiple account cards on the page
- **WHEN** the user expands one card
- **THEN** only that card expands; all other cards remain in their current state

### Requirement: Dialog Escape Key Dismissal

The system SHALL close any open account form dialog when the user presses Escape,
regardless of which element inside or around the dialog currently holds focus.

#### Scenario: Escape closes the dialog when a form field has focus

- **GIVEN** an account form dialog is open and an input field has focus
- **WHEN** the user presses Escape
- **THEN** the dialog closes and the accounts page is shown

#### Scenario: Escape closes the dialog after an outside-click attempt

- **GIVEN** an account form dialog is open
- AND the user has previously clicked outside the dialog (triggering the wobble animation)
- **WHEN** the user presses Escape
- **THEN** the dialog closes and the accounts page is shown

#### Scenario: Clicking outside the dialog does not close it

- **GIVEN** an account form dialog is open
- **WHEN** the user clicks on the page backdrop outside the dialog
- **THEN** the dialog remains open
- AND a wobble animation plays to indicate the dialog is persistent
