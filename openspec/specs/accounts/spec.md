# Accounts Specification

## Purpose
This domain covers financial account management: creating accounts with a name, currency, and initial balance; editing and archiving accounts; calculating real-time balances based on transactions; and the expandable card UI pattern used to access account actions.

## Requirements

### Requirement: Account Creation
The system SHALL allow authenticated users to create financial accounts with a custom name, a selected currency, and an initial balance.

#### Scenario: User creates a new account
- GIVEN an authenticated user on the Accounts page
- WHEN they click "Add New Account", enter a name, select a currency, set an initial balance, and submit
- THEN the account is created and appears in the accounts list

### Requirement: Account Editing
The system SHALL allow users to edit an existing account's name and initial balance.

#### Scenario: User updates account details
- GIVEN an existing account
- WHEN the user edits the account name or initial balance and saves
- THEN the updated values are reflected immediately in the accounts list

### Requirement: Account Archiving
The system SHALL allow users to archive accounts, removing them from the active view while retaining all associated transactions.

#### Scenario: User archives an account
- GIVEN an account with transactions
- WHEN the user archives the account
- THEN the account is hidden from the main accounts view
- AND its associated transactions are preserved in the system

### Requirement: Account Listing
The system SHALL display all active accounts belonging to the authenticated user, with their names, currencies, and current balances.

#### Scenario: User views the accounts page
- GIVEN an authenticated user with multiple accounts
- WHEN they view the Accounts page
- THEN all active accounts are displayed with their names, currencies, and calculated balances

#### Scenario: No cross-user data is visible
- GIVEN multiple users in the system
- WHEN a user views the Accounts page
- THEN only their own accounts are displayed

### Requirement: Multi-Currency Support
The system SHALL allow accounts in different currencies to coexist without converting or mixing amounts between currencies.

#### Scenario: Each account displays the correct currency symbol
- GIVEN accounts created in multiple currencies
- WHEN viewing the accounts list
- THEN each account displays its balance with the correct currency symbol

#### Scenario: Amounts are never converted between currencies
- GIVEN accounts in different currencies
- WHEN performing balance calculations
- THEN amounts are kept in their original currency and never converted

### Requirement: Real-Time Balance Calculation
The system SHALL calculate each account's balance as: initial balance + INCOME + TRANSFER_IN + REFUND − EXPENSE − TRANSFER_OUT, updating immediately when transactions change.

#### Scenario: Balance reflects initial balance on a new account
- GIVEN a newly created account with an initial balance of $1000
- WHEN viewing the account
- THEN the balance shows $1000.00

#### Scenario: Balance increases when income is added
- GIVEN an account with an existing balance
- WHEN an INCOME transaction is added
- THEN the account balance immediately updates to include the income amount

#### Scenario: Balance can go negative
- GIVEN an account with a positive balance
- WHEN an EXPENSE transaction larger than the balance is added
- THEN the balance correctly shows a negative amount

#### Scenario: Balance recalculates when a transaction is deleted
- GIVEN an account with multiple transactions
- WHEN a transaction is deleted
- THEN the balance immediately recalculates without the deleted transaction

#### Scenario: Transfer amounts are reflected in both accounts
- GIVEN a TRANSFER_OUT on account A and TRANSFER_IN on account B
- WHEN viewing both accounts
- THEN account A balance is reduced by the transfer amount and account B balance is increased

### Requirement: Expandable Account Cards
The system SHALL display account cards in a collapsed state by default, revealing edit and delete actions only when the card is expanded by clicking.

#### Scenario: Account card is collapsed by default
- GIVEN a user viewing the accounts list
- WHEN a card is in its default state
- THEN only the account name and balance are visible, with no edit or delete buttons shown

#### Scenario: Clicking a collapsed card expands it
- GIVEN a collapsed account card
- WHEN the user clicks on the card
- THEN edit and delete buttons appear in the expanded area, aligned to the right

#### Scenario: Clicking an expanded card collapses it
- GIVEN an expanded account card
- WHEN the user clicks on the card body (not on action buttons)
- THEN the card returns to its collapsed state and action buttons are hidden

#### Scenario: Action button clicks do not collapse the card
- GIVEN an expanded account card
- WHEN the user clicks the edit or delete button
- THEN the respective action is triggered without collapsing the card

#### Scenario: Multiple cards expand independently
- GIVEN multiple account cards on the page
- WHEN the user expands one card
- THEN only that card expands; all other cards remain in their current state
