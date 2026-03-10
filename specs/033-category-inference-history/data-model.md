# Data Model: Improve Category Inference Using Recent Transaction History

No new tables, indexes, migrations, or repository methods.

---

## `CategoryData` — new field

**File**: `backend/src/services/agent-data-service.ts`

```typescript
export interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
  recentDescriptions: string[]; // always present; [] when no history
}
```

---

## New constants

**File**: `backend/src/services/agent-data-service.ts`

```typescript
const CATEGORY_HISTORY_LOOKBACK_DAYS = 90;
const CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10;
```

---

## Enrichment in `AgentDataService.getCategories`

```
1. Fetch categories, filter by scope  (existing)
2. Build a Set of the returned category IDs (scoped to whatever scope was requested)
3. lookbackDate = today − CATEGORY_HISTORY_LOOKBACK_DAYS
4. Paginate transactionRepository.findActiveByUserId(userId, pagination, { dateAfter: lookbackDate, dateBefore: today })
   collecting all Transaction nodes into a flat array
5. qualifying = array.filter(t => t.categoryId && t.description)
6. qualifying = qualifying.filter(t => categoryIdSet.has(t.categoryId))
   (drops transactions referencing categories outside the returned set)
7. Group description strings by categoryId;
   keep the first CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY per group
8. For each category, attach its description list (or [])
9. Return enriched array
```
