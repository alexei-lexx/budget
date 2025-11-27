# Research: REFUND Transaction Type Implementation

**Feature**: Minimal Refund Transaction Type
**Branch**: `012-minimal-refund`
**Date**: 2025-11-27

## Overview

Research findings on existing transaction type infrastructure to guide REFUND implementation. This document consolidates insights from backend schema, services, repositories, and frontend components.

## 1. Transaction Type System

### Current Implementation

**GraphQL Schema** (`backend/src/schema.graphql:38-43`):
```graphql
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER_IN
  TRANSFER_OUT
}
```

**TypeScript Model** (`backend/src/models/Transaction.ts:3-8`):
```typescript
export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
}
```

**Decision**: Add `REFUND` to both enums
**Rationale**: REFUND follows the same pattern as existing transaction types; single enum value, no special infrastructure needed

## 2. Balance Calculation Logic

### Current Implementation

**Location**: `backend/src/services/AccountService.ts:23-70`

**Formula**:
```
Balance = initialBalance + INCOME + TRANSFER_IN - EXPENSE - TRANSFER_OUT
```

**Code Pattern**:
```typescript
const balance = transactions.reduce((sum, transaction) => {
  if (
    transaction.type === TransactionType.INCOME ||
    transaction.type === TransactionType.TRANSFER_IN
  ) {
    return sum + transaction.amount;  // Positive impact
  } else if (
    transaction.type === TransactionType.EXPENSE ||
    transaction.type === TransactionType.TRANSFER_OUT
  ) {
    return sum - transaction.amount;  // Negative impact
  }
  return sum;
}, account.initialBalance);
```

**Decision**: Add REFUND to positive impact group (same as INCOME)
**Rationale**: Per spec FR-005, REFUND increases account balance; amounts stored as positive values in DB

**New Formula**:
```
Balance = initialBalance + INCOME + REFUND + TRANSFER_IN - EXPENSE - TRANSFER_OUT
```

## 3. Category Validation

### Current Implementation

**Location**: `backend/src/services/TransactionService.ts:90-132`

**Validation Rules**:
- INCOME transactions must use INCOME categories
- EXPENSE transactions must use EXPENSE categories
- Categories are optional for all types
- Mismatch throws `BusinessError` with code `INVALID_CATEGORY_TYPE`

**Code Pattern**:
```typescript
const typeMismatch =
  (category.type === CategoryType.INCOME &&
    transactionType !== TransactionType.INCOME) ||
  (category.type === CategoryType.EXPENSE &&
    transactionType !== TransactionType.EXPENSE);

if (typeMismatch) {
  throw new BusinessError(
    `Category type "${category.type}" doesn't match transaction type "${transactionType}"`,
    BusinessErrorCodes.INVALID_CATEGORY_TYPE,
  );
}
```

**Decision**: REFUND transactions must use EXPENSE categories (if category provided)
**Rationale**: Per spec FR-003, refunds link to expense categories since they represent returns on previous purchases

**New Validation**:
```typescript
const typeMismatch =
  (category.type === CategoryType.INCOME &&
    transactionType !== TransactionType.INCOME) ||
  (category.type === CategoryType.EXPENSE &&
    transactionType !== TransactionType.EXPENSE &&
    transactionType !== TransactionType.REFUND);  // Add REFUND here
```

## 4. GraphQL Input Validation

### Current Implementation

**Location**: `backend/src/resolvers/transactionResolvers.ts`

**Create/Update Mutations**:
```typescript
const typeSchema = z.enum([TransactionType.INCOME, TransactionType.EXPENSE], {
  message: `Transaction type must be either ${TransactionType.INCOME} or ${TransactionType.EXPENSE}`,
});
```

**Filter Operations**:
```typescript
const allTransactionTypesSchema = z.enum([
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER_IN,
  TransactionType.TRANSFER_OUT,
]);
```

**Decision**:
- Add REFUND to create/update type schema
- Add REFUND to filter type schema

**Rationale**: REFUND is user-creatable (unlike TRANSFER_IN/OUT which are system-generated) and must be filterable

## 5. Transaction Form UI

### Current Implementation

**Location**: `frontend/src/components/transactions/TransactionForm.vue`

**Pattern**: Uses `v-btn-toggle` (Vuetify button group), NOT traditional tabs

```vue
<v-btn-toggle
  v-model="formData.type"
  variant="outlined"
  color="primary"
  mandatory
>
  <v-btn value="EXPENSE" class="flex-1-1">
    <template #prepend>
      <v-icon color="error">mdi-cash-minus</v-icon>
    </template>
    Expense
  </v-btn>
  <v-btn value="INCOME" class="flex-1-1">
    <template #prepend>
      <v-icon color="success">mdi-cash-plus</v-icon>
    </template>
    Income
  </v-btn>
</v-btn-toggle>
```

**Category Filtering** (computed property):
```typescript
const filteredCategories = computed(() => {
  return categories.value.filter((category) => category.type === formData.value.type);
});
```

**Decision**: Add third button for REFUND
**Rationale**: Spec calls for "REFUND tab" (FR-002) - in this codebase, "tab" means button in v-btn-toggle

**Icon Choice**: Use `mdi-cash-refund` or `mdi-undo-variant` with warning/info color

**Category Filter Update**: REFUND uses expense categories, so filter logic needs adjustment:
```typescript
const filteredCategories = computed(() => {
  const typeToMatch = formData.value.type === 'REFUND' ? 'EXPENSE' : formData.value.type;
  return categories.value.filter((category) => category.type === typeToMatch);
});
```

## 6. Transaction Filtering

### Current Implementation

**Frontend Component**: `frontend/src/components/transactions/TransactionFilterBar.vue:144-149`

```typescript
const transactionTypeOptions = computed(() => [
  { title: "Income", value: "INCOME" as TransactionType },
  { title: "Expense", value: "EXPENSE" as TransactionType },
  { title: "Transfer In", value: "TRANSFER_IN" as TransactionType },
  { title: "Transfer Out", value: "TRANSFER_OUT" as TransactionType },
]);
```

**Backend Processing**: `backend/src/repositories/TransactionRepository.ts:1001-1113`

DynamoDB filter expression:
```typescript
FilterExpression: "#type IN (:type0, :type1, :type2)"
ExpressionAttributeNames: { "#type": "type" }
```

**Decision**: Add REFUND to transactionTypeOptions array
**Rationale**: Per spec FR-008, REFUND must be available as a filter option

```typescript
{ title: "Refund", value: "REFUND" as TransactionType }
```

## 7. Expense Report Exclusion

### Current Implementation

**Services**:
- `backend/src/services/MonthlyByCategoryReportService.ts`
- `backend/src/services/MonthlyByWeekdayReportService.ts`

Both use `TransactionRepository.findActiveByMonthAndType()` which filters by exact type match.

**Repository Method**: `backend/src/repositories/TransactionRepository.ts:630-702`

```typescript
FilterExpression: "#type = :type AND isArchived = :isArchived"
```

**Decision**: No changes needed to report services
**Rationale**: Reports query with `type: "EXPENSE"` will naturally exclude REFUND since REFUND ≠ EXPENSE. The existing filter expression already ensures only exact type matches are returned.

**Verification**: Since reports only query for EXPENSE transactions and REFUND is a distinct type, REFUND transactions will automatically be excluded from both:
- Monthly expense report by category
- Monthly expense report by weekday

## 8. Transaction Display

### Current Implementation

**Component**: `frontend/src/components/transactions/TransactionCard.vue`

**Expandable Pattern**:
- Collapsed: Shows date, account, category, amount
- Expanded: Shows description + action buttons (Edit/Delete)

**Type-based styling**:
```vue
<!-- Color-coded icons -->
green for INCOME/TRANSFER_IN
red for EXPENSE/TRANSFER_OUT
```

**Decision**: Add REFUND to positive (green) color group
**Rationale**: REFUND increases balance like INCOME; visual consistency helps users understand impact

**Type Label**: Display "REFUND" label (per spec FR-007) following pattern of other types

## 9. Key Architectural Files

| Layer | File | Change Required |
|-------|------|----------------|
| **Schema** | `backend/src/schema.graphql` | Add REFUND to TransactionType enum |
| **Model** | `backend/src/models/Transaction.ts` | Add REFUND to TransactionType enum |
| **Resolver** | `backend/src/resolvers/transactionResolvers.ts` | Add REFUND to Zod schemas (create/filter) |
| **Service** | `backend/src/services/TransactionService.ts` | Update category validation for REFUND |
| **Service** | `backend/src/services/AccountService.ts` | Add REFUND to positive balance calculation |
| **Repository** | `backend/src/repositories/TransactionRepository.ts` | No changes (uses enum, type-agnostic) |
| **Frontend Form** | `frontend/src/components/transactions/TransactionForm.vue` | Add REFUND button, update category filter |
| **Frontend Filter** | `frontend/src/components/transactions/TransactionFilterBar.vue` | Add REFUND filter option |
| **Frontend Display** | `frontend/src/components/transactions/TransactionCard.vue` | Add REFUND to green color group |

## 10. Database Schema

**Storage**: DynamoDB

**Schema Validation**: `backend/src/repositories/utils/Transaction.schema.ts`

**Current**:
```typescript
type: z.enum([
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER_IN,
  TransactionType.TRANSFER_OUT,
])
```

**Decision**: Add `TransactionType.REFUND` to Zod enum
**Rationale**: Database hydration validation (per constitution) requires all valid types in schema

## 11. Testing Strategy

### Repository Tests
- Test REFUND CRUD operations with real DynamoDB connection
- Test soft-deletion (isArchived) for REFUND transactions
- Test querying REFUND by type filter

### Service Tests
- Mock repository, test business logic
- Test REFUND balance calculation (positive impact)
- Test REFUND category validation (must be expense category if provided)
- Test category optional for REFUND

### Frontend Tests
- Manual verification (per constitution test strategy)
- Optional: Component tests for TransactionForm REFUND tab

## 12. Performance Considerations

**Impact**: Minimal

- No new indexes required (existing UserDateIndex and UserCreatedAtIndex support all types)
- No new queries (REFUND uses existing transaction queries)
- Balance calculation: O(n) remains same, just one additional type check
- DynamoDB filter expressions: IN operator already handles variable number of types

## 13. Migration Strategy

**No migration needed**:
- Adding enum value doesn't affect existing data
- Existing transactions (INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT) remain valid
- No schema changes to DynamoDB table structure
- Backend code is backward compatible (doesn't break existing types)

## 14. Alternatives Considered

### Alternative 1: Treat REFUND as negative EXPENSE
**Rejected**: Would require storing negative amounts, inconsistent with current data model where all amounts are positive

### Alternative 2: Link REFUND to original EXPENSE via linkedTransactionId
**Deferred**: Spec says "minimal implementation" - linking is a future enhancement, documented but not implemented in this iteration

### Alternative 3: Use INCOME category type for REFUND
**Rejected**: Spec explicitly states REFUND uses expense categories (FR-003) to maintain semantic connection to purchase returns

## Summary

REFUND implementation follows existing transaction type patterns with minimal changes:
- **Backend**: Add enum value, update balance calculation (+), update category validation (allow expense categories)
- **Frontend**: Add button to form, add filter option, add to positive color group
- **Reports**: No changes needed (automatic exclusion via type filtering)
- **Testing**: Follow existing test patterns for transaction types
- **Migration**: Not required

All changes extend existing infrastructure without introducing new architectural patterns.
