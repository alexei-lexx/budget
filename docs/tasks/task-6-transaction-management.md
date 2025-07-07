# Task 6: Core Transaction Management

**Objective:** Implement basic transaction tracking for income and expenses, enabling users to record, view, edit, and delete their financial transactions.

## Current State Analysis

**Frontend Status:**
- ✅ Vue Router with navigation between Dashboard, Accounts, and Categories
- ✅ Vuetify UI components with consistent design patterns
- ✅ Apollo Client GraphQL integration working reliably
- ✅ Account and Category management pages fully functional
- ❌ No transaction-related components or pages
- ❌ No transaction navigation or management interface
- ❌ No transaction data visualization or filtering

**Backend Status:**
- ✅ User authentication and database integration working
- ✅ Account management GraphQL schema, resolvers, and repository
- ✅ Category management GraphQL schema, resolvers, and repository
- ✅ DynamoDB tables for Users, Accounts, and Categories
- ❌ No transaction database table or schema
- ❌ No transaction GraphQL types or resolvers

**Dependencies:**
- Accounts provide the foundation for transaction tracking
- Categories enable optional transaction categorization
- Transaction forms will need account selection and optional category selection

## Target Architecture

**Database Schema:**
```typescript
interface Transaction {
  userId: string;          // Partition key (same pattern as other entities)
  id: string;              // Sort key - UUID v4
  accountId: string;       // Foreign key to Account
  categoryId?: string;     // Optional foreign key to Category
  type: 'INCOME' | 'EXPENSE'; // Transaction type (matches category type)
  amount: number;          // Transaction amount (positive value)
  currency: string;        // ISO currency code (inherited from account)
  date: string;            // Transaction date (YYYY-MM-DD format)
  description?: string;    // Optional description
  isArchived: boolean;     // Soft delete flag
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

**Navigation Structure:**
```
App Navigation Drawer:
├── Dashboard (/)               → Overview with recent transactions
├── Accounts (/accounts)        → Account management
├── Categories (/categories)    → Category management
└── Transactions (/transactions) → Transaction management and history
```

**Page Layout (Transactions.vue):**
```
┌───────────────────────────────────────────────────────────────────┐
│ Transactions Page                                                 │
├───────────────────────────────────────────────────────────────────┤
│ [+ Add Transaction]                                               │
├───────────────────────────────────────────────────────────────────┤
│ Transaction History (Latest First):                               │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ Dec 15, 2024  │ Groceries    │ Weekly shopping │ -45.67  [:]  │ │
│ │ Cash, USD     │              │                 │              │ │
│ ├───────────────┼──────────────┼─────────────────┼──────────────┤ │
│ │ Dec 14, 2024  │ Salary       │                 │ +3,500.00[:] │ │
│ │ Bank Acct,USD │              │                 │              │ │
│ └───────────────┴──────────────┴─────────────────┴──────────────┘ │
│ [:] Dropdown Menu: Edit, Delete                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

- [x] **6.1 Frontend Mock Data Setup**
  - [x] 6.1.1 Define transaction data types and interfaces
  - [x] 6.1.2 Create mock transaction service with localStorage persistence
  - [x] 6.1.3 Implement CRUD operations (create, read, update, archive) with validation and real account/category data integration
  - [x] 6.1.4 Add sample data generator using real account/category IDs
  - [x] 6.1.5 Create useTransactions composable with reactive data, loading/error states, and async functions (createTransaction, updateTransaction, archiveTransaction, initializeMockData)

- [x] **6.2 Frontend UI Components**
  - [x] 6.2.1 Add Transactions route and navigation menu item with appropriate icon
  - [x] 6.2.2 Create TransactionForm.vue component for create/edit operations with account/category dropdowns
  - [x] 6.2.3 Create TransactionCard.vue component for displaying individual transactions with always-visible +/- signs and dropdown action menu (⋮)
  - [x] 6.2.4 Create Transactions.vue page with transaction list using mock data
  - [x] 6.2.5 Implement dropdown action menu with Edit and Delete options following the same pattern as accounts and categories

- [x] **6.3 Frontend User Experience**
  - [x] 6.3.1 Implement amount formatting with consistent +/- prefix display (e.g., "+$3,500.00", "-$45.67")
  - [x] 6.3.2 Add confirmation dialogs for transaction deletion with transaction details (amount, description, account)
  - [x] 6.3.3 Add empty state handling when no transactions exist
  - [x] 6.3.4 Add loading states for transaction operations
  - [x] 6.3.5 Ensure responsive design for mobile transaction entry
  - [x] 6.3.6 Handle form validation errors with user-friendly messaging

- [x] **6.4 Frontend Testing and Refinement**
  - [x] 6.4.1 [M] Test transaction CRUD flow with mock data in browser
  - [x] 6.4.2 [M] Test UI responsiveness on mobile devices
  - [x] 6.4.3 [M] Validate user flows and interaction patterns
  - [x] 6.4.4 [M] Iterate on UI based on usability testing

- [x] **6.5 Database Infrastructure Setup**
  - [x] 6.5.1 Add Transactions table to development database (backend/scripts/create-tables.ts) with userId/id primary key and UserDateIndex GSI for efficient date-sorted queries
  - [x] 6.5.2 Add Transactions table to production CDK stack with identical structure, IAM permissions, and point-in-time recovery
  - [x] 6.5.3 [M] Test table creation in both environments and verify structure

- [x] **6.6 Backend Data Layer**
  - [x] 6.6.1 Create Transaction model interface with userId, id, accountId, categoryId (optional), type ('INCOME' | 'EXPENSE'), amount, currency, date, description (optional), isArchived, createdAt, updatedAt
  - [x] 6.6.2 Create TransactionRepository with environment-aware DynamoDB configuration, implement CRUD operations (create, findActiveByUserId with default date desc sorting, findById, update, archive), and add proper error handling with TransactionRepositoryError types

- [x] **6.7 Transaction Service Layer Implementation**
  - [x] 6.7.1 Create BusinessError class for service-layer error handling with error codes and user-friendly messages
  - [x] 6.7.2 Create TransactionService class with constructor dependency injection (TransactionRepository, AccountRepository, CategoryRepository)
  - [x] 6.7.3 Implement private validation helper methods: validateAccount, validateCategory, validateCurrencyMatch
  - [x] 6.7.4 Implement createTransaction method with full business validation: account existence, currency matching, optional category type validation
  - [x] 6.7.5 Implement getTransactionsByUser method for retrieving user's active transactions
  - [x] 6.7.6 Implement updateTransaction method with business validation and partial update support
  - [x] 6.7.7 Implement archiveTransaction method with existence checking and business rules
  - [x] 6.7.8 Add TransactionService to GraphQL context and update server.ts configuration
  - [x] 6.7.9 Add account currency change validation to account resolvers using TransactionRepository.hasTransactionsForAccount method

- [x] **6.8 GraphQL API Layer**
  - [x] 6.8.1 Define Transaction GraphQL type and CreateTransactionInput/UpdateTransactionInput types with required type field ('INCOME' | 'EXPENSE') and optional categoryId
  - [x] 6.8.2 Add Zod validation schemas: amount > 0, type required ('INCOME' | 'EXPENSE'), valid account relationships, optional category validation, date validation
  - [x] 6.8.3 Add transactions query (basic list without filtering parameters)
  - [x] 6.8.4 Add createTransaction mutation with validation and account existence checking (category validation only if provided)
  - [x] 6.8.5 Add updateTransaction mutation with business rule validation
  - [x] 6.8.6 Add archiveTransaction mutation for soft delete

- [x] **6.9 GraphQL Client Integration**
  - [x] 6.9.1 Create GraphQL queries and mutations for transaction operations
  - [x] 6.9.2 Update useTransactions composable to use real GraphQL operations instead of mock service
  - [x] 6.9.3 Add error handling and loading states for real API operations
  - [x] 6.9.4 Handle account currency change validation errors with user-friendly messaging and guidance

- [x] **6.10 Final Integration Testing**
  - [x] 6.10.1 [M] Test complete transaction CRUD flow with real backend in development environment
  - [x] 6.10.2 [M] Test transaction operations with various account and category scenarios
  - [x] 6.10.3 [M] Test multi-currency transaction handling
  - [x] 6.10.4 [M] Verify UI behavior matches mock data testing
  - [x] 6.10.5 [M] Run linting and type checking (npm run lint, npm run type-check)
  - [x] 6.10.6 [M] Deploy to production and validate all functionality works

## Success Criteria

- [x] Users can navigate to Transactions page via main navigation
- [x] Users can create new transactions with account, optional category, type (INCOME/EXPENSE), amount, date, and optional description
- [x] Users can view all their transactions in a chronological list (latest first)
- [x] Users can edit transaction details including account, category, amount, and date
- [x] Users can delete transactions with proper confirmation dialogs
- [x] Transaction validation prevents invalid data entry
- [x] Multi-currency support works correctly for transactions
- [x] Responsive design works seamlessly on mobile and desktop
- [x] Form validation and error handling throughout transaction workflows
- [x] Transaction system provides foundation for future enhancements and reporting features