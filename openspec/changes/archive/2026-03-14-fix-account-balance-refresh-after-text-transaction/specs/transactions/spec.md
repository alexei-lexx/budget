## ADDED Requirements

### Requirement: Account Balance Refresh After Natural Language Transaction Creation

The system SHALL refresh account balances immediately after a transaction is successfully created via the natural language text input, so that the Accounts page reflects the new transaction without a manual page refresh.

#### Scenario: Account balance updates immediately after text-input transaction creation

- GIVEN the user is on the Transactions page and has an account with a known balance
- WHEN they create a transaction via the natural language text input and navigate to the Accounts page
- THEN the account balance reflects the newly created transaction without requiring a manual page refresh
