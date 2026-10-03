## MODIFIED Requirements

### Requirement: Transaction Editing

The system SHALL allow users to edit any field of an existing transaction, with account balances recalculating immediately after the edit is saved. The system SHALL reject editing a transaction that belongs to a transfer. Such transactions are edited only through transfer editing.

#### Scenario: User edits a transaction

- **GIVEN** an existing transaction
- **WHEN** the user changes the amount, category, account, or any other field and saves
- **THEN** the updated values are reflected in the transaction list
- AND the affected account balance recalculates

#### Scenario: Editing a transfer leg is rejected

- **GIVEN** a transaction that belongs to a transfer
- **WHEN** a client edits it as a standalone transaction
- **THEN** the request fails
- AND the transfer and account balances are unchanged

### Requirement: Transaction Deletion

The system SHALL allow users to delete transactions with confirmation, updating account balances immediately. The system SHALL reject deleting a transaction that belongs to a transfer. Such transactions are deleted only through transfer deletion.

#### Scenario: User deletes a transaction

- **GIVEN** an existing transaction
- **WHEN** the user initiates deletion and confirms
- **THEN** the transaction is removed from the list
- AND the account balance recalculates without the deleted transaction

#### Scenario: Deleting a transfer leg is rejected

- **GIVEN** a transaction that belongs to a transfer
- **WHEN** a client deletes it as a standalone transaction
- **THEN** the request fails
- AND the transfer and account balances are unchanged
