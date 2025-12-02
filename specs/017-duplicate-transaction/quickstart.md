# Quickstart: Transaction Duplication Implementation

**Phase**: Phase 1 (Design & Contracts)
**Date**: 2025-12-02

## Feature Summary

Add a "Copy" button to expanded transaction cards. When clicked, the appropriate form opens (transaction create form for expenses/income/refunds, transfer form for transfers) with fields prefilled from the original transaction, except date which is set to today.

## Implementation Checklist

- [ ] **Frontend**: Add "Copy" button to transaction card component
- [ ] **Frontend**: Wire Copy button to form opening with prefilled data
- [ ] **Frontend**: Handle date field (always today, not original date)
- [ ] **Frontend**: Route transfer transactions to transfer form
- [ ] **Backend**: Ensure createTransaction mutation accepts prefilled data (likely already works)
- [ ] **Backend**: Ensure createTransfer mutation accepts prefilled data (likely already works)
- [ ] **Testing**: Test duplication of regular transactions (EXPENSE, INCOME, REFUND)
- [ ] **Testing**: Test duplication of transfer transactions
- [ ] **Testing**: Test duplication of transactions with deleted accounts/categories
- [ ] **Testing**: Verify original transaction unchanged after duplication

## Frontend Implementation

### Step 1: Find Transaction Card Component

**Location**: Look for transaction list/card component, likely in `frontend/src/components/`

**Search for**:
- Component that displays expanded transaction details
- Component that has Edit button for transactions
- Component where transaction actions are rendered

**File candidates**:
- `TransactionCard.vue`
- `TransactionItem.vue`
- `ExpandableTransaction.vue`
- Or similar pattern in transactions page/list

### Step 2: Add Copy Button

**Pattern**: Add button next to existing Edit button

**Example structure** (find actual component):

```vue
<template>
  <div class="transaction-card">
    <!-- Transaction details -->

    <div class="action-buttons">
      <!-- Existing Edit button -->
      <v-btn @click="openEditForm">Edit</v-btn>

      <!-- New Copy button (add this) -->
      <v-btn @click="duplicateTransaction" class="ms-2">Copy</v-btn>

      <!-- Other action buttons if any -->
    </div>
  </div>
</template>

<script setup>
// Existing edit form handler
const openEditForm = () => { /* existing code */ };

// New duplicate handler
const duplicateTransaction = async () => {
  // Load source transaction data
  const sourceData = await loadTransactionData(props.transaction.id);

  // Build prefill data
  const prefillData = buildDuplicateData(sourceData);

  // Open appropriate form
  if (isTransferTransaction(sourceData.type)) {
    openTransferForm(prefillData);
  } else {
    openTransactionForm(prefillData);
  }
};
</script>
```

### Step 3: Build Prefill Data Function

**Create helper function** to prepare data for form:

```typescript
function buildDuplicateData(sourceTransaction) {
  const today = new Date();

  // Common fields
  const baseData = {
    amount: sourceTransaction.amount,
    currency: sourceTransaction.currency,
    date: today, // Always today, not source date
    description: sourceTransaction.description
  };

  // Type-specific fields
  if (isTransferTransaction(sourceTransaction.type)) {
    return {
      ...baseData,
      fromAccountId: sourceTransaction.fromAccountId,
      toAccountId: sourceTransaction.toAccountId
    };
  } else {
    return {
      ...baseData,
      accountId: sourceTransaction.accountId,
      categoryId: sourceTransaction.categoryId,
      type: sourceTransaction.type
    };
  }
}

function isTransferTransaction(type) {
  return type === 'TRANSFER_IN' || type === 'TRANSFER_OUT';
}
```

### Step 4: Wire to Existing Form Components

**Find existing form opening mechanisms**:
- Look for how Edit button opens transaction form
- Look for how transfer form is opened
- Reuse same pattern for duplicate

**Expected pattern**:
- Forms likely use dialog/modal composable
- Forms accept initial data as props
- Forms are already in transaction list view or page

**Example** (pseudo-code):

```typescript
const transactionFormOpen = ref(false);
const transferFormOpen = ref(false);
const formData = ref({});

const openTransactionForm = (prefillData) => {
  formData.value = prefillData;
  transactionFormOpen.value = true;
};

const openTransferForm = (prefillData) => {
  formData.value = prefillData;
  transferFormOpen.value = true;
};

const duplicateTransaction = async () => {
  const source = await loadTransaction(transactionId);
  const prefill = buildDuplicateData(source);

  if (isTransferTransaction(source.type)) {
    openTransferForm(prefill);
  } else {
    openTransactionForm(prefill);
  }
};
```

## Backend Implementation

### Step 1: Verify Transaction Query Support

**Check**: Ensure existing transaction query returns all needed fields

**Location**: `backend/src/schema.graphql`

**Required fields** in transaction query:
- `id`, `date`, `amount`, `currency`, `accountId`, `categoryId`, `description`, `type`

**If missing**: Add fields to schema and resolver

### Step 2: Verify Mutation Input Validation

**Check**: Ensure `CreateTransactionInput` and `CreateTransferInput` accept all fields needed for duplication

**Location**: `backend/src/schema.graphql`

**Required fields**:
- `CreateTransactionInput`: date, amount, currency, accountId, categoryId, description, type
- `CreateTransferInput`: fromAccountId, toAccountId, amount, date, description

**Note**: date field MUST be part of input (so frontend can always set to today)

### Step 3: Verify Authorization in Resolvers

**Check**: Ensure mutations enforce user isolation

**Expected pattern** (existing code):

```typescript
async createTransaction(_, { input }, context) {
  // 1. Verify authenticated user
  const userId = context.user.id;

  // 2. Call service with userId
  const transaction = await this.transactionService.createTransaction(
    input,
    userId
  );

  return transaction;
}
```

**Service layer** (existing):

```typescript
async createTransaction(input: CreateTransactionInput, userId: UUID) {
  // 1. Validate account exists and belongs to user
  const account = await this.accountRepository.findById(input.accountId, userId);

  // 2. Validate category if provided
  if (input.categoryId) {
    const category = await this.categoryRepository.findById(input.categoryId, userId);
  }

  // 3. Create transaction with userId
  const transaction = await this.transactionRepository.create({
    ...input,
    userId
  });

  return transaction;
}
```

### Step 4: No Backend Code Changes Needed

✓ Existing mutations already support duplicating transactions
✓ Existing validation already covers duplicated data
✓ Existing authorization already enforces user isolation
✓ Frontend passes all needed fields to mutations
✓ Backend creates new transaction with same flow as manual creation

## Testing Strategy

### Frontend Unit Tests

**Test scenarios**:
1. Copy button appears on expanded transaction
2. Copy button loads source transaction data
3. Copy button opens transaction form for regular transactions
4. Copy button opens transfer form for transfer transactions
5. Prefilled date is always today (not source date)
6. All other fields match source transaction
7. User can modify prefilled data before saving

**Test fixtures**:
- Sample transaction with all fields
- Sample transfer transaction
- Transaction with deleted account/category
- Transaction with optional fields (no category, no description)

### Backend Unit Tests

**Test scenarios** (existing mutation tests should already cover):
1. Creating transaction with all input fields works
2. Creating transaction with optional fields (no category, no description) works
3. Creating transaction validates all input (amount, account, category type)
4. Creating transaction enforces user isolation (returns 403 if user mismatch)
5. Creating transfer with all input fields works
6. Creating transfer validates accounts and amount

**Note**: These tests likely already exist for manual transaction creation. Duplication reuses same mutations, so same tests apply.

### End-to-End Testing

**Manual testing checklist**:
1. [ ] Open transactions list, expand a regular transaction, click Copy
2. [ ] Verify transaction form opens with prefilled data (except date)
3. [ ] Verify date is set to today (not original date)
4. [ ] Verify can modify any field and save successfully
5. [ ] Verify original transaction unchanged after save
6. [ ] Repeat steps 1-5 for income transaction
7. [ ] Repeat steps 1-5 for refund transaction
8. [ ] [ ] Open transactions list, expand a transfer, click Copy
9. [ ] Verify transfer form opens (not regular transaction form)
10. [ ] Verify from/to accounts and amount are prefilled
11. [ ] Verify date is set to today
12. [ ] Verify can modify and save successfully
13. [ ] [ ] Test edge case: duplicate transaction with deleted account
14. [ ] Verify form shows deleted account but allows selecting new one
15. [ ] Test edge case: duplicate transaction with deleted category
16. [ ] Verify form shows deleted category but allows selecting new one or leaving uncategorized

## Potential Issues & Solutions

### Issue 1: Date Field Always Shows Today

**Problem**: Form date picker always defaults to today, not original date

**Solution**: Don't pass date from source. Let form default behavior apply. Or explicitly set date input value to today.

### Issue 2: Form Doesn't Accept Initial Values

**Problem**: Existing form doesn't support prefilled data

**Solution**:
1. Check how edit form receives initial values
2. Use same pattern for duplicate
3. May need to refactor form to accept initial values via props

### Issue 3: Transfer Form Location

**Problem**: Can't find where transfer form is opened

**Solution**:
1. Search for "createTransfer" in frontend codebase
2. Look for transfer creation in accounts or transactions views
3. Wire duplicate button to same form opening mechanism

### Issue 4: Category Type Validation

**Problem**: User selects EXPENSE but category is INCOME type

**Solution**: This is already handled by existing form validation. Same validation applies to duplicated transactions.

## Code Quality Checklist

- [ ] ESLint passes (`npm run lint` in frontend directory)
- [ ] TypeScript strict mode (`npm run type-check`)
- [ ] Code formatted (`npm run format`)
- [ ] No test failures (run existing tests to ensure no regressions)
- [ ] Component tests added for new Copy button logic
- [ ] Documentation updated if public API changed

## Deployment Checklist

- [ ] Branch up-to-date with main
- [ ] All tests passing
- [ ] Code review completed
- [ ] No database migrations needed
- [ ] No breaking changes to GraphQL schema
- [ ] Can deploy backend independently of frontend (if applicable)

## Success Criteria

✓ Users can duplicate a transaction in under 30 seconds
✓ All fields except date accurately copied from source
✓ Date always set to today
✓ Original transaction unchanged after duplication
✓ Authorization prevents duplicating other users' transactions
✓ Forms accept and validate duplicated data same as manual creation
