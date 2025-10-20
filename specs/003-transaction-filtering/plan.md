# Implementation Plan: Transaction Filtering

**Branch**: `003-transaction-filtering` | **Date**: 2025-10-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-transaction-filtering/spec.md`

## Summary

Implement comprehensive transaction filtering on the transactions page with four filter dimensions: Account (multi-select), Category (multi-select with uncategorized option), Date Range (inclusive dateAfter/dateBefore), and Transaction Type (multi-select: INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT). Filters work individually or in any combination, require explicit "Apply" button click to activate, and utilize existing DynamoDB indexes (UserDateIndex, UserCreatedAtIndex) with FilterExpression for optimal performance at personal finance app scale.

**Technical Approach**: Extend existing GraphQL `transactions` query with optional `filters` parameter. Backend uses smart index selection (UserDateIndex for date-based queries, UserCreatedAtIndex otherwise) with DynamoDB FilterExpression for account/category/type filtering. Frontend provides multi-select dropdown UI for all filters with Apply/Clear buttons. No new DynamoDB GSIs required - cost/complexity analysis shows FilterExpression approach is optimal for multi-select filters and future extensibility.

## Technical Context

**Language/Version**: TypeScript 4.9+ (Node.js 22.x backend, Browser frontend)
**Primary Dependencies**:
- Backend: Apollo Server 4.x, @aws-sdk/lib-dynamodb 3.x, Zod 3.x
- Frontend: Vue 3.4+, Vuetify 3.x, @vue/apollo-composable 4.x

**Storage**: AWS DynamoDB with Pay-Per-Request billing
- Existing GSIs: UserCreatedAtIndex (userId + createdAt), UserDateIndex (userId + date)
- No new GSIs required

**Testing**:
- Backend: Jest with DynamoDB Local
- Frontend: Manual testing only

**Target Platform**:
- Backend: AWS Lambda (Node.js 22.x runtime)
- Frontend: Modern browsers (Chrome/Firefox/Safari/Edge latest 2 versions)

**Project Type**: Web application (separate backend and frontend)

**Constraints**:
- Query response time < 1 second (target < 200ms for p95)
- Support pagination with filters active
- Backward compatible (existing queries without filters continue to work)
- No new AWS infrastructure required

**Scale/Scope**:
- Personal finance app scale: ~5,000 transactions per user
- Expected query volume: 10-50 filtered queries per user per day
- All four filter dimensions with multi-select support (16 possible combinations)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASS (No constitution file present - using template project standards)

**Evaluation**:
- No custom constitution defined in `.specify/memory/constitution.md`
- Following existing project patterns and architecture
- No new complexity introduced (extends existing GraphQL schema and repository patterns)
- Uses established testing frameworks (Jest for backend, manual testing for frontend)
- No violations detected

## Project Structure

### Documentation (this feature)

```
specs/003-transaction-filtering/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (input)
├── research.md          # Phase 0 output (DynamoDB index strategy analysis)
├── data-model.md        # Phase 1 output (GraphQL types and data structures)
├── quickstart.md        # Phase 1 output (implementation steps)
├── contracts/           # Phase 1 output (GraphQL schema extension)
│   └── graphql-schema.graphql
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── schema.graphql                      # [MODIFY] Add TransactionFilterInput, extend transactions query
│   ├── resolvers/
│   │   └── transactionResolvers.ts         # [MODIFY] Add filters parameter validation and pass-through
│   ├── services/
│   │   └── TransactionService.ts           # [MODIFY] Add filters parameter to getTransactionsByUser
│   ├── repositories/
│   │   └── TransactionRepository.ts        # [MODIFY] Extend findActiveByUserId with filter logic
│   └── models/
│       └── Transaction.ts                  # [REVIEW] Confirm TransactionType enum exists
└── tests/
    └── repositories/
        └── TransactionRepository.test.ts   # [NEW] Add filter combination tests

frontend/
├── src/
│   ├── schema.graphql                      # [SYNC] Auto-synced from backend
│   ├── graphql/
│   │   └── transactions.ts                 # [MODIFY] Add filters parameter to query
│   ├── composables/
│   │   ├── useTransactions.ts              # [MODIFY] Accept and pass filters to query
│   │   └── useTransactionFilters.ts        # [NEW] Filter state management with Apply button logic
│   ├── components/
│   │   └── TransactionFilterBar.vue        # [NEW] Filter UI with Account/Category/Date/Type filters
│   └── __generated__/
│       └── graphql-types.ts                # [AUTO-GENERATED] Via codegen after schema sync
```

**Structure Decision**: Web application with separate backend (GraphQL API) and frontend (Vue 3 SPA). Backend uses layered architecture (Resolvers → Services → Repositories). Frontend uses composables for state management and reusable business logic. All filtering logic implemented in repository layer using DynamoDB FilterExpression.

## Complexity Tracking

*No violations - this section not applicable*

## Phase 0: Research & Decisions

See [research.md](./research.md) for complete analysis.

**Key Research Areas**:
1. DynamoDB index strategy for multi-dimensional filtering
2. Multi-select filter implementation patterns
3. FilterExpression vs. new GSI cost/benefit analysis
4. Query performance optimization strategies
5. Frontend filter state management patterns

**Critical Decisions**:
- ✅ Use existing GSIs (no new indexes)
- ✅ FilterExpression for account/category/type filters
- ✅ Multi-select UI for all filterable dimensions
- ✅ Apply button pattern (no auto-apply on filter changes)

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete type definitions.

**Key Types**:
- `TransactionFilterInput` (GraphQL input type)
- `TransactionFilters` (Frontend composable state)
- Extended `transactions` query with optional `filters` parameter

### API Contracts

See [contracts/graphql-schema.graphql](./contracts/graphql-schema.graphql) for complete schema extension.

**GraphQL Schema Changes**:
```graphql
input TransactionFilterInput {
  accountIds: [ID!]
  categoryIds: [ID!]
  includeUncategorized: Boolean
  dateAfter: String  # YYYY-MM-DD
  dateBefore: String # YYYY-MM-DD
  types: [TransactionType!]
}

extend type Query {
  transactions(
    pagination: PaginationInput
    filters: TransactionFilterInput  # NEW: Optional filters
  ): TransactionConnection!
}
```

**Backward Compatibility**: ✅ Filters parameter is optional - existing queries work unchanged

### Implementation Quickstart

See [quickstart.md](./quickstart.md) for detailed step-by-step implementation guide.

**Implementation Phases**:
1. Backend Schema & Types
2. Backend Repository (DynamoDB filtering logic)
3. Backend Service & Resolver
4. Frontend Schema Sync & Types
5. Frontend Composables & UI
6. Testing & Integration

## Phase 2: Task Generation

**Command**: `/speckit.tasks` (NOT executed by `/speckit.plan`)

This command will generate [tasks.md](./tasks.md) with:
- Dependency-ordered implementation tasks
- Test requirements for each component
- Integration testing scenarios
- Deployment checklist

## DynamoDB Query Strategy

**Index Selection Logic**:
```typescript
// Choose index based on filter presence
const indexName = filters?.dateAfter || filters?.dateBefore
  ? "UserDateIndex"      // Use when date filters present
  : "UserCreatedAtIndex"; // Use for non-date queries
```

**Filter Combinations Supported** (16 total):
| Account | Category | Date | Type | Query Strategy |
|---------|----------|------|------|----------------|
| ✓ | - | - | - | UserCreatedAtIndex + FilterExpression(account IN) |
| - | ✓ | - | - | UserCreatedAtIndex + FilterExpression(category IN OR null) |
| - | - | ✓ | - | UserDateIndex + KeyConditionExpression(date BETWEEN) |
| - | - | - | ✓ | UserCreatedAtIndex + FilterExpression(type IN) |
| ✓ | ✓ | - | - | UserCreatedAtIndex + FilterExpression(account AND category) |
| ✓ | - | ✓ | - | UserDateIndex + KeyCondition(date) + FilterExpression(account) |
| ✓ | - | - | ✓ | UserCreatedAtIndex + FilterExpression(account AND type) |
| - | ✓ | ✓ | - | UserDateIndex + KeyCondition(date) + FilterExpression(category) |
| - | ✓ | - | ✓ | UserCreatedAtIndex + FilterExpression(category AND type) |
| - | - | ✓ | ✓ | UserDateIndex + KeyCondition(date) + FilterExpression(type) |
| ✓ | ✓ | ✓ | - | UserDateIndex + KeyCondition(date) + FilterExpression(account AND category) |
| ✓ | ✓ | - | ✓ | UserCreatedAtIndex + FilterExpression(account AND category AND type) |
| ✓ | - | ✓ | ✓ | UserDateIndex + KeyCondition(date) + FilterExpression(account AND type) |
| - | ✓ | ✓ | ✓ | UserDateIndex + KeyCondition(date) + FilterExpression(category AND type) |
| ✓ | ✓ | ✓ | ✓ | UserDateIndex + KeyCondition(date) + FilterExpression(all three) |
| - | - | - | - | No filters (all transactions) |

**Performance Characteristics**:
- With date filter: Scan ~100-500 items (typical month), <100ms response
- Without date filter: Scan ~5,000 items (worst case), <200ms response
- RCU cost: ~1-5 RCU per query (negligible at personal finance scale)

## UI/UX Design

**Filter Layout** (Order: Account → Category → Date → Type):

```
┌──────────────────────────────────────────────────────────┐
│ Transaction Filters                                      │
├──────────────────────────────────────────────────────────┤
│ Account                [Multi-select dropdown]        ▼  │
│ Category               [Multi-select dropdown]        ▼  │
│ Date Range  From: [YYYY-MM-DD]  To: [YYYY-MM-DD]        │
│ Type                   [Multi-select dropdown]        ▼  │
│                                                           │
│ [Apply]  [Clear]                                         │
└──────────────────────────────────────────────────────────┘
```

**Interaction Flow**:
1. User selects filter criteria (no query triggered)
2. User clicks "Apply" button
3. Query executes with selected filters
4. Transaction list updates with filtered results
5. Pagination "Load More" loads additional matching transactions

**State Management**:
- `selectedFilters`: User's current selections (UI state)
- `appliedFilters`: Filters actually used in query (activated on Apply click)
- Clear button resets `selectedFilters` (requires Apply to take effect)

## Testing Strategy

**Backend Tests**:
- Repository: FilterExpression builder for all filter combinations
- Repository: Pagination with filters active
- Service: Date format validation
- Resolver: Zod input validation
- Integration: End-to-end filtering scenarios

**Frontend Testing**:
- Manual testing only (no automated tests)
- Test scenarios:
  - Filter by each dimension independently
  - Combine all four filter types
  - Invalid date range handling
  - Empty result set handling
  - Pagination with filters active
  - Apply/Clear button behavior
  - Multi-select interactions

## Migration & Deployment

**Database Changes**: ✅ None required (uses existing GSIs)

**Schema Changes**: ✅ Backward compatible (filters parameter is optional)

**Deployment Order**:
1. Deploy backend (GraphQL schema extended, resolvers updated)
2. Frontend schema sync automatically pulls new schema
3. Deploy frontend (new filter UI components)

**Rollback Plan**:
- Frontend: Revert to previous version (backend remains backward compatible)
- Backend: Optional filters parameter means existing queries continue working

## Risk Assessment

**Low Risk**:
- ✅ No database schema changes
- ✅ Backward compatible GraphQL API
- ✅ Uses existing, proven DynamoDB indexes
- ✅ Follows established repository/service patterns

**Medium Risk**:
- ⚠️ FilterExpression performance at scale (mitigated: personal finance app scale is small)
- ⚠️ Complex multi-select UI state management (mitigated: separate selected vs applied state)

**Mitigation Strategies**:
- Performance monitoring on production queries
- Graceful degradation for slow queries
- Clear "No results" messaging for empty result sets

## Success Metrics

**Performance**:
- p50 query latency < 50ms
- p95 query latency < 200ms
- p99 query latency < 500ms

**Functional**:
- All 16 filter combinations return correct results
- Pagination works correctly with filters active
- Apply button prevents accidental filter activation

**User Experience**:
- Filter selection is intuitive (multi-select dropdowns)
- Results update within 1 second of clicking Apply
- Empty results display helpful "No transactions found" message

## Future Enhancements

**Phase 2 (Out of Current Scope)**:
- Amount range filtering (min/max)
- Description text search
- Tag-based filtering
- Merchant name filtering
- Saved filter presets
- Filter-based analytics

**Extensibility**: Current FilterExpression approach supports all future filters without schema changes or new GSIs.
