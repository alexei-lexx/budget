# Task 4: Account Management MVP

**Objective:** Create a complete account management system with dedicated page and navigation, enabling users to create, list, edit, and archive financial accounts with multi-currency support.

## Current State Analysis

**Frontend Status:**
- ✅ Auth0 authentication working
- ✅ Apollo Client GraphQL integration
- ✅ Vuetify UI framework set up
- ❌ No Vue Router (single page app currently)
- ❌ Basic navigation drawer with placeholder items
- ❌ No dedicated pages beyond main App.vue

**Backend Status:**
- ✅ User authentication and onboarding complete
- ✅ GraphQL server with health check
- ✅ DynamoDB integration working
- ❌ No account-related database tables
- ❌ No account GraphQL schema or resolvers

## Target Architecture

**Navigation Structure:**
```
App Navigation Drawer:
├── Dashboard (/)           → Overview/health check
└── Accounts (/accounts)    → Account management page
```

**Database Schema:**
```typescript
interface Account {
  id: string;           // UUID v4 primary key
  userId: string;       // Foreign key to User
  name: string;         // Account name (e.g., "Cash", "Bank Account")
  currency: string;     // ISO currency code (USD, EUR, etc.)
  initialBalance: number; // Starting balance
  isArchived: boolean;  // Soft delete flag
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

**Page Layout (Accounts.vue):**
```
┌─────────────────────────────────────────┐
│ Accounts Page                           │
├─────────────────────────────────────────┤
│ [+ Add New Account]                     │
├─────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Cash            │ │ Bank Account    │ │
│ │ $1,234.56       │ │ €2,500.00      │ │
│ │ [Edit][Archive] │ │ [Edit][Archive] │ │
│ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Plan

- [x] **4.1 Frontend Navigation and Routing Setup**
  - [x] 4.1.1 Install Vue Router 4 and configure basic routing
  - [x] 4.1.2 Create router configuration with Dashboard and Accounts routes
  - [x] 4.1.3 Update App.vue to use router-view and add navigation menu items
  - [x] 4.1.4 Create views directory and move current content to Dashboard.vue
  - [x] 4.1.5 Add navigation drawer items for Dashboard and Accounts with proper icons

- [x] **4.2 Backend Account Schema and Database**
  - [x] 4.2.1 Create Account model with id, userId, name, currency, initialBalance, isArchived, createdAt, updatedAt
  - [x] 4.2.2 Update backend-cdk to create Accounts DynamoDB table with proper partition key and GSI
  - [x] 4.2.3 Create AccountRepository with CRUD operations (create, findByUserId, update, archive)
  - [x] 4.2.4 Add GraphQL Account type and input types to schema
  - [x] 4.2.5 Implement GraphQL resolvers for accounts query and createAccount, updateAccount, archiveAccount mutations

- [x] **4.3 Frontend Account Management Components**
  - [x] 4.3.1 Create Accounts.vue page with layout for account list and add new account button
  - [x] 4.3.2 Create AccountsList.vue component to display user accounts with balance and currency
  - [x] 4.3.3 Create AccountForm.vue component for creating/editing accounts with validation
  - [x] 4.3.4 Add account deletion with user confirmation dialog showing account name and "cannot be undone" warning
  - [x] 4.3.5 Create useAccounts.ts composable for account GraphQL operations
  - [x] 4.3.6 Add GraphQL queries and mutations for accounts to frontend

- [x] **4.4 Multi-Currency Support Implementation**
  - [x] 4.4.1 Add supportedCurrencies query to GraphQL schema to return available currencies
  - [x] 4.4.2 Implement supportedCurrencies resolver in backend to return currency list from validation constants
  - [x] 4.4.3 Update AccountForm component to fetch and use currencies from GraphQL API
  - [x] 4.4.4 Add currency symbols/formatting helper functions for different currencies
  - [x] 4.4.5 Display currency symbols/codes in account lists and cards with proper formatting
  - [x] 4.4.6 Add error handling for currency fetching with proper retry mechanisms

- [x] **4.5 Error Handling and Validation**
  - [x] 4.5.1 Add frontend form validation for account name, currency, and initial balance
  - [x] 4.5.2 Add backend validation for account data and return appropriate error messages
  - [x] 4.5.3 Add loading states and error displays for all account operations
  - [x] 4.5.4 Handle duplicate account names gracefully with user-friendly messages

- [x] **4.6 Testing and Deployment**
  - [x] 4.6.1 Test account creation, editing, and archiving in development environment
  - [x] 4.6.2 Test navigation between Dashboard and Accounts pages
  - [x] 4.6.3 Test multi-currency account creation and display
  - [x] 4.6.4 Run frontend and backend linting/formatting checks
  - [x] 4.6.5 Deploy and test in production environment

## Success Criteria

- [x] Users can navigate between Dashboard and Accounts pages
- [x] Users can create new accounts with name, currency, and initial balance
- [x] Users can view all their accounts in a clean, organized list
- [x] Users can edit account details (name, currency, initial balance)
- [x] Users can archive accounts (soft delete) to hide them from main view
- [x] Multi-currency support with proper currency symbols/formatting
- [x] Initial balance displayed for each account
- [x] Form validation and error handling throughout
- [x] Responsive design works on mobile and desktop