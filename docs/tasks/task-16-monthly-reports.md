# Task 16: Monthly Reports Feature

## Objective
Implement monthly expense reports functionality that allows users to view their spending by category with proper multi-currency support and month navigation.

## User Stories

### Story 1: Access Current Month Report

**As a** user
**I want to** open the app and navigate to a reports page to see the current month's report by default
**So that** I can immediately see my current spending without additional navigation

**Acceptance Criteria:**
- **Given** I open the application
- **When** I click on "Reports" in the main navigation
- **Then** I see the current month's report displayed automatically
- **And** the report shows data for the current calendar month (e.g., "September 2025")

### Story 2: View Monthly Expense by Category

**As a** user
**I want to** see how much money I spent in each expense category during the month
**So that** I can identify my biggest spending areas

**Acceptance Criteria:**
- **Given** I'm viewing the monthly report
- **When** the report loads
- **Then** I see a table showing each expense category with its total amount
- **And** I see an "Uncategorized" row for expenses without categories
- **And** each amount is displayed with its currency symbol (e.g., "$125.50", "€89.20")
- **And** categories are sorted alphabetically by name

### Story 3: See Total Monthly Spending

**As a** user
**I want to** see my total monthly expense amount prominently displayed
**So that** I can quickly assess if I'm staying within my budget

**Acceptance Criteria:**
- **Given** I'm viewing the monthly report
- **When** the report displays
- **Then** I see the total monthly expense amount at the top or bottom of the table
- **And** the total is visually emphasized (bold, larger font, or highlighted)
- **And** the total equals the sum of all expense transactions for that month
- **And** if I have no expenses, the total shows "0.00" with my default currency

### Story 4: View Category Spending Percentages

**As a** user
**I want to** see what percentage of my total spending each category represents
**So that** I can understand the relative importance of each expense category

**Acceptance Criteria:**
- **Given** I'm viewing the monthly report with expenses
- **When** the table displays
- **Then** each category row shows both the amount and percentage (e.g., "Food: $300.00 (25%)")
- **And** the uncategorized row also shows its percentage
- **And** all percentages add up to exactly 100%
- **And** percentages are rounded to whole numbers
- **And** if I have only one category, it shows 100%

### Story 5: Multi-Currency Expense Reporting

**As a** user with expenses in different currencies
**I want to** see my expenses with each currency on separate sub-rows within each category
**So that** I can track spending accurately in each currency with proper percentages

**Acceptance Criteria:**
- **Given** I have expenses in multiple currencies during the month
- **When** I view the monthly report
- **Then** I see one table where each category shows separate sub-rows for each currency
- **And** the first sub-row shows the category name with the currency amount and percentage
- **And** additional sub-rows show blank category name with other currency amounts and percentages
- **And** percentages are calculated only within each currency's total (e.g., Food €100 shows 50% of €200 EUR total)
- **And** amounts are never mixed or converted between currencies
- **And** the total section shows separate rows for each currency (TOTAL EUR, TOTAL USD)
- **And** uncategorized expenses follow the same multi-row pattern per currency

### Story 6: Navigate Between Months

**As a** user
**I want to** navigate to different months using previous/next controls
**So that** I can view and compare my spending patterns across different time periods

**Acceptance Criteria:**
- **Given** I'm viewing a monthly report
- **When** I look at the report header
- **Then** I see the current month and year prominently displayed (e.g., "September 2025")
- **And** I see "Previous" and "Next" navigation buttons/arrows on either side
- **And** clicking "Previous" shows the report for the previous month
- **And** clicking "Next" shows the report for the next month (if not future)
- **And** future months beyond current month are disabled or hidden
- **And** I can navigate to any past month since I started using the app

---

## UI Example

```
September 2025 Expense Report

Category          Amount    %
Food              USD200.00 50%
                  EUR100.00 33%
Transport         USD150.00 38%
                  EUR200.00 67%
Uncategorized     USD50.00  12%

TOTAL             USD400.00 100%
                  EUR300.00 100%
```

---

## Implementation Plan

This implementation follows a user story by user story approach with top-to-bottom layer implementation for each story.

### Story 1: Access Current Month Report

**16.1 Frontend UI/UX Layer**
- [x] 16.1.1 Create reports view page
  - Display current month and year prominently
  - Show placeholder content indicating reports functionality
  - Implement responsive design for mobile and desktop
  - No data fetching required - static content only
- [x] 16.1.2 Add reports route with authentication
  - Create protected route for reports page
  - Ensure authentication guard is applied
- [x] 16.1.3 Add reports navigation menu item
  - Add reports option to main navigation menu
  - Use appropriate icon and label

### Story 2: View Monthly Expense by Category

**16.2 Database Layer**
- [x] 16.2.1 Design date-based transaction index specification
  - Define Global Secondary Index (GSI) schema for efficient date queries
  - Specify partition key: userId, sort key: date
  - Include all transaction fields in projection for complete data access
- [x] 16.2.2 Implement development database index
  - Create GSI in DynamoDB Local using backend scripts
  - Update database setup scripts to include index creation
- [x] 16.2.3 Implement production database index
  - Add GSI definition to CDK infrastructure in backend-cdk package
  - Update DynamoDB table construct with new index configuration
  - Deploy index changes to production environment

**16.3 Repository Layer**
- [x] 16.3.1 Add method to query transactions by month and type
  - Accept user ID, year, month, and transaction type parameters
  - Use date-based index for efficient filtering
  - Filter by transaction type and active status
  - Return all matching transaction records
  - Follow existing repository patterns for consistency
- [x] 16.3.2 Create unit tests for monthly transaction queries
  - Test filtering by month and different transaction types
  - Test date range accuracy and edge cases
  - Test with various currencies, categories, and amounts
  - Test empty result scenarios

**16.4 Service Layer**
- [x] 16.4.1 Create monthly reports service
  - Implement method to generate monthly reports by transaction type
  - Call repository to get transactions for specified user, year, month, and type
  - Group transactions by category, then by currency within each category
  - Handle transactions without categories (group as "Uncategorized")
  - Calculate totals: sum of amounts per currency within each category
  - Sort categories alphabetically by name
  - Return structured report with category-grouped currency breakdowns
  - Example: Food: USD $300, EUR €150; Transport: USD $200; Uncategorized: USD $50
- [x] 16.4.2 Create comprehensive unit tests for reports service
  - Test grouping by category and currency
  - Test "Uncategorized" handling for transactions without categories
  - Test alphabetical sorting of categories
  - Test empty results and edge cases
  - Test with multiple currencies and categories

**16.5 GraphQL Layer**
- [x] 16.5.1 Add monthly report types to GraphQL schema
  - Define report structure with year, month, transaction type
  - Define category breakdown with amounts
  - Define total summary by currency
- [x] 16.5.2 Add monthly report query to schema
  - Accept year, month, and transaction type parameters
  - Return structured monthly report data
- [x] 16.5.3 Implement monthly report resolver
  - Validate input parameters (year range, month range, transaction type)
  - Call reports service to generate report data
  - Handle authentication and user context extraction

**16.6 Frontend Data Layer**
- [x] 16.6.1 Create GraphQL operations for monthly reports
  - Define query operations for monthly expense reports
- [x] 16.6.2 Generate TypeScript types from schema
  - Run code generation to create typed composables
  - Ensure type safety between frontend and backend
- [x] 16.6.3 Create reactive data composables
  - Implement composable for current month expense report data fetching
  - Handle loading and error states properly

**16.7 Frontend UI/UX Layer**
- [x] 16.7.1 Create category breakdown table component
  - Display expense categories in organized table format
  - Show category names with amounts and currency symbols
  - Handle uncategorized transactions appropriately
  - Implement responsive design for mobile devices

### Story 3: See Total Monthly Spending

**16.8 Frontend UI/UX Layer**
- [x] 16.8.1 Create expense totals display component
  - Display total monthly expense amounts prominently
  - Support multi-currency totals presentation
  - Use visual emphasis for total values (bold/larger text)
  - Handle zero amounts with appropriate messaging

### Story 4: View Category Spending Percentages

**16.9 Service Layer Enhancement**
- [x] 16.9.1 Enhance reports service with percentage calculations
  - Calculate percentages within each currency group
  - Round percentages to whole numbers for readability
  - Ensure percentages sum to 100% per currency
  - Handle edge cases like single category scenarios

**16.10 Frontend UI/UX Layer**
- [x] 16.10.1 Update category table to display percentages
  - Show amounts with calculated percentages in unified format
  - Include percentages for uncategorized transactions
  - Maintain consistent percentage formatting throughout

### Story 5: Multi-Currency Expense Reporting

**16.11 Service Layer Enhancement**
- [x] 16.11.1 Enhance reports service for multi-currency support
  - Sort categories alphabetically with multi-currency sub-rows per category
  - Within each category, create separate rows for each currency
  - Calculate percentages per currency against that currency's total only
  - Include "Uncategorized" category following same multi-currency pattern
  - Add "TOTAL" as final category with same multi-currency sub-row structure

**16.12 Frontend UI/UX Layer**
- [x] 16.12.1 Update category table for multi-currency display
  - Render single table with categories and totals integrated
  - Display category name only on first currency row per category
  - Show blank category name for subsequent currency rows within same category
  - Apply same pattern to "TOTAL" rows at bottom of table
  - Calculate and display percentages relative to each currency's total
  - Maintain consistent spacing and alignment across all rows

### Story 6: Navigate Between Months

**16.13 Service Layer Enhancement**
- [x] 16.13.1 Add month validation logic to reports service
  - ~~Validate month and year parameter combinations~~ (Already handled by GraphQL and Repository layers)
  - ~~Handle edge cases and return appropriate empty data~~ (Repository throws proper errors, GraphQL handles validation)
  - **Final approach**: Removed redundant validation from service layer - validation properly handled at GraphQL input layer and Repository data layer

**16.14 Frontend UI/UX Layer**
- [x] 16.14.1 Create month navigation header component
  - Display current month and year prominently
  - Add previous/next navigation controls with appropriate icons
  - Handle month transitions including year boundaries
- [x] 16.14.2 Integrate month navigation with data layer
  - Add reactive month and year state management
  - Implement navigation methods for month transitions
  - Update report queries when month selection changes
  - Add URL parameter support for bookmarkable month views

**16.15 Frontend Integration**
- [x] 16.15.1 Integrate all report components into main view
  - Combine navigation, totals, and category components
  - Configure components for expense-focused reporting
  - Coordinate loading states across all components
  - Implement comprehensive error handling and user feedback
  - Ensure consistent visual spacing and responsive layout

### Testing

**Integration Testing (Development Environment)**

*Test Setup - Create Test Accounts and Categories*
- [x] **Given** I reset the database to clean state
- [x] **And** I create USD Checking Account with $1000 initial balance
- [x] **And** I create EUR Savings Account with €500 initial balance
- [x] **And** I create expense categories: Food, Transport, Entertainment, Shopping

*Test 1: Story 1 & 3 - Access Current Month Report and Total Display*
- [x] **Given** I have clean test data setup
- [x] **When** I navigate to Reports page from main navigation
- [x] **Then** Reports page loads successfully with URL /reports
- [x] **And** Page header shows "September 2025" prominently
- [x] **And** Page shows "no transactions" message with no currency totals
- [x] **When** I create expense transaction: Food category, USD Checking, $150.00, Sept 5
- [x] **Then** Transaction is created and USD Checking balance becomes $850.00
- [x] **And** Table shows "TOTAL $150.00 100%" in bold/emphasized styling

*Test 2: Story 2 & 4 - Category Display and Percentages*
- [x] **When** I create additional expense transactions:
  - Transport category, USD Checking, $80.00, Sept 10
  - Entertainment category, USD Checking, $45.00, Sept 15
  - No category (uncategorized), USD Checking, $25.00, Sept 20
- [x] **Then** All transactions are created successfully and total becomes $300.00
- [x] **And** Categories appear alphabetically: Entertainment, Food, Transport, Uncategorized
- [x] **And** Amounts display correctly: Entertainment $45.00, Food $150.00, Transport $80.00, Uncategorized $25.00
- [x] **And** Percentages are calculated correctly: Entertainment 15%, Food 50%, Transport 27%, Uncategorized 8%
- [x] **And** All percentages sum to 100% (15% + 50% + 27% + 8% = 100%)
- [x] **When** I delete all transactions except Food transaction
- [x] **Then** Table shows only "Food $150.00 100%" and total shows "$150.00"

*Test 3: Story 5 - Multi-Currency Support*
- [x] **Given** I have only Food $150.00 USD transaction remaining
- [x] **When** I create EUR expense transactions:
  - Food category, EUR Savings, €120.00, Sept 8
- [x] **Then** EUR Savings balance becomes €380.00 and transaction is created successfully
- [x] **And** Category table shows multi-currency structure:
    ```
    Food            $150.00  100%
                    €120.00  100%

    TOTAL           $150.00  100%
                    €120.00  100%
    ```
- [x] **And** Category name "Food" appears only on first currency row
- [x] **And** USD percentage calculated from $150 total, EUR percentage from €120 total (both 100%)
- [x] **And** Totals section shows separate currency totals: "TOTAL $150.00 100%" and "TOTAL €120.00 100%"
- [x] **And** No currency conversion or mixing occurs - USD amounts remain in USD, EUR amounts remain in EUR

*Test 4: Story 6 - Month Navigation*
- [x] **Given** I am viewing September 2025 report with existing transactions
- [x] **When** I create expense transaction for August: Food, USD Checking, $200.00, Aug 15
- [x] **Then** Transaction is created for August 2025 and USD Checking balance becomes $650.00
- [x] **And** September header displays "September 2025" prominently
- [x] **When** I click "Previous" button
- [x] **Then** "August 2025" report loads with header showing "August 2025"
- [x] **And** Table shows "Food $200.00 100%" and "TOTAL $200.00"
- [x] **When** I click "Next" button
- [x] **Then** Returns to "September 2025" with original multi-currency data
- [x] **When** I navigate to Transactions page and create expense: Transport category, USD Checking, $75.00, July 10, 2025
- [x] **And** I navigate back to Reports page and select July 2025
- [x] **Then** July 2025 report shows "Transport $75.00 100%", "TOTAL $75.00"
- [x] **And** URL updates with month parameters (?year=2025&month=7 for July, etc.)
