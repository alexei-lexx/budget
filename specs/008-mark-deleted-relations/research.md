# Phase 0 Research: Mark Deleted Accounts and Categories

**Date**: 2025-10-29
**Purpose**: Resolve technical unknowns and confirm architecture alignment before design phase

## Research Tasks

### Task 1: Verify Archived Field in GraphQL Schema

**Question**: Does the GraphQL schema already include an `archived` field on Account and Category types?

**Investigation Method**:
1. Check `backend/src/schema.graphql` for Account type definition
2. Check `backend/src/schema.graphql` for Category type definition
3. Verify if `archived: Boolean!` field is present in both types

**Status**: PENDING

---

### Task 2: Verify Transaction Query Selections

**Question**: Do current transaction GraphQL queries select the `archived` field from embedded Account and Category objects?

**Investigation Method**:
1. Check `frontend/src/graphql/queries/transactions.ts` for transaction query definition
2. Look for Account and Category selections within transaction query
3. Verify if `archived` field is included in selections
4. Check if selections need to be updated

**Status**: PENDING

---

### Task 3: Accessibility & Styling Approach

**Question**: What is the best practice for implementing aria-labels on Vuetify text components, and how should strikethrough styling be applied?

**Investigation Method**:
1. Review Vuetify 3 documentation for accessibility patterns
2. Check existing codebase for aria-label usage examples
3. Review Vue 3 best practices for conditional styling
4. Determine: inline styles vs. CSS classes vs. scoped styles

**Suggested Approach**:
- Use Vue's `:class` binding for conditional strikethrough class
- Add aria-label directly to component template with string interpolation
- Create reusable component or utility function for deleted reference rendering
- Define strikethrough style in component-scoped CSS (`<style scoped>`)

**Status**: PENDING

---

### Task 4: Identify Transaction Display Locations

**Question**: Where are transaction account/category names displayed in the frontend application?

**Investigation Method**:
1. Search for components that display transaction data
2. Identify all locations where `transaction.account.name` and `transaction.category.name` are rendered
3. Map components that need modification (e.g., TransactionCard, transaction list, transaction detail)

**Suspected Locations**:
- `TransactionCard.vue` - Primary transaction list display
- Transaction detail/expand views
- Possibly: account pages showing related transactions
- Possibly: category pages showing related transactions

**Status**: PENDING

---

## Research Findings

### Finding 1: Archived Field Status

**Question**: Task 1 - Does GraphQL schema include archived field on Account/Category?
**Finding**: ✅ **YES - PARTIAL IMPLEMENTATION EXISTS**

The main Account and Category types in `backend/src/schema.graphql` do NOT have an `archived` field directly. However, the embedded types used in transactions DO have `isArchived` fields:

- `TransactionEmbeddedAccount.isArchived: Boolean!`
- `TransactionEmbeddedCategory.isArchived: Boolean!`

These embedded types are perfect for this feature since they reflect the current archived state at query time.

**Conclusion**: No schema changes needed. The `isArchived` field is already available in transaction data.

---

### Finding 2: Query Selections

**Question**: Task 2 - Are archived fields included in transaction queries?
**Finding**: ✅ **YES - DATA IS ALREADY FETCHED**

The transaction GraphQL queries in `frontend/src/graphql/fragments.ts` (TRANSACTION_FRAGMENT) already select the `isArchived` field from both embedded account and category objects:

```graphql
fragment TransactionFields on Transaction {
  id
  account {
    id
    name
    isArchived  # ✅ Already selected
  }
  category {
    id
    name
    isArchived  # ✅ Already selected
  }
  # ... other fields
}
```

**Conclusion**: No query changes needed. All required data is already being fetched by existing queries.

---

### Finding 3: Accessibility & Styling

**Question**: Task 3 - Best practice for aria-labels and strikethrough styling?
**Finding**: ✅ **ESTABLISHED PATTERNS IN CODEBASE**

Existing Patterns Found:
- Conditional CSS classes using `:class` binding (e.g., `:class="{ expanded: isExpanded }"`)
- Scoped styles with Vuetify theming variables (e.g., `var(--v-theme-*)`)
- Responsive design using `$vuetify.display` helpers
- Transition effects for interactive states

**IMPORTANT DISCOVERY**: No existing `aria-label` usage found in any Vue components. This feature will introduce a new accessibility pattern to the codebase.

**Recommended Pattern**:
```vue
<span
  :class="{ 'account-deleted': account.isArchived }"
  :aria-label="account.isArchived ? `Deleted: ${account.name}` : undefined"
  :title="account.isArchived ? 'Archived account' : ''"
>
  {{ account.name }}
</span>

<style scoped>
.account-deleted {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--v-theme-on-surface-variant);
}
</style>
```

---

### Finding 4: Display Locations

**Question**: Task 4 - Where are transaction account/category names displayed?
**Finding**: ✅ **PRIMARY LOCATION IDENTIFIED**

**Main Component**: `/frontend/src/components/transactions/TransactionCard.vue`
- Currently receives `accountName` and `categoryName` as string props
- Displays names in a transaction header: `{{ formattedDate }} • {{ accountName }} • {{ categoryName }}`
- Does NOT use `isArchived` data (available but unused)

**Parent View**: `/frontend/src/views/Transactions.vue`
- Passes account and category names to TransactionCard
- Has access to full transaction objects with embedded archived status
- Currently not passing `isArchived` flags to child component

**Other Possible Locations**:
- Transaction detail/expanded views (likely uses same TransactionCard)
- Account pages showing related transactions (if applicable)
- Category pages showing related transactions (if applicable)

**Conclusion**: TransactionCard is the primary component to modify. Changes to this component will affect all transaction displays in the application.

---

## Design Decisions

Based on specification and research findings:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Deletion Detection | Check `isArchived` flag on embedded object | Already available in GraphQL; soft-delete pattern confirmed |
| GraphQL Changes | None required | Embedded account/category already include `isArchived` field |
| Query Changes | None required | Transaction queries already select `isArchived` field |
| Component Props | Add `accountIsArchived` and `categoryIsArchived` boolean props | Keeps TransactionCard simple and dumb (presentational) |
| Visual Style | CSS `text-decoration: line-through` + reduced opacity | Standard, accessible, consistent with Material Design |
| Accessibility | aria-label with "Deleted: " prefix + title attribute | Required for screen readers; provides hover tooltip |
| Styling Implementation | Vue `:class` binding + scoped CSS with Vuetify vars | Aligns with existing codebase patterns |
| Primary Modification | TransactionCard.vue component | Single source of truth for all transaction displays |
| Reusability | Conditional rendering within TransactionCard | Simpler than extracting separate component; handles both account and category |

---

## Phase 0 Completion Summary

✅ **All research tasks completed successfully**

**Key Findings**:
1. **GraphQL Schema**: `isArchived` field already exists on embedded types ✅
2. **Queries**: Data already being fetched, no changes needed ✅
3. **Styling**: Established patterns exist, aria-label usage is new ✅
4. **Components**: TransactionCard.vue is primary target ✅
5. **Implementation Scope**: Frontend-only, minimal changes ✅

**Technical Approach Confirmed**:
- Pass `accountIsArchived` and `categoryIsArchived` props from parent view to TransactionCard
- Add conditional styling using Vue `:class` binding
- Apply Vuetify-aligned CSS with strikethrough + opacity reduction
- Add aria-label and title attributes for accessibility
- No backend changes required

---

## Proceeding to Phase 1: Design & Contracts

Ready to create:
- `data-model.md` - Data flow and component prop contracts
- `contracts/` - GraphQL and component interface definitions
- `quickstart.md` - Quick reference for implementation
