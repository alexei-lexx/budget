# Research & Decision Summary: Display Deleted Account/Category Names

**Phase**: 0 - Research & Technical Decisions
**Date**: 2025-10-27
**Branch**: 007-show-deleted-names

## Problem Statement

When users delete accounts or categories, transactions that reference those deleted entities become confusing because the deleted names are no longer available. Users need to see the original account/category names even after deletion to maintain accurate transaction history and audit trails.

## Technical Approach Decision

### Chosen Approach: Option A (Minimal Lookup)

**Decision**: Use a minimal lookup approach with existing soft-delete pattern.

**Implementation Strategy**:
- Expose `isArchived` Boolean field in Account and Category GraphQL types (currently exists in database but not exposed in schema)
- Add `includeArchived: Boolean = false` parameter to `accounts` and `categories` queries
- When displaying transactions, fetch archived accounts/categories as needed
- Look up names at display time using existing repository methods
- Apply strikethrough CSS styling based on `isArchived` status

**Why This Approach**:
✅ **Minimal Schema Changes** - Only expose existing `isArchived` field + add parameter (no new data fields)
✅ **No Data Migration** - Soft-delete pattern already exists, no schema or data changes needed
✅ **No Operational Overhead** - Uses existing repository methods and database structure
✅ **Leverages Existing Pattern** - DynamoDB soft-delete with `isArchived` flag is proven
✅ **Future-Proof** - Can upgrade to snapshot approach (storing names on transaction) later if needed
✅ **Simplicity** - Applies YAGNI principle: don't add complexity you don't have

### Alternatives Considered

#### Option B: Snapshot Approach (Rejected)
**Description**: Store copies of account/category names on each transaction record at creation time.

**Advantages**:
- Single denormalized query for transaction + historical names
- No need to fetch archived entities
- Slightly faster display (no lookups)

**Why Rejected**:
- ❌ Requires data migration (add new fields to all existing transactions)
- ❌ Adds operational complexity (need to manage snapshots)
- ❌ Violates YAGNI - over-engineering for a simple display problem
- ❌ Increases transaction record size
- ❌ Can be implemented later if performance becomes an issue

#### Option C: Keep-Unarchived Copies (Rejected)
**Description**: When archiving, create a "snapshot" record separate from the active record.

**Why Rejected**:
- ❌ Breaks existing repository pattern
- ❌ Requires significant database schema changes
- ❌ More complex to maintain two copies of data
- ❌ Query complexity increases

## Key Technical Decisions

### 1. Schema Changes (Minimal)

**Backend GraphQL Schema** (`backend/src/schema.graphql`):
```graphql
type Account {
  id: ID!
  name: String!
  currency: String!
  initialBalance: Float!
  isArchived: Boolean!  # ← EXPOSE THIS (already exists in DB)
  # ... other fields
}

type Category {
  id: ID!
  name: String!
  type: String!
  isArchived: Boolean!  # ← EXPOSE THIS (already exists in DB)
  # ... other fields
}

type Query {
  accounts(includeArchived: Boolean = false): [Account!]!  # ← ADD PARAMETER
  categories(includeArchived: Boolean = false): [Category!]!  # ← ADD PARAMETER
  # ... other queries
}
```

### 2. Repository Layer Changes

**AccountRepository.findByUserId()**:
- Add optional `includeArchived` parameter (default: false)
- When false: filter out records where `isArchived = true`
- When true: include all records regardless of `isArchived` status

**CategoryRepository.findByUserId()**:
- Same pattern as AccountRepository

### 3. Frontend GraphQL Queries

**GET_ACCOUNTS Query**:
```graphql
query GetAccounts($includeArchived: Boolean = false) {
  accounts(includeArchived: $includeArchived) {
    id
    name
    isArchived
    # ... other fields
  }
}
```

**GET_CATEGORIES Query**:
```graphql
query GetCategories($includeArchived: Boolean = false) {
  categories(includeArchived: $includeArchived) {
    id
    name
    isArchived
    # ... other fields
  }
}
```

### 4. Component Level - Strikethrough Styling

**CSS Class**:
```css
.deleted-text {
  text-decoration: line-through;
  opacity: 0.7;
}
```

**Usage in TransactionCard.vue**:
```vue
<span :class="{ 'deleted-text': isAccountDeleted }">
  {{ transaction.account?.name }}
</span>
```

## Implementation Phases

### Phase 1: Backend GraphQL Schema
- Expose `isArchived` field in Account type
- Expose `isArchived` field in Category type
- Add `includeArchived` parameter to account query resolver
- Add `includeArchived` parameter to category query resolver

### Phase 2: Backend Repository Updates
- Update AccountRepository.findByUserId() to support `includeArchived` option
- Update CategoryRepository.findByUserId() to support `includeArchived` option
- Add tests for filtering behavior

### Phase 3: Frontend GraphQL Queries
- Update GET_ACCOUNTS query to request `isArchived` field and support variable
- Update GET_CATEGORIES query to request `isArchived` field and support variable
- Codegen will automatically update TypeScript types and composables

### Phase 4: Frontend Composables
- Update useAccounts composable to accept `{ includeArchived }` option
- Update useCategories composable to accept `{ includeArchived }` option

### Phase 5: Frontend Views & Components
- Update Transactions.vue to call `useAccounts({ includeArchived: true })`
- Update Transactions.vue to call `useCategories({ includeArchived: true })`
- Update TransactionCard.vue to add strikethrough styling
- Add `isAccountDeleted` and `isCategoryDeleted` computed properties/helpers

## Testing Strategy

### Backend Tests
- Test AccountRepository.findByUserId() with includeArchived=false (default, excludes archived)
- Test AccountRepository.findByUserId() with includeArchived=true (includes archived)
- Test CategoryRepository.findByUserId() with includeArchived=false
- Test CategoryRepository.findByUserId() with includeArchived=true
- Test GraphQL schema query resolvers pass includeArchived parameter correctly

### Frontend Tests
- Test useAccounts composable with includeArchived option
- Test useCategories composable with includeArchived option
- Test TransactionCard strikethrough styling logic
- Manual UI test: verify strikethrough appears for deleted entities

### Integration Tests
- Create account, record transaction, delete account
- Verify transaction displays original account name with strikethrough
- Same for categories

## Performance Considerations

- **No Performance Impact**: Uses existing database queries and repository methods
- **Query Efficiency**: No additional database round-trips (fetch all accounts/categories together)
- **Frontend**: Strikethrough styling is CSS-only, no runtime performance overhead
- **Target**: Same <1 second page load time as existing functionality

## Risk Assessment

**Low Risk**:
- ✅ Uses existing patterns and database structure
- ✅ No breaking changes to existing queries (includeArchived defaults to false)
- ✅ No data migration needed
- ✅ Minimal schema changes (just expose existing field + add parameter)

**Mitigation**:
- Backward compatible - existing queries work unchanged
- Default includeArchived=false prevents showing deleted entities unexpectedly
- Comprehensive tests validate filtering behavior
- CSS styling is non-invasive

## Rollout Strategy

1. Deploy backend (schema + repository changes)
2. Deploy frontend (queries + styling)
3. No database changes required
4. No migration scripts needed
5. Existing data continues to work as-is

## Open Questions / Future Considerations

- Future optimization: Could upgrade to snapshot approach if querydisplaying transactions with many deleted entities becomes slow
- Could add filter UI: "Show deleted entities" toggle in transaction filter bar
- Could add admin audit trail: track when entities were deleted
