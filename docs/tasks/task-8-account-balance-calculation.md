# Task 8: Account Balance Calculation Enhancement

**Objective:** Implement real-time account balance calculation based on transaction history, replacing static initial balance display with accurate calculated balances that reflect actual transaction activity.

## Current State Analysis

**Frontend Status:**
- ✅ Account management page with account cards displaying account information
- ✅ Account creation/editing forms with initialBalance field
- ✅ Account cards currently display only initialBalance value
- ❌ No calculated balance display based on transaction history
- ❌ No visual indication of account activity or transaction impact

**Backend Status:**
- ✅ Account GraphQL schema with initialBalance field
- ✅ Transaction management with complete CRUD operations
- ✅ TransactionRepository with user-scoped transaction queries
- ✅ AccountRepository with account CRUD operations
- ❌ No AccountService class for business logic coordination
- ❌ No balance calculation logic across repositories
- ❌ No GraphQL balance field in Account type

**Business Logic:**
- According to general-spec.md: "Account balance = Initial balance + Sum of all transactions"
- Calculated balance should reflect real-time transaction activity
- Balance calculation requires cross-repository coordination (AccountRepository + TransactionRepository)

## Target Architecture

**Application Layers Affected:**
- Backend service layer (new AccountService class)
- Backend repository layer (TransactionRepository enhancement)
- GraphQL API layer (Account schema update with balance field)
- Frontend data layer (GraphQL query updates)
- Frontend UI layer (AccountCard component enhancement)

**Data Flow:**
User views account → Frontend requests account data → GraphQL resolver calculates balance → AccountService coordinates AccountRepository + TransactionRepository → Returns account with calculated balance

**UI Enhancement:**
Account cards will prominently display calculated balance only, replacing the current initial balance display with proper currency formatting.

## Implementation Plan

- [x] **8.1 Repository Layer Enhancement**
  - [x] 8.1.1 Add findByAccountId method to TransactionRepository for account-specific transaction queries
  - [x] 8.1.2 Ensure method returns only active (non-archived) transactions with proper user scoping
  - [x] 8.1.3 Add error handling for account transaction queries

- [x] **8.2 Service Layer Implementation**
  - [x] 8.2.1 Create AccountService class with dependency injection for AccountRepository and TransactionRepository
  - [x] 8.2.2 Implement calculateBalance method with business logic: initialBalance + INCOME - EXPENSE transactions
  - [x] 8.2.3 Add error handling for missing accounts and transaction calculation failures
  - [x] 8.2.4 Add AccountService to GraphQL context configuration

- [x] **8.3 GraphQL Layer Updates**
  - [x] 8.3.1 Add balance field to Account GraphQL type as calculated field
  - [x] 8.3.2 Implement balance resolver to call AccountService.calculateBalance
  - [x] 8.3.3 Add error handling for balance calculation failures

- [x] **8.4 Frontend Data Layer Integration**
  - [x] 8.4.1 Update GET_ACCOUNTS query to include balance field
  - [x] 8.4.2 Update Account TypeScript interface to include balance property
  - [x] 8.4.3 Add error handling for balance field fetching

- [x] **8.5 Frontend UI/UX Layer Enhancement**
  - [x] 8.5.1 Update AccountCard component to display calculated balance instead of initial balance
  - [x] 8.5.2 Add loading states and error handling for balance display

## Testing

- [x] **8.6 Code Quality Validation**
  - [x] 8.6.1 [M] Run npm run lint and npm run type-check in both frontend and backend
  - [x] 8.6.2 [M] Fix any linting or type checking errors

- [x] **8.7 Integration Testing**
  - [x] 8.7.1 [M] Create test account with $1000 USD initial balance, verify account card shows $1000.00
  - [x] 8.7.2 [M] Add $500 income transaction, verify account card updates to show $1500.00
  - [x] 8.7.3 [M] Add $200 expense transaction, verify account card updates to show $1300.00
  - [x] 8.7.4 [M] Edit expense transaction to $300, verify account card updates to show $1200.00
  - [x] 8.7.5 [M] Delete expense transaction, verify account card updates to show $1500.00
  - [x] 8.7.6 [M] Create EUR account with €500 initial balance, add €100 income, verify shows €600.00 with correct symbol
  - [x] 8.7.7 [M] Test account with only income transactions: create account with $0 initial balance, add $300 income, verify shows $300.00
  - [x] 8.7.8 [M] Test account with only expense transactions: create account with $500 initial balance, add $600 expense, verify shows -$100.00 with proper negative formatting

- [x] **8.8 Production Deployment**
  - [x] 8.8.1 [M] Deploy to production environment
  - [x] 8.8.2 [M] Repeat core balance calculation tests in production (8.7.1-8.7.3)
