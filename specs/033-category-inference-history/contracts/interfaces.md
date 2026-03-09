# Interface Contracts

No GraphQL schema changes.

---

## `CategoryData` — new field

```typescript
// backend/src/services/agent-data-service.ts
export interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  isArchived: boolean;
  recentDescriptions: string[]; // always present
}
```

---

## `getCategories` tool response

**Before**:
```json
[{ "id": "cat-1", "name": "Eating out", "type": "EXPENSE", "isArchived": false }]
```

**After**:
```json
[{
  "id": "cat-1",
  "name": "Eating out",
  "type": "EXPENSE",
  "isArchived": false,
  "recentDescriptions": ["banana & juice for snack", "fruit salad for lunch", "yogurt from corner shop"]
}]
```

---

## System prompt — Category section

One word change: `MUST` → `may` on the history lookup, making the `getTransactions` call optional instead of mandatory (embedded examples already cover the common case).

**Before**:
```
- MUST look up past transactions for history-based criteria — do not guess
```

**After**:
```
- May look up past transactions for history-based criteria — do not guess
```

---

## `getCategories` tool prose string

The `name: "getCategories"` tool has a prose string (`ToolSignature.description`) the model reads to understand what the tool returns. It is updated to surface the new field:

**Before**: `"Get user categories filtered by scope."`

**After**: `"Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised."`

