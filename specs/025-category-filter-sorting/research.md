# Research: Category Filter Sorting Enhancement

**Feature**: 025-category-filter-sorting
**Date**: 2026-01-03
**Status**: Complete

## Overview

This document captures research findings for implementing unified alphabetical category sorting and visual type indicators in the transaction filter dropdown.

---

## Research Topic 1: localeCompare Options for Case-Insensitive Sorting

### Decision

Use `localeCompare()` with `{ sensitivity: 'base' }` option for case-insensitive alphabetical sorting.

```typescript
categories.sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
);
```

### Rationale

**Sensitivity Option Behavior:**
- `sensitivity: 'base'` ignores both case and accents when comparing strings
- "AAAAA" and "aaaaa" are treated as equal, so they sort together
- Maintains stable sort order within case-insensitive groups
- Follows Unicode Collation Algorithm (UCA) for proper international character handling
- Numbers sort before letters naturally (e.g., "401k" before "AAA")

**Why Not Other Options:**
- `sensitivity: 'accent'` would still be case-sensitive
- `sensitivity: 'case'` would separate uppercase and lowercase
- `sensitivity: 'variant'` is fully case and accent sensitive (default)
- Using `.toLowerCase()` before comparing is unnecessary and less performant

**Locale Parameter:**
- Set to `undefined` to use user's default locale
- Could be set to specific locale (e.g., `'en-US'`) for consistent behavior across users
- Recommendation: Use `undefined` for international user base

### Alternatives Considered

1. **Manual toLowerCase() + localeCompare()**
   - Rejected: Redundant preprocessing step
   - `sensitivity: 'base'` handles case-insensitivity natively

2. **Custom comparison with character code mapping**
   - Rejected: Reinventing the wheel
   - `localeCompare()` is well-tested and handles edge cases

3. **Third-party sorting library (e.g., Intl.Collator)**
   - Considered: `Intl.Collator` with caching for performance
   - Accepted for future optimization if needed
   - Not necessary for <100 categories (per performance requirement SC-004)

### Performance Impact

For 100 categories, sorting time is negligible (<1ms). The `localeCompare()` call overhead is acceptable given the small dataset size and infrequent operation (only when dropdown opens).

---

## Research Topic 2: Vuetify v-select Item Customization

### Decision

Use Vuetify's native `item` slot with `v-list-item` component and `append-icon` attribute.

```vue
<v-select
  v-model="filters.selectedCategoryIds.value"
  :items="categoryOptions"
  item-title="name"
  item-value="id"
  label="Category"
  multiple
  chips
  closable-chips
  clearable
  variant="outlined"
>
  <template #item="{ props, item }">
    <v-list-item
      v-bind="props"
      :append-icon="getCategoryIcon(item.raw.type)"
      :append-icon-color="getCategoryIconColor(item.raw.type)"
    />
  </template>
</v-select>
```

**Helper Functions:**
```typescript
const getCategoryIcon = (type: CategoryType) => {
  return type === CategoryType.INCOME ? 'mdi-cash-plus' : 'mdi-cash-minus';
};

const getCategoryIconColor = (type: CategoryType) => {
  return type === CategoryType.INCOME ? 'success' : 'error';
};
```

### Rationale

**Why This Approach:**
- Uses Vuetify's built-in slot system (standard Vue.js pattern)
- `v-list-item` is the recommended component for v-select items
- `append-icon` attribute positions icon to the right (per requirement FR-006)
- `append-icon-color` uses Vuetify's color system ('success', 'error')
- Minimal custom code, maximum framework integration
- Maintains accessibility (icons have semantic meaning via color system)

**Props Binding:**
- `v-bind="props"` passes through all necessary v-list-item configuration from v-select
- `item.raw` accesses the original category object with all properties

**Icon Design Consistency:**
- Reuses icons from Categories.vue tabs:
  - EXPENSE: `mdi-cash-minus` with `color="error"` (red)
  - INCOME: `mdi-cash-plus` with `color="success"` (green)

### Alternatives Considered

1. **Custom CSS with pseudo-elements**
   - Rejected: Not accessible, harder to maintain
   - Icons would be purely decorative, not semantic

2. **Prepend icon instead of append**
   - Rejected: Requirement FR-006 specifies "positioned to the right"
   - Tabs use left positioning, but dropdown requirement differs

3. **Custom item template with manual layout**
   - Rejected: Unnecessary complexity
   - `append-icon` handles positioning automatically

4. **Third-party Vue component library**
   - Rejected: Already using Vuetify
   - Constitution FR-001 (Frontend Code Discipline): "Use framework design system"

### Browser Compatibility

Material Design Icons (mdi-*) are icon fonts supported by all modern browsers. No additional dependencies required beyond existing Vuetify installation.

---

## Research Topic 3: CategoryService Design Pattern

### Decision

Create a domain entity service class following the established pattern in the codebase.

**CategoryService Structure:**
```typescript
import { ICategoryRepository, Category, CategoryType } from "../models/category";

/**
 * Category service class for handling business logic
 * Implements the service layer pattern for category operations
 */
export class CategoryService {
  constructor(private categoryRepository: ICategoryRepository) {}

  /**
   * Get all active categories for a user, optionally filtered by type
   * Categories are sorted alphabetically by name (case-insensitive)
   * @param userId - The user ID to fetch categories for
   * @param type - Optional category type filter (INCOME or EXPENSE)
   * @returns Promise<Category[]> - Alphabetically sorted categories
   */
  async getCategoriesByUser(
    userId: string,
    type?: CategoryType,
  ): Promise<Category[]> {
    if (type) {
      return await this.categoryRepository.findActiveByUserIdAndType(
        userId,
        type,
      );
    }
    return await this.categoryRepository.findActiveByUserId(userId);
  }
}
```

### Rationale

**Domain Entity Service Pattern:**
- Follows constitution mandate for service layer (Backend Layer Structure section)
- Represents the Category domain entity
- Exposes multiple public methods for category-related operations
- Current need: `getCategoriesByUser()` for resolver delegation
- Future extensibility: Can add `createCategory()`, `updateCategory()`, etc.

**Repository Dependency:**
- Constructor injection of `ICategoryRepository` (interface, not concrete class)
- Enables mocking in tests (service.test.ts with mocked repository)
- Follows existing pattern from TransactionService and AccountService

**Why Not Single-Purpose Service:**
- Category operations are standard CRUD, not complex unique business logic
- No multi-repository orchestration needed (only CategoryRepository dependency)
- Constitution states: "Default to domain entity services for standard entity operations"

**Business Logic Placement:**
- Sorting logic remains in repository layer (data access concern)
- Service layer orchestrates which repository method to call based on parameters
- Future business rules (e.g., category validation) would go in service layer

### Alternatives Considered

1. **Keep logic in resolver**
   - Rejected: Violates constitution Backend Layer Structure principle
   - Resolvers should only handle auth, validation, and transformation
   - Business orchestration belongs in service layer

2. **Single-purpose service with `call()` method**
   - Rejected: Not appropriate for standard entity operations
   - Constitution: "Use single-purpose services when complexity is high"

3. **Add sorting logic to service instead of repository**
   - Rejected: Sorting is a data access concern
   - Keeps repository focused on database operations
   - Service delegates to appropriate repository method

### Test Strategy

Following constitution test requirements:
- `category-service.test.ts` (co-located with service)
- Mock CategoryRepository in service tests (unit tests)
- Test orchestration logic: type parameter routing to correct repository method
- Repository tests verify actual sorting implementation (integration with DynamoDB Local)

---

## Implementation Impact Summary

### Backend Changes

1. **Create CategoryService** (`backend/src/services/category-service.ts`)
   - Domain entity service with `getCategoriesByUser()` method
   - Delegates to CategoryRepository

2. **Update CategoryRepository** (`backend/src/repositories/category-repository.ts`)
   - Remove type-based grouping in `findActiveByUserId()`
   - Remove `.toLowerCase()` preprocessing
   - Use `localeCompare()` with `{ sensitivity: 'base' }`

3. **Update Resolver** (`backend/src/resolvers/category-resolvers.ts`)
   - Inject CategoryService into resolver context
   - Delegate to `categoryService.getCategoriesByUser()`

### Frontend Changes

1. **Update TransactionFilterBar.vue** (`frontend/src/components/transactions/TransactionFilterBar.vue`)
   - Add `item` slot to v-select with `v-list-item` and `append-icon`
   - Add helper functions for icon name and color based on category type

### Test Updates

1. **category-repository.test.ts**: Update sorting test expectations
2. **category-service.test.ts**: New test file for service layer
3. **Manual testing**: Verify dropdown rendering and selection behavior

---

## Open Questions

None. All research questions resolved.

---

## References

- [MDN: String.prototype.localeCompare()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare)
- [Vuetify 3 Select Component Documentation](https://vuetifyjs.com/en/components/selects/)
- [Vuetify v-list-item API](https://vuetifyjs.com/en/api/v-list-item/)
- Project Constitution: Backend Layer Structure (v0.22.0)
- Existing codebase services: AccountService, TransactionService
