# Data Model: Category Filter Sorting Enhancement

**Feature**: 025-category-filter-sorting
**Date**: 2026-01-03

## Overview

This feature does not introduce new entities or modify existing data structures. It only changes the **presentation layer** (sorting and visual display) of existing Category entities.

---

## Existing Entities (No Changes)

### Category

Represents a classification for transactions (income or expense).

**Fields:**
- `id` (string, UUID): Unique identifier
- `name` (string): Category display name (case-sensitive, preserved as entered)
- `type` (CategoryType enum): INCOME or EXPENSE
- `userId` (string): Owner of the category
- `isArchived` (boolean): Soft-deletion flag
- `createdAt` (string): ISO timestamp
- `updatedAt` (string): ISO timestamp

**Validation Rules:**
- Name is case-sensitive; "Travel" and "travel" are distinct categories
- Multiple categories can have the same name if they have different types
- `isArchived: false` categories are considered "active"

**State Transitions:**
- No state machine; category type is immutable after creation
- Categories can be archived (soft-deleted) but not un-archived

**Relationships:**
- One-to-many with Transaction (one category has many transactions)
- Belongs to User (userId foreign key)

---

### Transaction

References a Category for classification.

**Relevant Fields for This Feature:**
- `categoryId` (string, UUID, optional): Reference to Category entity
- `type` (TransactionType enum): INCOME, EXPENSE, REFUND, TRANSFER_IN, TRANSFER_OUT

**Business Rule:**
- Filtering by category matches both `categoryId` AND category `type`
- Ensures income categories only filter income transactions
- Ensures expense categories only filter expense/refund transactions

---

## Data Access Patterns (Changes)

### Current Behavior

**CategoryRepository.findActiveByUserId(userId: string)**
- Returns: `Category[]`
- Current sort: Type first (INCOME, then EXPENSE), then alphabetically within type
- Uses `.toLowerCase()` for case-insensitive comparison

**CategoryRepository.findActiveByUserIdAndType(userId: string, type: CategoryType)**
- Returns: `Category[]`
- Current sort: Alphabetically (case-insensitive with `.toLowerCase()`)

### New Behavior

**CategoryRepository.findActiveByUserId(userId: string)**
- Returns: `Category[]`
- **New sort**: Alphabetically only (no type grouping)
- **New comparison**: `localeCompare()` with `{ sensitivity: 'base' }`
- Categories with names differing only in case sort together (e.g., "Travel", "travel")
- Numbers sort before letters (e.g., "401k", "AAA", "Travel")

**CategoryRepository.findActiveByUserIdAndType(userId: string, type: CategoryType)**
- Returns: `Category[]`
- **New comparison**: `localeCompare()` with `{ sensitivity: 'base' }`
- Otherwise unchanged (already sorts alphabetically)

---

## GraphQL Schema (No Changes)

```graphql
type Category {
  id: ID!
  name: String!
  type: CategoryType!
  createdAt: String!
  updatedAt: String!
}

enum CategoryType {
  INCOME
  EXPENSE
}

type Query {
  categories(type: CategoryType): [Category!]!
}
```

**Notes:**
- Internal fields (`userId`, `isArchived`) not exposed in GraphQL schema
- Sorting is internal implementation detail, not part of API contract
- Frontend receives categories in new sorted order transparently

---

## Service Layer (New)

### CategoryService

**Purpose**: Orchestrate category retrieval and enforce business rules.

**Methods:**
```typescript
getCategoriesByUser(userId: string, type?: CategoryType): Promise<Category[]>
```

**Business Logic:**
- If `type` provided, delegate to `categoryRepository.findActiveByUserIdAndType()`
- If no `type`, delegate to `categoryRepository.findActiveByUserId()`
- Sorting logic remains in repository layer (data access concern)

**Future Extensibility:**
- Can add validation for category creation/updates
- Can add cross-repository operations (e.g., category usage analytics)

---

## Frontend Data Flow (Changes)

### Current Flow
1. TransactionFilterBar receives `categories` prop from parent
2. `categories` prop comes from `useCategories()` composable
3. `useCategories()` calls `useGetCategoriesQuery()` (GraphQL)
4. Categories displayed in v-select without modification

### New Flow (No Structural Changes, Visual Enhancement Only)
1. Same as current flow through step 4
2. **NEW**: v-select `item` slot renders `v-list-item` with `append-icon`
3. Icon name/color determined by `category.type` field
4. User sees category name + colored icon (income: green plus, expense: red minus)

---

## Migration Requirements

**None.** No database schema changes, no data migrations needed.

---

## Performance Considerations

**Sorting Performance:**
- `localeCompare()` with options has ~O(n log n) complexity for n categories
- For 100 categories: <1ms overhead (negligible)
- Well within SC-004 requirement (<300ms total render time)

**Caching:**
- GraphQL query results already cached by Apollo Client
- No additional caching needed for this feature

---

## Constraints & Assumptions

**Constraints:**
- Maintain backward compatibility with existing transaction filtering
- Preserve all current category functionality
- Follow existing design system for icons and colors

**Assumptions:**
- Users can create categories with identical names (different types)
- Case variations ("Travel" vs "travel") are distinct categories
- Standard Unicode/ASCII collation is acceptable for all locales
- Icon-based type indicators are sufficient (no text labels needed)

---

## Test Data Scenarios

### Sorting Test Cases

**Mixed case names:**
- Input: ["Zebra", "Apple", "banana", "APPLE", "zebra"]
- Expected: ["Apple", "APPLE", "banana", "Zebra", "zebra"]
- (Case-insensitive grouping, stable sort within groups)

**Numeric prefixes:**
- Input: ["Travel", "401k Contribution", "Savings", "529 Plan"]
- Expected: ["401k Contribution", "529 Plan", "Savings", "Travel"]
- (Numbers before letters)

**Special characters:**
- Input: ["Coffee & Tea", "Groceries", "!Important", "@Work"]
- Expected: ["!Important", "@Work", "Coffee & Tea", "Groceries"]
- (Unicode collation order)

**Type mixing (no longer grouped):**
- Input: [
    {name: "Salary", type: INCOME},
    {name: "Groceries", type: EXPENSE},
    {name: "Bonus", type: INCOME},
  ]
- Expected order: Bonus, Groceries, Salary
- (Alphabetical regardless of type)

### Icon Display Test Cases

**All INCOME categories:**
- Should show green `mdi-cash-plus` for all items
- No EXPENSE categories present (consistent icon display)

**All EXPENSE categories:**
- Should show red `mdi-cash-minus` for all items

**Mixed INCOME and EXPENSE:**
- Each category shows appropriate icon based on `type` field
- Icons positioned to the right of category name

**Duplicate names, different types:**
- "Refund" (INCOME): green plus icon
- "Refund" (EXPENSE): red minus icon
- Both visible in dropdown, distinguishable by icon

---

## Rollback Plan

If issues arise, rollback is simple:
1. Revert CategoryRepository sorting changes (restore type grouping)
2. Remove v-select item slot from TransactionFilterBar.vue
3. Revert CategoryService creation (restore resolver direct calls)

No database rollback needed (no schema/data changes).
