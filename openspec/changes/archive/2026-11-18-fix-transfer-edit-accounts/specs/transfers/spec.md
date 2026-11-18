## MODIFIED Requirements

### Requirement: Transfer Editing

The system SHALL allow users to edit a transfer, updating both linked transactions and recalculating both account balances. An account that the edit does not change SHALL keep its balance. An edit SHALL keep an archived account that it does not change, and SHALL reject a change to an archived account.

#### Scenario: Editing a transfer updates both legs

- **GIVEN** a created transfer
- **WHEN** the user edits the transfer amount and saves
- **THEN** both linked transactions are updated
- AND both affected account balances recalculate

#### Scenario: Changing only the destination account keeps the source balance

- **GIVEN** a transfer from account A to account B
- **WHEN** the user changes the destination to account C and saves
- **THEN** the balance of account A does not change
- AND the transfer amount moves from account B to account C

#### Scenario: Changing only the source account keeps the destination balance

- **GIVEN** a transfer from account A to account B
- **WHEN** the user changes the source to account C and saves
- **THEN** the balance of account B does not change
- AND the transfer amount returns to account A and leaves account C

#### Scenario: Editing a transfer with an unchanged archived account

- **GIVEN** a transfer whose source or destination account is archived
- **WHEN** the user edits the transfer without a change to the archived account and saves
- **THEN** the edit is saved
- AND the transfer keeps the archived account

#### Scenario: Changing a transfer to an archived account is rejected

- **GIVEN** a created transfer and an archived account
- **WHEN** a client changes the source or destination to the archived account
- **THEN** the request fails
- AND the transfer and account balances are unchanged
