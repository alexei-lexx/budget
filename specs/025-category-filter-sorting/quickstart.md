# Quickstart: Category Filter Sorting Enhancement

**Feature**: 025-category-filter-sorting
**Date**: 2026-01-03
**Estimated Effort**: 4-6 hours

## TL;DR

**Goal**: Replace type-grouped category sorting with unified alphabetical sorting and add visual type indicators (icons) to the transaction filter dropdown.

**Changes:**
1. Create CategoryService (backend service layer)
2. Update CategoryRepository sorting logic
3. Update category resolver to use service
4. Add icon rendering to TransactionFilterBar dropdown

---

## Prerequisites

- [x] Read spec.md
- [x] Read research.md (understand sorting approach and Vuetify patterns)
- [x] Read data-model.md (understand data structures)
- [ ] Backend environment set up (DynamoDB Local running)
- [ ] Frontend dev server running

---

## Implementation Checklist

### Backend (Estimated: 3-4 hours)

#### 1. Create CategoryService (NEW FILE)

**File**: `backend/src/services/category-service.ts`

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

---

#### 2. Update CategoryRepository Sorting

**File**: `backend/src/repositories/category-repository.ts`

**Method**: `findActiveByUserId()` (around line 120)

**BEFORE:**
```typescript
// Sort categories by type first, then by name (case-insensitive)
return categories.sort((a, b) => {
  if (a.type !== b.type) {
    return a.type === CategoryType.INCOME ? -1 : 1;
  }
  return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
});
```

**AFTER:**
```typescript
// Sort categories alphabetically by name (case-insensitive, no type grouping)
return categories.sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
);
```

---

**Method**: `findActiveByUserIdAndType()` (around line 175)

**BEFORE:**
```typescript
// Sort categories by name (case-insensitive)
return categories.sort((a, b) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
);
```

**AFTER:**
```typescript
// Sort categories by name (case-insensitive)
return categories.sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
);
```

---

#### 3. Update Category Resolver

**File**: `backend/src/resolvers/category-resolvers.ts`

**Step 3a**: Add CategoryService to GraphQLContext

**File**: `backend/src/context.ts` (or wherever GraphQLContext is defined)

Add `categoryService: CategoryService` to the context interface and initialization.

**Step 3b**: Update Resolver

**BEFORE** (around line 35-62):
```typescript
categories: async (
  _parent: unknown,
  args: { type?: CategoryType },
  context: GraphQLContext,
) => {
  try {
    const user = await getAuthenticatedUser(context);

    if (args.type) {
      const categories =
        await context.categoryRepository.findActiveByUserIdAndType(
          user.id,
          args.type,
        );
      return categories;
    }

    const categories = await context.categoryRepository.findActiveByUserId(
      user.id,
    );
    return categories;
  } catch (error) {
    handleResolverError(error, "Failed to fetch categories");
  }
},
```

**AFTER**:
```typescript
categories: async (
  _parent: unknown,
  args: { type?: CategoryType },
  context: GraphQLContext,
) => {
  try {
    const user = await getAuthenticatedUser(context);
    return await context.categoryService.getCategoriesByUser(
      user.id,
      args.type,
    );
  } catch (error) {
    handleResolverError(error, "Failed to fetch categories");
  }
},
```

---

#### 4. Write Tests

**File**: `backend/src/services/category-service.test.ts` (NEW FILE)

```typescript
import { CategoryService } from './category-service';
import { ICategoryRepository, CategoryType } from '../models/category';

describe('CategoryService', () => {
  let mockRepository: jest.Mocked<ICategoryRepository>;
  let service: CategoryService;

  beforeEach(() => {
    mockRepository = {
      findActiveByUserId: jest.fn(),
      findActiveByUserIdAndType: jest.fn(),
    } as any;
    service = new CategoryService(mockRepository);
  });

  describe('getCategoriesByUser', () => {
    it('should call findActiveByUserId when no type provided', async () => {
      const userId = 'user123';
      const mockCategories = [
        { id: '1', name: 'Groceries', type: CategoryType.EXPENSE },
        { id: '2', name: 'Salary', type: CategoryType.INCOME },
      ];
      mockRepository.findActiveByUserId.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByUser(userId);

      expect(mockRepository.findActiveByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockCategories);
    });

    it('should call findActiveByUserIdAndType when type provided', async () => {
      const userId = 'user123';
      const type = CategoryType.INCOME;
      const mockCategories = [
        { id: '2', name: 'Salary', type: CategoryType.INCOME },
      ];
      mockRepository.findActiveByUserIdAndType.mockResolvedValue(mockCategories);

      const result = await service.getCategoriesByUser(userId, type);

      expect(mockRepository.findActiveByUserIdAndType).toHaveBeenCalledWith(userId, type);
      expect(result).toEqual(mockCategories);
    });
  });
});
```

**File**: `backend/src/repositories/category-repository.test.ts` (UPDATE EXISTING)

Update sorting test expectations to match new alphabetical-only behavior (no type grouping).

---

### Frontend (Estimated: 1-2 hours)

#### 5. Update TransactionFilterBar Component

**File**: `frontend/src/components/transactions/TransactionFilterBar.vue`

**Step 5a**: Add helper functions in `<script setup>` section

Add after the existing imports and before the component logic:

```typescript
import { CategoryType } from '@/gql/graphql';

// Helper functions for category icons
const getCategoryIcon = (type: CategoryType) => {
  return type === CategoryType.Income ? 'mdi-cash-plus' : 'mdi-cash-minus';
};

const getCategoryIconColor = (type: CategoryType) => {
  return type === CategoryType.Income ? 'success' : 'error';
};
```

**Step 5b**: Update v-select template

**FIND** (around line 35-50):
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
  :disabled="loading"
  clearable
  variant="outlined"
/>
```

**REPLACE WITH**:
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
  :disabled="loading"
  clearable
  variant="outlined"
>
  <template #item="{ props, item }">
    <v-list-item
      v-bind="props"
      :append-icon="getCategoryIcon(item.raw.type)"
    >
      <template #append>
        <v-icon :color="getCategoryIconColor(item.raw.type)">
          {{ getCategoryIcon(item.raw.type) }}
        </v-icon>
      </template>
    </v-list-item>
  </template>
</v-select>
```

**Note**: The `append` slot approach gives more control over icon color than `append-icon` attribute.

---

### Testing (Estimated: 1 hour)

#### Backend Tests
```bash
cd backend
npm test -- category-service.test.ts
npm test -- category-repository.test.ts
```

#### Frontend Manual Testing

1. **Start dev servers:**
   ```bash
   # Terminal 1: DynamoDB Local
   docker-compose up dynamodb-local

   # Terminal 2: Backend
   cd backend
   npm run dev

   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

2. **Test Scenarios:**

   **TC1: Alphabetical Sorting**
   - Create categories: "Zebra" (Expense), "Apple" (Income), "Banana" (Expense)
   - Open transaction filter dropdown
   - ✓ Verify order: Apple, Banana, Zebra (no type grouping)

   **TC2: Case-Insensitive Sorting**
   - Create categories: "Travel" (Expense), "APPLE" (Income), "apple" (Expense)
   - Open transaction filter dropdown
   - ✓ Verify "APPLE" and "apple" sort together
   - ✓ Verify original casing preserved in display

   **TC3: Numeric Sorting**
   - Create categories: "Travel", "401k Contribution", "Savings"
   - ✓ Verify order: 401k Contribution, Savings, Travel

   **TC4: Icon Display**
   - Create mixed income and expense categories
   - Open transaction filter dropdown
   - ✓ Verify INCOME categories show green `mdi-cash-plus` on right
   - ✓ Verify EXPENSE categories show red `mdi-cash-minus` on right

   **TC5: Duplicate Names**
   - Create "Refund" (INCOME) and "Refund" (EXPENSE)
   - Open transaction filter dropdown
   - ✓ Verify both appear
   - ✓ Verify distinguishable by icon color/type

   **TC6: Filter Functionality**
   - Select a category from dropdown
   - Apply filter
   - ✓ Verify transactions filtered correctly
   - ✓ Verify backward compatibility maintained

---

## Code Quality Checklist

- [ ] Run `npm run format` in both backend and frontend
- [ ] Fix all ESLint issues
- [ ] Run `npm run typecheck` in both packages
- [ ] All tests passing
- [ ] No console errors in browser

---

## Common Issues & Solutions

### Issue: "categoryService is not defined in context"

**Solution**: Ensure CategoryService is instantiated and added to GraphQL context in `backend/src/context.ts` or wherever context is created.

```typescript
import { CategoryService } from './services/category-service';

// In context creation function:
const categoryService = new CategoryService(categoryRepository);
// Add to context object
```

---

### Issue: Icons not showing in dropdown

**Solution**:
1. Verify Material Design Icons are loaded (check other icons work)
2. Check `item.raw.type` is accessible in template
3. Ensure `CategoryType` enum imported correctly
4. Check browser console for errors

---

### Issue: "localeCompare is not a function"

**Solution**: Verify TypeScript target supports `localeCompare` with options. Should be ES2015+ (already configured in tsconfig.json).

---

### Issue: Sorting tests failing

**Solution**: Update test expectations to match new behavior (no type grouping). Example:

```typescript
// OLD expectation
expect(categories.map(c => c.name)).toEqual([
  'Salary',    // INCOME
  'Bonus',     // INCOME
  'Groceries', // EXPENSE
  'Travel',    // EXPENSE
]);

// NEW expectation (alphabetical only)
expect(categories.map(c => c.name)).toEqual([
  'Bonus',
  'Groceries',
  'Salary',
  'Travel',
]);
```

---

## Next Steps After Implementation

1. Update `specs/025-category-filter-sorting/tasks.md` with actual implementation tasks
2. Create GitHub issue/PR (if using issue tracker)
3. Manual QA testing on all screen sizes (mobile, tablet, desktop)
4. Performance testing with 100+ categories
5. Update user documentation (if applicable)

---

## Rollback Instructions

If critical issues found in production:

1. **Backend rollback:**
   ```bash
   git revert <commit-hash-of-service-changes>
   git revert <commit-hash-of-repository-changes>
   ```

2. **Frontend rollback:**
   ```bash
   git revert <commit-hash-of-filter-bar-changes>
   ```

3. **Redeploy:**
   ```bash
   ./deploy.sh
   ```

No database rollback needed (no schema changes).

---

## Resources

- [research.md](./research.md) - Detailed research findings
- [data-model.md](./data-model.md) - Data model documentation
- [spec.md](./spec.md) - Full feature specification
- [Constitution](/.specify/memory/constitution.md) - Architecture guidelines
