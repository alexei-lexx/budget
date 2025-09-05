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
- **And** categories are sorted by spending amount (highest to lowest)

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