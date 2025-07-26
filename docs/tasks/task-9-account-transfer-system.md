# Task 9: Account Transfer System

**Objective:** Implement account-to-account money transfers that allow users to move funds between their own accounts of the same currency, using industry-standard two-transaction approach that maintains clear audit trails and complies with double-entry bookkeeping principles.

## Current State Analysis

**Database Schema:**
- ✅ Transaction table exists with userId, accountId, type, amount, currency fields
- ✅ Account table with userId, currency, initialBalance fields
- ❌ No transferId field for linking paired transactions
- ❌ No TRANSFER_IN and TRANSFER_OUT transaction types
- ❌ Transaction type enum only supports INCOME and EXPENSE

**Backend Status:**
- ✅ TransactionRepository with CRUD operations
- ✅ AccountRepository with account management
- ✅ TransactionService for business logic coordination
- ✅ GraphQL transaction schema with type enum
- ❌ No TransferService class for dual-account operations
- ❌ No transfer-specific GraphQL schema (CreateTransferInput, Transfer type)
- ❌ No transfer validation logic (same currency, account ownership)
- ❌ No rollback/compensation logic for partial transfer failures

**Frontend Status:**
- ✅ Transaction management page with income/expense transactions
- ✅ Account selection in transaction forms
- ✅ Apollo Client setup for GraphQL operations
- ❌ No transfer support in existing transactions page
- ❌ No transfer creation form component
- ❌ No transfer history display
- ❌ No transfer-specific UI patterns

**Business Logic Requirements:**
- Users can transfer money between their own accounts only
- Both accounts must use the same currency
- Transfers do not affect income/expense totals in reports
- Each transfer creates two linked transactions (TRANSFER_OUT and TRANSFER_IN)
- Account balances must be updated correctly for both accounts

## Target Architecture

**Application Layers Affected:**
- Database layer (schema changes for transferId and new transaction types)
- Repository layer (enhanced TransactionRepository for transfer queries)
- Service layer (new TransferService for dual-account operations)
- GraphQL layer (transfer schema, resolvers, validation)
- Frontend data layer (transfer GraphQL operations)
- Frontend UI layer (enhanced transactions page with transfer support and new forms)

**Data Flow:**
User creates transfer → Frontend sends CreateTransfer mutation → GraphQL validates input → TransferService validates accounts and currency → Creates two linked transactions atomically → Returns transfer data to frontend

**Transfer Representation:**
Each transfer creates two Transaction records:
- TRANSFER_OUT transaction on source account (decreases balance)
- TRANSFER_IN transaction on destination account (increases balance)
- Both linked by shared transferId UUID
- **Note: Transfer ID cannot be changed after creation to maintain audit trail integrity**

**UI Design:**
Show transfers as normal transactions with TRANSFER_IN and TRANSFER_OUT types in the existing transactions list. Each transfer creates two separate transaction entries that display individually. Add transfer creation form to existing transaction creation interface.

## Implementation Plan

- [x] **9.1 Database Layer**
  - [x] 9.1.1 Add transferId field (optional string UUID) to Transaction model interface
  - [x] 9.1.2 Extend TransactionType enum to include TRANSFER_OUT and TRANSFER_IN

- [x] **9.2 Repository Layer**
  - [x] 9.2.1 Update TransactionRepository.create to support transferId field
  - [x] 9.2.2 Add findByTransferId method to retrieve paired transfer transactions

- [x] **9.3 Service Layer**
  - [x] 9.3.1 Update balance calculation in AccountService to handle TRANSFER_IN/TRANSFER_OUT types
  - [x] 9.3.2 Create TransferService class with constructor accepting TransactionRepository and AccountRepository
  - [x] 9.3.3 Implement createTransfer method with account validation (same user, same currency)
  - [x] 9.3.4 Add rollback/compensation logic for partial transfer failures
  - [x] 9.3.5 Implement deleteTransfer method to handle cascading deletion of paired transactions
  - [x] 9.3.6 Implement updateTransfer method with validation (same user, same currency) that updates both linked transactions atomically (transferId cannot be changed after creation)

- [ ] **9.4 GraphQL Layer**
  - [x] 9.4.1 Create Transfer type representing a paired transaction set
  - [x] 9.4.2 Add CreateTransferInput with fromAccountId, toAccountId, amount, date, description
  - [x] 9.4.3 Implement createTransfer mutation with Zod input validation
  - [x] 9.4.4 Add UpdateTransferInput with transferId, fromAccountId, toAccountId, amount, date, description
  - [x] 9.4.5 Implement updateTransfer mutation with Zod input validation
  - [x] 9.4.6 Implement deleteTransfer mutation for transfer removal
  - [x] 9.4.7 Update GraphQL context to include TransferService

- [x] **9.5 Frontend Data Layer**
  - [x] 9.5.1 Create transfer GraphQL operations (CREATE_TRANSFER, UPDATE_TRANSFER, DELETE_TRANSFER)
  - [x] 9.5.2 Generate TypeScript types for transfer mutation operations
  - [x] 9.5.4 Add Apollo Client cache configuration for transfer operations

- [ ] **9.6 Frontend UI/UX Layer**
  - [x] 9.6.1 Add dedicated "Create Transfer" button/action separate from transaction creation interface
  - [x] 9.6.2 Create CreateTransferForm component with dual account selection dropdowns that calls createTransfer mutation
  - [x] 9.6.3 Create EditTransferForm component that loads existing transfer data and calls updateTransfer mutation
  - [x] 9.6.4 Update transaction type display to show TRANSFER_IN and TRANSFER_OUT as normal transaction types
  - [x] 9.6.5 Add edit button/action for transfer transactions that opens EditTransferForm with linked transfer data
  - [x] 9.6.6 Implement transfer-specific deletion logic with confirmation dialog for both paired transactions
  - [ ] 9.6.7 Add transfer amount validation (positive numbers, currency formatting)
  - [ ] 9.6.8 Add success/error notifications for transfer operations

## Testing

- [ ] **9.7 Web UI Testing**
  - [ ] 9.7.1 [M] Create accounts with same currency (USD): "Bank Account" with $1000, "Cash" with $200
  - [ ] 9.7.2 [M] Use "Create Transfer" button to create transfer: $300 from Bank Account to Cash
  - [ ] 9.7.3 [M] Verify both TRANSFER_OUT and TRANSFER_IN transactions appear separately in transaction list
  - [ ] 9.7.4 [M] Test transfer between different currencies is rejected with appropriate error message in CreateTransferForm
  - [ ] 9.7.5 [M] Test non-existent account validation: open CreateTransferForm in one tab, delete one of the accounts in another tab, then submit transfer using the deleted account and verify validation error
  - [ ] 9.7.6 [M] Verify account balances update correctly: Bank=$700, Cash=$500 (check account list page)
  - [ ] 9.7.7 [M] Delete transfer transactions from transaction list and verify both paired transactions removed and balances restored
  - [ ] 9.7.8 [M] Create multiple transfers and verify they appear in transaction list with proper pagination
  - [ ] 9.7.9 [M] Test CreateTransferForm validation: positive amounts, required fields, currency formatting
  - [ ] 9.7.10 [M] Test transfer editing: modify amount from $300 to $250, verify both transactions update and balances recalculate correctly
  - [ ] 9.7.11 [M] Test transfer editing validation: currency mismatch, account ownership, positive amounts

- [ ] **9.8 Production Deployment**
  - [ ] 9.8.1 [M] Deploy complete transfer system using ./deploy.sh (backend → frontend infrastructure → frontend assets)
  - [ ] 9.8.2 [M] Production validation: Run tests 9.7.1, 9.7.2, and 9.7.3 to verify basic transfer functionality
