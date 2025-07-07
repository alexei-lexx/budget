# Task 5: Category Management System

**Objective:** Implement a complete category management system for income and expense transactions, providing users with customizable categories that serve as the foundation for transaction tracking and reporting.

## Current State Analysis

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

## Target Architecture

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

## Implementation Plan

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

## Success Criteria

- [x] Users can navigate to Categories page via main navigation
- [x] Users can create new categories with name and type (Income/Expense)
- [x] Users can view categories organized by type in separate tabs
- [x] Users can edit category names and types
- [x] Users can delete categories with proper confirmation
- [x] Duplicate category names within same type are prevented
- [x] Form validation and error handling throughout
- [x] Responsive design works on mobile and desktop
- [x] Categories are ready to be used by transaction system