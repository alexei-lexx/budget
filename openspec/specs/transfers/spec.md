# Transfers Specification

## Purpose

This domain covers fund transfers between a user's own accounts. A transfer moves money from a source account to a destination account of the same currency, represented as a linked TRANSFER_OUT and TRANSFER_IN transaction pair. Both legs are created, edited, and deleted atomically.

## Requirements

### Requirement: Transfer Creation

The system SHALL allow users to transfer funds between two accounts of the same currency, creating a linked TRANSFER_OUT and TRANSFER_IN pair.

#### Scenario: User creates a transfer between same-currency accounts

- GIVEN a user with two accounts in the same currency
- WHEN they submit the Create Transfer form with source account, destination account, and amount
- THEN a TRANSFER_OUT transaction is created on the source account
- AND a TRANSFER_IN transaction is created on the destination account

#### Scenario: Transfer between accounts with different currencies is rejected

- GIVEN accounts in different currencies
- WHEN the user attempts to create a transfer between them
- THEN the system prevents the transfer and shows an error message

### Requirement: Transfer Editing

The system SHALL allow users to edit a transfer, updating both linked transactions and recalculating both account balances.

#### Scenario: Editing a transfer updates both legs

- GIVEN a created transfer
- WHEN the user edits the transfer amount and saves
- THEN both linked transactions are updated
- AND both affected account balances recalculate

### Requirement: Transfer Deletion

The system SHALL allow users to delete a transfer, removing both linked transactions and recalculating both account balances.

#### Scenario: Deleting a transfer removes both legs

- GIVEN a created transfer
- WHEN the user deletes the transfer
- THEN both linked transactions are removed
- AND both affected account balances recalculate

### Requirement: Transfer Duplication

The system SHALL allow users to copy a transfer from the transaction list, opening the Create Transfer form pre-filled with the original transfer's details and today's date.

#### Scenario: Copying a transfer opens the pre-filled transfer form

- GIVEN an expanded TRANSFER_IN or TRANSFER_OUT transaction card
- WHEN the user clicks "Copy"
- THEN the Create Transfer form opens pre-filled with the original transfer's details
- AND the date field is set to today's date

### Requirement: Transfer Sort Order

The system SHALL display the TRANSFER_IN transaction before the TRANSFER_OUT transaction for a paired transfer in the transaction list.

#### Scenario: Transfer pair displays in correct order

- GIVEN a user created a transfer from Account A to Account B
- WHEN they view the transactions list
- THEN the TRANSFER_IN (money entering Account B) appears above the TRANSFER_OUT (money leaving Account A)
