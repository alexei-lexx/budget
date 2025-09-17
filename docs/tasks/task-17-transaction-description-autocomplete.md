# Task 17: Transaction Description Autocomplete

## Objective
Implement intelligent transaction description autocomplete functionality that suggests descriptions based on the user's transaction history, improving data entry speed and consistency while reducing typing effort.

## User Stories

### Story 1: Basic Description Suggestions
**As a** user entering a new transaction
**I want** to see suggested descriptions as I type
**So that** I can quickly select from my previous transaction descriptions instead of typing them manually

**Acceptance Criteria:**
- **Given** I am creating a new transaction
- **When** I type 2+ characters in the description field
- **Then** I see up to 5 suggestions from my transaction history
- **And** suggestions are case-sensitive substring matches (e.g., "Gr" matches "Grocery store", but "gr" does not)
- **And** I can select a suggestion with mouse click

**Implementation Plan for Story 1:**

**17.1 Repository Layer**
- [x] 17.1.1 Add method to search transaction descriptions by text pattern
  - Accept userId, searchText, limit parameters
  - Use existing UserCreatedAtIndex GSI to query recent transactions by user
  - Filter: `contains(description, searchText)` (case-sensitive)
  - Query in descending createdAt order to get most recent matches first
  - Return matching transactions
- [x] 17.1.2 Create unit tests for description search method
  - Test case-sensitive substring matching with various search terms
  - Test ordering by creation date (most recent first)
  - Test empty results and edge cases

**17.2 Service Layer**
- [x] 17.2.1 Create basic transaction description suggestions service
  - Implement method to get description suggestions
  - Accept userId, searchText, limit parameters
  - Call repository with higher limit (e.g., 100) to get sufficient data for processing
  - Extract unique descriptions and calculate relevance scores (frequency + recency)
  - Return top N unique description suggestions (up to requested limit)
- [x] 17.2.2 Create unit tests for description suggestions service
  - Test description suggestion retrieval and ordering
  - Test suggestion limit functionality
  - Test edge cases with no matches

**17.3 GraphQL Layer**
- [x] 17.3.1 Add transaction description suggestions query to GraphQL schema
  - Define input type with searchText parameter
  - Add query field returning array of strings
- [x] 17.3.2 Implement description suggestions resolver
  - Call description suggestions service with provided parameters
  - Handle authentication and user context extraction

**17.4 Frontend Data Layer**
- [ ] 17.4.1 Create GraphQL operations for transaction description suggestions
  - Define query operation for fetching description suggestions
- [ ] 17.4.2 Generate TypeScript types from schema
  - Run code generation for typed description suggestion composables
- [ ] 17.4.3 Create reactive description suggestions composable
  - Implement useDescriptionSuggestions composable with debounced input handling
  - Manage loading and error states
  - Handle suggestion selection and form integration

**17.5 Frontend UI/UX Layer**
- [ ] 17.5.1 Create basic autocomplete dropdown component
  - Implement dropdown with suggestion list rendering
  - Add mouse click selection functionality
  - Style dropdown to match application design system
  - Handle loading states and empty suggestion messaging
- [ ] 17.5.2 Integrate autocomplete with transaction form description field
  - Modify description input field to trigger suggestions
  - Handle suggestion selection to update form field
  - Coordinate with form validation and submission

### Story 2: Transaction Type Filtering
**As a** user entering a transaction
**I want** to see suggestions filtered by transaction type
**So that** I only see relevant descriptions (income suggestions for income, expense suggestions for expenses)

**Acceptance Criteria:**
- **Given** I have selected a transaction type (INCOME or EXPENSE)
- **When** I start typing a description
- **Then** suggestions only show descriptions from the same transaction type

### Story 3: Keyboard Navigation and Accessibility
**As a** user with keyboard navigation preferences
**I want** to navigate and select suggestions using only the keyboard
**So that** I can efficiently enter transactions without using a mouse

**Acceptance Criteria:**
- **Given** the suggestion dropdown is open
- **When** I use arrow keys (↑/↓)
- **Then** I can navigate through the suggestion list with visual highlighting
- **And** Enter key selects the highlighted suggestion and closes dropdown
- **And** Escape key closes dropdown without selection
- **And** Tab key moves to next form field (closes suggestions)
- **And** dropdown has proper ARIA labels for screen readers


---

## UI Example

```
Create Transaction Form
┌─────────────────────────────────────┐
│ Account: [USD Checking ▼]           │
│ Amount:  [$150.00      ]           │
│ Type:    [Expense ▼]               │
│ Category:[Food & Dining ▼]         │
│ Date:    [2025-09-16]              │
│ Description: [Grocery stor...]      │
│             ┌─────────────────────┐ │
│             │ ✓ Grocery store     │ │  ← Dropdown appears
│             │   Grocery shopping  │ │     below input
│             │   Restaurant meal   │ │
│             │   Fast food lunch   │ │
│             └─────────────────────┘ │
│ [Cancel]              [Save]       │
└─────────────────────────────────────┘
```

---

### Testing

**Integration Testing (Development Environment)**

*Test Setup - Create Test Data*
- [ ] **Given** I reset database and create test account (USD Checking, $1000)
- [ ] **And** I create expense transactions with varied descriptions:
  - "Grocery store", "Grocery shopping", "Gas station", "Restaurant"
- [ ] **And** I create income transactions with varied descriptions:
  - "Salary", "Freelance payment", "Gift money"

*Test 1: Basic Functionality*
- [ ] **When** I select EXPENSE type and type "Gr"
- [ ] **Then** Dropdown shows "Grocery store", "Grocery shopping"
- [ ] **When** I select INCOME type and type "Sa"
- [ ] **Then** Dropdown shows "Salary"
- [ ] **When** I click "Salary" suggestion
- [ ] **Then** Description field is filled and dropdown closes

*Test 2: Case Sensitivity*
- [ ] **Given** I select EXPENSE type
- [ ] **When** I type "store"
- [ ] **Then** Dropdown shows "Grocery store"
- [ ] **When** I clear field and type "Store"
- [ ] **Then** No suggestions appear

*Test 3: Type Filtering*
- [ ] **When** I select EXPENSE type and type "Sa"
- [ ] **Then** No suggestions appear
- [ ] **When** I select INCOME type and type "Gr"
- [ ] **Then** No suggestions appear

*Test 4: Mouse Interaction*
- [ ] **When** I click outside dropdown while open
- [ ] **Then** Dropdown closes without affecting description field

*Test 5: Keyboard Navigation*
- [ ] **When** I type "Gr" and press Down arrow
- [ ] **Then** First suggestion is highlighted
- [ ] **When** I press Down arrow again
- [ ] **Then** Second suggestion is highlighted
- [ ] **When** I press Enter
- [ ] **Then** Highlighted suggestion fills field and dropdown closes
- [ ] **When** I type "Gr" and press Escape
- [ ] **Then** Dropdown closes without selection
- [ ] **When** I type "Gr" and press Tab
- [ ] **Then** Focus moves to next field

*Test 6: Edge Cases*
- [ ] **When** I type single character "g"
- [ ] **Then** No dropdown appears
- [ ] **When** I type "xyz"
- [ ] **Then** No suggestions appear
