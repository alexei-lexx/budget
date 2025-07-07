# Task 9: Account Transfer System

**Objective:** Implement account-to-account money transfers enabling users to move funds between their own accounts while maintaining accurate balance calculations and unified transaction history.

## Current State Analysis

**Frontend Status:**
- ✅ Vue Router with navigation between Dashboard, Accounts, Categories, and Transactions
- ✅ Transaction management with filtering and pagination
- ✅ Account selection components with currency display
- ✅ Responsive design patterns established
- ❌ No transfer functionality in transaction forms
- ❌ No transfer-specific UI components
- ❌ No account-to-account transfer workflows

**Backend Status:**
- ✅ Transaction model with INCOME/EXPENSE types
- ✅ TransactionService with business validation
- ✅ AccountService with balance calculation
- ✅ GraphQL schema with transaction CRUD operations
- ❌ No TRANSFER transaction type
- ❌ No support for dual-account operations
- ❌ No transfer-specific validation logic

## Target Architecture

**Data Model Extension:**
Extend existing Transaction model with transfer capability using single-transaction approach with dual account references.

**User Experience:**
Integrate transfers into existing Transactions page with filtering to maintain unified financial timeline.

**Balance Calculation:**
Update existing balance logic to handle transfers affecting both source and destination accounts.

## Implementation Plan

- [ ] **9.1 Database Layer**
  - [ ] 9.1.1 Add toAccountId field to Transaction model (optional for transfers)
  - [ ] 9.1.2 Add TRANSFER to TransactionType enum
  - [ ] 9.1.3 Update development database scripts

- [ ] **9.2 Repository Layer**
  - [ ] 9.2.1 Update findByAccountId and hasTransactionsForAccount methods to include transfers where account is source OR destination

- [ ] **9.3 Service Layer**
  - [ ] 9.3.1 Add createTransfer method to TransactionService
  - [ ] 9.3.2 Implement transfer validation (same currency, different accounts, user ownership)
  - [ ] 9.3.3 Update AccountService balance calculation for TRANSFER type

- [ ] **9.4 GraphQL Layer**
  - [ ] 9.4.1 Add TRANSFER to TransactionType enum
  - [ ] 9.4.2 Add toAccountId field to Transaction type
  - [ ] 9.4.3 Create CreateTransferInput type with Zod validation
  - [ ] 9.4.4 Add createTransfer mutation and implement resolver

- [ ] **9.5 Frontend Data Layer**
  - [ ] 9.5.1 Add createTransfer mutation to GraphQL client
  - [ ] 9.5.2 Update useTransactions composable for transfer support

- [ ] **9.6 Frontend UI/UX Layer**
  - [ ] 9.6.1 Create TransferForm component with account selection, validation, and form submission
  - [ ] 9.6.2 Update TransactionCard to display transfers as "From → To"
  - [ ] 9.6.3 Add "Create Transfer" button that opens TransferForm modal

## Testing

- [ ] **9.7 Code Quality Validation**
  - [ ] 9.7.1 [M] Run linting and type checking
  - [ ] 9.7.2 [M] Fix any code quality issues

- [ ] **9.8 Integration Testing**
  - [ ] 9.8.1 [M] Create "Bank Account" (USD, $1500 initial), "Cash" (USD, $300 initial), "Savings" (EUR, €800 initial)
  - [ ] 9.8.2 [M] Transfer $250 from Bank Account to Cash, verify Bank shows $1250.00 and Cash shows $550.00
  - [ ] 9.8.3 [M] Attempt transfer from Bank Account (USD) to Savings (EUR), verify error message prevents transfer
  - [ ] 9.8.4 [M] Transfer $100 from Cash to Bank Account, verify Cash shows $450.00 and Bank shows $1350.00
  - [ ] 9.8.5 [M] Check transaction list shows "Bank → Cash $250.00" and "Cash → Bank $100.00" without +/- signs
  - [ ] 9.8.6 [M] Edit first transfer amount to $300, verify Bank shows $1200.00 and Cash shows $600.00
  - [ ] 9.8.7 [M] Delete second transfer, verify Cash shows $500.00 and Bank shows $1300.00

- [ ] **9.9 Production Deployment**
  - [ ] 9.9.1 [M] Deploy to production environment
  - [ ] 9.9.2 [M] Validate core transfer functionality

## Success Criteria

- [ ] Users can create transfers between same-currency accounts
- [ ] Transfer validation prevents invalid operations
- [ ] Account balances reflect transfer operations correctly
- [ ] Transfers appear in unified transaction timeline
- [ ] Transfer filtering works alongside income/expense filters
- [ ] Transfers display clearly as account-to-account movements
- [ ] Mobile responsive transfer creation and management