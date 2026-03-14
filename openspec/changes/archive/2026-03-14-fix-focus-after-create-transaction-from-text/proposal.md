## Why

After successfully creating a transaction from natural language text, the input field loses focus, forcing the user to click the field again before entering the next transaction. Restoring focus automatically enables rapid, keyboard-driven transaction entry without interruption.

## What Changes

- After a successful natural language transaction creation, focus is returned to the text input field automatically

## Capabilities

### New Capabilities

- `transactions`: New "Focus Restored After Natural Language Transaction Creation" requirement

### Modified Capabilities

<!-- None -->

## Impact

- **Frontend**: The component handling `createTransactionFromText` submission (natural language input area on the Transactions page) needs to programmatically refocus the textarea after the mutation succeeds and the input is cleared
- No backend, API, or infrastructure changes required
