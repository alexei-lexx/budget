# Development Roadmap

**Before starting any task, analyze requirements and instructions in docs/general_spec.md and docs/tech_spec.md**

## ⚠️ CRITICAL: Task Completion Tracking

**ALWAYS mark tasks as completed immediately after finishing them by changing `[ ]` to `[x]`**

This is mandatory for:
- Tracking progress accurately
- Avoiding duplicate work
- Maintaining project visibility
- Ensuring accountability

## Instructions for Adding New Tasks

When creating new implementation tasks in this file, follow these guidelines:

1. **Structure**: Use GitHub markdown ordered lists with checkboxes `[ ]`
2. **Numbering**: Use format `1.2.3` (maximum 3 levels) where:
   - `1` = Task number
   - `2` = Subtask number
   - `3` = Step number
3. **Definitions**:
   - **Task**: A major user-facing feature or business capability that delivers value. Written from user/product owner perspective describing what functionality will be available. Uses single-digit numbering (e.g., "Task 1"). Exception: purely technical tasks that enable other features.
   - **Subtask**: A specific subfeature or user capability within the main task. Each subtask should deliver standalone value that users can directly benefit from. Written from user perspective (e.g., "Delete Account", "Export Data"). Uses two-digit numbering format `X.Y` (e.g., "1.1", "1.2").
   - **Step**: The technical implementation details and specific work items needed to deliver the subtask. Uses three-digit numbering format `X.Y.Z` (e.g., "1.1.1"). This is where technical implementation details belong.
4. **Manual Task Prefix**: Add `[M]` prefix to task items that require manual execution by the developer (e.g., deployment, manual testing, environment setup, external service configuration)
5. **Content to include**:
   - Objective and current state analysis
   - Target architecture description
   - Implementation plan with numbered phases
   - Success criteria
6. **Future enhancements**: Add enhancement ideas and non-MVP features to `docs/future_enhancements.md` instead of creating new tasks here. Keep this roadmap focused on core functionality delivery.

---

## Task 1: Unified CloudFront Infrastructure

**Objective:** Implement a unified CloudFront distribution that serves both the frontend assets and GraphQL API through a single domain, replacing the current separate infrastructure.

### Current State Analysis

**Backend Infrastructure (`backend-cdk/`):**
- Lambda function with direct function URL (no API Gateway)
- No cross-stack outputs or imports
- Function URL bypasses CloudFront integration

**Frontend Infrastructure (`frontend-cdk/`):**
- S3 bucket with separate CloudFront distribution
- No API integration or routing
- Independent deployment pipeline

**Deployment Process:**
- Sequential independent deployments
- No communication between stacks
- Manual S3 sync for frontend assets

### Target Architecture

**Unified Single-Domain Setup:**
```
https://example.cloudfront.net/
├── /                    → Frontend (S3 origin)
├── /graphql        → GraphQL API (API Gateway origin)
└── /assets/*           → Frontend assets (S3 origin)
```

### Implementation Plan

- [x] **1.1 Backend Infrastructure Updates**
  - [x] **1.1.1 Add API Gateway to Backend Stack**
    - [x] 1.1.1.1 Replace Lambda function URL with API Gateway REST API
    - [x] 1.1.1.2 Configure API Gateway with `/graphql` endpoint
    - [x] 1.1.1.3 Update Lambda integration to use API Gateway proxy
  - [x] **1.1.2 Export Backend Outputs**
    - [x] 1.1.2.1 Export API Gateway domain name
    - [x] 1.1.2.2 Export API Gateway stage URL
    - [x] 1.1.2.3 Make these available for frontend stack consumption
  - [x] **1.1.3 Testing**
    - [x] 1.1.3.1 Verify API Gateway endpoints respond correctly
    - [x] 1.1.3.2 Validate Lambda integration works through API Gateway

- [x] **1.2 Frontend Infrastructure Updates**
  - [x] 1.2.1 Import API Gateway domain from backend stack
  - [x] 1.2.2 Configure CloudFront to use API Gateway as origin
  - [x] 1.2.3 Add behavior for `/graphql*` routes → API Gateway origin
  - [x] 1.2.4 Keep default behavior for `/*` routes → S3 origin
  - [x] 1.2.5 Configure appropriate caching policies for each origin
  - [x] 1.2.6 Set up proper security headers
  - [x] 1.2.7 Test CloudFront routing works for both `/` and `/graphql*`
  - [x] 1.2.8 Test that frontend can make GraphQL requests
  - [x] 1.2.9 Verify caching behavior is appropriate

- [x] **1.3 Frontend-Backend Integration**
  - [x] 1.3.1 Configure Apollo Client in Vue.js frontend
  - [x] 1.3.2 Set up environment-specific API endpoints:
    - [x] 1.3.2.1 Local development: `http://localhost:4000/graphql` (backend dev server)
    - [x] 1.3.2.2 Production: `/graphql` (unified CloudFront domain - same origin)
  - [x] 1.3.3 Implement GraphQL queries in Vue components
  - [x] 1.3.4 Update UI components to display data from GraphQL API
  - [x] 1.3.5 Test integration in local development environment
  - [x] 1.3.6 Test integration in deployed production environment

### Success Criteria

- ✅ Single CloudFront domain serves both frontend and API
- ✅ GraphQL endpoint accessible at `/graphql`
- ✅ Frontend can make same-origin API requests
- ✅ Deployment process works reliably with new architecture
- ✅ Performance is maintained or improved
- ✅ All existing functionality continues to work

---

## Task 2: Auth0 Authentication Integration

**Objective:** Integrate Auth0 authentication with Vue.js frontend, providing sign in/sign out functionality with environment-specific configuration.

### Current State Analysis

**Frontend Authentication:**
- No authentication system implemented
- No user session management
- No protected routes or authentication guards

**Backend Authentication:**
- ✅ Existing Auth0 JWT verification in GraphQL context (out of scope)
- ✅ User context extraction from JWT tokens (out of scope)
- ✅ Database operations scoped to authenticated users (out of scope)

### Target Architecture

**Frontend Authentication Flow:**
```
User → Auth0 Login → JWT Token → Vue App State
                                    ↓
                              UI Updates & Token Storage
```

### Implementation Plan

- [x] **2.1 Environment and Dependencies Setup**
  - [x] 2.1.1 Check existing Auth0 dependencies in package.json
  - [x] 2.1.2 Review any existing Auth0 configuration files
  - [x] 2.1.3 Check current frontend structure and routing
  - [x] 2.1.4 Install @auth0/auth0-vue package if not present
  - [x] 2.1.5 Verify version compatibility with Vue 3
  - [x] 2.1.6 Create .env.example file with Auth0 config template
  - [x] 2.1.7 Create .env.local for development Auth0 config (not in git)
  - [x] 2.1.8 Configure production environment variables
  - [x] 2.1.9 Set up same Auth0 client ID for dev/prod initially

- [x] **2.2 Auth0 Vue Integration**
  - [x] 2.2.1 Create Auth0 configuration object with domain and clientId
  - [x] 2.2.2 Configure redirect URIs for dev/prod environments
  - [x] 2.2.3 Set up audience for GraphQL API
  - [x] 2.2.4 Configure Auth0 plugin in main.ts
  - [x] 2.2.5 Initialize Auth0 with environment-specific config

- [x] **2.3 Authentication State Management**
  - [x] 2.3.1 Create useAuth composable for authentication state
  - [x] 2.3.2 Expose login, logout, and user state
  - [x] 2.3.3 Handle loading states and errors
  - [x] 2.3.4 Configure token storage and retrieval
  - [x] 2.3.5 Set up automatic token refresh
  - [x] 2.3.6 Handle token expiration

- [x] **2.4 UI Components**
  - [x] 2.4.1 Create LoginButton component
  - [x] 2.4.2 Create LogoutButton component
  - [x] 2.4.3 Add loading states and error handling
  - [x] 2.4.4 Update main layout/header to include auth buttons
  - [x] 2.4.5 Show appropriate button based on authentication state
  - [x] 2.4.6 Display user information when authenticated


### Success Criteria

- [x] Users can sign in using Auth0
- [x] Users can sign out and clear their session
- [x] Authentication state persists across page reloads
- [x] Environment-specific configuration works for dev/prod
- [x] UI appropriately shows authentication status
- [x] Error states are handled gracefully
- [x] JWT tokens are stored and available for future GraphQL integration

---

## Task 3: User Onboarding and Database Integration

**Objective:** Implement automatic user creation in internal database upon successful Auth0 authentication, with complete development and production database setup.

### Current State Analysis

**Authentication Status:**
- ❌ Auth0 JWT verification NOT implemented in backend
- ✅ Frontend Auth0 integration complete (can obtain JWT tokens)
- ❌ User context extraction from JWT tokens missing
- ❌ JWT tokens not sent from frontend to backend

**Database Status:**
- ❌ No user management in internal database
- ❌ No user creation mechanism
- ❌ No development database setup
- ❌ All operations assume existing users

**Backend GraphQL:**
- ❌ Only health check query implemented
- ❌ No user-related mutations or queries
- ❌ No database integration

### Target Architecture

**User Creation Flow:**
```
Auth0 Login → Frontend → GraphQL Request → ensureUser Mutation → DynamoDB
     ↓            ↓              ↓              ↓                ↓
JWT Token → Apollo Client → Auth Header → Check Existence → Create User
```

**Database Schema:**
```typescript
interface User {
  id: string;           // UUID v4 primary key
  auth0UserId: string;  // Auth0 sub claim (unique)
  email: string;        // Normalized lowercase email
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

### Implementation Plan

- [x] **3.1 Development Database Setup**
  - [x] 3.1.1 Create Docker Compose configuration for DynamoDB Local
  - [x] 3.1.2 Add npm scripts for database management
  - [x] 3.1.3 Create table creation scripts for development
  - [x] 3.1.4 Update development documentation

- [x] **3.2 Production Database Configuration**
  - [x] 3.2.1 Update backend-cdk to create Users table
  - [x] 3.2.2 Configure proper partition key (id) and GSI (auth0UserId)
  - [x] 3.2.3 Set up point-in-time recovery
  - [x] 3.2.4 Configure appropriate billing mode
  - [x] 3.2.5 Add IAM permissions for Lambda

- [x] **3.3 Backend User Management**
  - [x] 3.3.1 Use built-in crypto.randomUUID() for internal user ID generation
  - [x] 3.3.2 Create User model and types
  - [x] 3.3.3 Implement UserRepository with findByAuth0UserId and create operations
  - [x] 3.3.4 Add user existence checking by Auth0 user ID only
  - [x] 3.3.5 Implement user creation with validation

- [x] **3.4 JWT Authentication Setup**
  - [x] 3.4.1 Install JWT verification libraries (jsonwebtoken, jwks-rsa)
  - [x] 3.4.2 Add JWT verification to Apollo Server context
  - [x] 3.4.3 Extract user info from verified JWT tokens
  - [x] 3.4.4 Handle authentication errors and edge cases

- [x] **3.5 GraphQL Schema and Resolvers**
  - [x] 3.5.1 Define User type in GraphQL schema
  - [x] 3.5.2 Add ensureUser mutation
  - [x] 3.5.3 Implement ensureUser resolver with existence checking
  - [x] 3.5.4 Add input validation and error handling

- [x] **3.6 Frontend Integration**
  - [x] 3.6.1 Configure Apollo Client to send JWT tokens in headers
  - [x] 3.6.2 Add ensureUser mutation call to frontend
  - [x] 3.6.3 Call ensureUser immediately after successful Auth0 login
  - [x] 3.6.4 Add loading states and error handling for user creation
  - [x] 3.6.5 Test complete flow from login to user creation

### Success Criteria

- [x] Development database runs locally with Docker Compose
- [x] Production DynamoDB table created automatically via CDK
- [x] Users automatically created on first authenticated request
- [x] Duplicate user creation handled gracefully
- [x] Auth0 user ID used as primary identifier
- [x] Email addresses normalized to lowercase
- [x] Complete error handling for all failure scenarios
- [x] Frontend shows appropriate loading/error states during onboarding

---

## Task 4: Account Management MVP

**Objective:** Create a complete account management system with dedicated page and navigation, enabling users to create, list, edit, and archive financial accounts with multi-currency support.

### Current State Analysis

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

### Target Architecture

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

### Implementation Plan

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

### Success Criteria

- [x] Users can navigate between Dashboard and Accounts pages
- [x] Users can create new accounts with name, currency, and initial balance
- [x] Users can view all their accounts in a clean, organized list
- [x] Users can edit account details (name, currency, initial balance)
- [x] Users can archive accounts (soft delete) to hide them from main view
- [x] Multi-currency support with proper currency symbols/formatting
- [x] Initial balance displayed for each account
- [x] Form validation and error handling throughout
- [x] Responsive design works on mobile and desktop

---

## Task 5: Category Management System

**Objective:** Implement a complete category management system for income and expense transactions, providing users with customizable categories that serve as the foundation for transaction tracking and reporting.

### Current State Analysis

**Frontend Status:**
- ✅ Vue Router with navigation between Dashboard and Accounts
- ✅ Vuetify UI components and theming
- ✅ Apollo Client GraphQL integration
- ❌ No category-related components or pages
- ❌ No category navigation or management interface

**Backend Status:**
- ✅ User authentication and database integration working
- ✅ Account management GraphQL schema and resolvers
- ✅ DynamoDB tables for Users and Accounts
- ❌ No category database table or schema
- ❌ No category GraphQL types or resolvers

**Dependencies:**
- Categories are required before implementing transactions
- Transaction forms will need category selection dropdowns
- Monthly reports will group transactions by category

### Target Architecture

**Database Schema:**
```typescript
interface Category {
  userId: string;       // Partition key (same pattern as Accounts)
  id: string;           // Sort key - UUID v4
  name: string;         // Category name (e.g., "Groceries", "Salary")
  type: 'INCOME' | 'EXPENSE'; // Category type (INCOME, EXPENSE)
  isArchived: boolean;  // Soft delete flag
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

**Navigation Structure:**
```
App Navigation Drawer:
├── Dashboard (/)           → Overview/health check
├── Accounts (/accounts)    → Account management page
└── Categories (/categories) → Category management page
```

**Page Layout (Categories.vue):**
```
┌─────────────────────────────────────────┐
│ Categories Page                         │
├─────────────────────────────────────────┤
│ [Income] [Expense] Tabs                 │
├─────────────────────────────────────────┤
│ [+ Add New Category]                    │
├─────────────────────────────────────────┤
│ Income Categories:                      │
│ ┌─────────────┐ ┌─────────────┐         │
│ │ Salary      │ │ Freelance   │         │
│ │ [Edit][Del] │ │ [Edit][Del] │         │
│ └─────────────┘ └─────────────┘         │
│                                         │
│ Expense Categories:                     │
│ ┌─────────────┐ ┌─────────────┐         │
│ │ Groceries   │ │ Rent        │         │
│ │ [Edit][Del] │ │ [Edit][Del] │         │
│ └─────────────┘ └─────────────┘         │
└─────────────────────────────────────────┘
```

### Implementation Plan

- [x] **5.1 Database Infrastructure Setup**
  - [x] 5.1.1 Update backend-cdk stack to add Categories DynamoDB table with partition key (userId) and sort key (id)
  - [x] 5.1.2 Add Categories table definition to development database setup scripts
  - [x] 5.1.3 Test database table creation in both development and production environments

- [x] **5.2 Backend Data Layer**
  - [x] 5.2.1 Create Category model interface with userId, id, name, type, isArchived, createdAt, updatedAt
  - [x] 5.2.2 Create CategoryRepository with environment-aware DynamoDB configuration
  - [x] 5.2.3 Implement CRUD operations: create, findByUserId, findById, update, archive
  - [x] 5.2.4 Add business logic validation: name required, type validation, duplicate prevention
  - [x] 5.2.5 Add proper error handling with CategoryRepositoryError types

- [x] **5.3 GraphQL API Layer**
  - [x] 5.3.1 Define Category GraphQL type and CategoryInput/UpdateCategoryInput types
  - [x] 5.3.2 Add activeCategories query to schema and resolver to fetch user's categories (optionally filtered by type)
  - [x] 5.3.3 Add createCategory mutation to schema and resolver with validation
  - [x] 5.3.4 Add updateCategory mutation to schema and resolver with existence checking
  - [x] 5.3.5 Add archiveCategory mutation to schema and resolver for soft delete

- [x] **5.4 Frontend Data Integration**
  - [x] 5.4.1 Create GraphQL queries and mutations for category operations
  - [x] 5.4.2 Create useCategories composable for state management and API calls
  - [x] 5.4.3 Add error handling and loading states for category operations

- [x] **5.5 Frontend User Interface**
  - [x] 5.5.1 Add Categories route and navigation menu item
  - [x] 5.5.2 Create Categories.vue page with tabbed layout for Income/Expense
  - [x] 5.5.3 Create CategoryCard component for displaying individual categories (integrated in Categories.vue)
  - [x] 5.5.4 Create CategoryForm component for create/edit operations
  - [x] 5.5.5 Add confirmation dialogs for category deletion

- [x] **5.6 User Experience Enhancements**
  - [x] 5.6.1 Add empty state handling when no categories exist
  - [x] 5.6.2 Add form validation and user-friendly error messages
  - [x] 5.6.3 Ensure responsive design for mobile and desktop

- [x] **5.7 Integration Testing and Deployment**
  - [x] 5.7.1 Test complete CRUD flow in development environment
  - [x] 5.7.2 Test category type filtering and duplicate name prevention
  - [x] 5.7.3 Run linting and type checking (npm run lint, npm run type-check)
  - [x] 5.7.4 Deploy to production and validate all functionality works

### Success Criteria

- [x] Users can navigate to Categories page via main navigation
- [x] Users can create new categories with name and type (Income/Expense)
- [x] Users can view categories organized by type in separate tabs
- [x] Users can edit category names and types
- [x] Users can delete categories with proper confirmation
- [x] Duplicate category names within same type are prevented
- [x] Form validation and error handling throughout
- [x] Responsive design works on mobile and desktop
- [x] Categories are ready to be used by transaction system

---

## Task 6: Core Transaction Management

**Objective:** Implement basic transaction tracking for income and expenses, enabling users to record, view, edit, and delete their financial transactions.

### Current State Analysis

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

### Target Architecture

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


### Implementation Plan

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

- [ ] **6.6 Backend Data Layer**
  - [ ] 6.6.1 Create Transaction model interface with userId, id, accountId, categoryId (optional), type ('INCOME' | 'EXPENSE'), amount, currency, date, description (optional), isArchived, createdAt, updatedAt
  - [ ] 6.6.2 Create TransactionRepository with environment-aware DynamoDB configuration
  - [ ] 6.6.3 Implement CRUD operations: create, findActiveByUserId, findById, update, archive
  - [ ] 6.6.4 Implement findActiveByUserId method with default date desc sorting (no filtering parameters)
  - [ ] 6.6.5 Add business logic validation: amount > 0, type required ('INCOME' | 'EXPENSE'), valid account relationships, optional category validation, date validation
  - [ ] 6.6.6 Add proper error handling with TransactionRepositoryError types

- [ ] **6.7 Account Integration Logic**
  - [ ] 6.7.1 Ensure account existence validation and optional category existence validation in transaction operations
  - [ ] 6.7.2 Handle multi-currency consistency (transaction currency matches account currency)
  - [ ] 6.7.3 Add validation to prevent account currency changes when transactions exist (preserve data integrity)

- [ ] **6.8 GraphQL API Layer**
  - [ ] 6.8.1 Define Transaction GraphQL type and CreateTransactionInput/UpdateTransactionInput types with required type field ('INCOME' | 'EXPENSE') and optional categoryId
  - [ ] 6.8.2 Add transactions query (basic list without filtering parameters)
  - [ ] 6.8.3 Add createTransaction mutation with validation and account existence checking (category validation only if provided)
  - [ ] 6.8.4 Add updateTransaction mutation with business rule validation
  - [ ] 6.8.5 Add archiveTransaction mutation for soft delete

- [ ] **6.9 GraphQL Client Integration**
  - [ ] 6.9.1 Create GraphQL queries and mutations for transaction operations
  - [ ] 6.9.2 Update useTransactions composable to use real GraphQL operations instead of mock service
  - [ ] 6.9.3 Add error handling and loading states for real API operations
  - [ ] 6.9.4 Handle account currency change validation errors with user-friendly messaging and guidance

- [ ] **6.10 Final Integration Testing**
  - [ ] 6.10.1 [M] Test complete transaction CRUD flow with real backend in development environment
  - [ ] 6.10.2 [M] Test transaction operations with various account and category scenarios
  - [ ] 6.10.3 [M] Test multi-currency transaction handling
  - [ ] 6.10.4 [M] Verify UI behavior matches mock data testing
  - [ ] 6.10.5 [M] Run linting and type checking (npm run lint, npm run type-check)
  - [ ] 6.10.6 [M] Deploy to production and validate all functionality works

### Success Criteria

- [ ] Users can navigate to Transactions page via main navigation
- [ ] Users can create new transactions with account, optional category, type (INCOME/EXPENSE), amount, date, and optional description
- [ ] Users can view all their transactions in a chronological list (latest first)
- [ ] Users can edit transaction details including account, category, amount, and date
- [ ] Users can delete transactions with proper confirmation dialogs
- [ ] Transaction validation prevents invalid data entry
- [ ] Multi-currency support works correctly for transactions
- [ ] Responsive design works seamlessly on mobile and desktop
- [ ] Form validation and error handling throughout transaction workflows
- [ ] Transaction system provides foundation for future enhancements and reporting features
