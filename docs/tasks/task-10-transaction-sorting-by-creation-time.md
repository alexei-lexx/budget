# Task 10: Transaction Sorting by Creation Time

## Objective
Improve transaction list user experience by sorting transactions by creation time (`createdAt`) instead of user-provided date, while preserving the user's intended transaction date for display and reporting purposes.

## Problem Statement

### Current Issue
- Transactions are sorted by user-provided `date` field (descending)
- When users create transactions with past dates, they "disappear" under "Load More" pagination
- Users think transaction creation failed because new transaction is not visible
- Creates confusion and poor UX, especially for retroactive transaction entry

### Example Scenario
1. User creates transaction today with `date = "2024-01-01"` (week ago)
2. Transaction appears buried on page 3 under "Load More"
3. User doesn't see it at top of list and thinks creation failed
4. User may attempt to create duplicate transaction

## Proposed Solution

### Approach: Sort by Creation Time, Display User Date

**Core Strategy**: Change the primary sorting mechanism while preserving user intent and data accuracy.

**Implementation**:
- **List Sorting**: Sort transactions by `createdAt` timestamp (descending) - newest created transactions appear first
- **User Interface**: Continue displaying user's intended `date` in transaction cards and forms
- **Financial Reports**: Use user's `date` field for accurate period-based reporting and budgeting
- **User Experience**: New transactions always appear at top of list for immediate visibility

### Why This Approach

**Considered Alternatives**:
1. **Sort by user date only**: Current behavior - creates UX confusion when past-dated transactions disappear
2. **Complex compound sorting**: Sort by date, then by creation time - requires complex GSI changes
3. **Remove date field entirely**: Loses important financial tracking information
4. **Dual view modes**: Adds UI complexity and user confusion

**Selected Approach Benefits**:
- ✅ **Simple implementation**: Only changes backend sorting logic
- ✅ **Immediate user feedback**: New transactions always visible at top
- ✅ **Preserves financial accuracy**: User's intended date still tracked for reporting
- ✅ **No data loss**: Both creation time and user date maintained

## Current State Analysis

### Database Layer
- ✅ **Transaction Model**: `createdAt` timestamp field already exists in all transactions
- ✅ **Primary Table**: DynamoDB table with `userId` + `id` primary key structure
- ❌ **GSI Configuration**: Current `UserDateIndex` GSI sorts by `date` field, needs replacement with `createdAt`
- ❌ **Development Schema**: `create-tables.ts` defines `UserDateIndex`, needs update to `UserCreatedAtIndex`
- ❌ **Production Schema**: CDK stack defines `UserDateIndex`, needs update to `UserCreatedAtIndex`

### Repository Layer
- ✅ **Query Infrastructure**: Existing pagination and filtering logic can be reused
- ❌ **GSI Usage**: `TransactionRepository.findActiveByUserId()` uses `UserDateIndex`, needs update
- ❌ **Cursor Pagination**: Current cursor uses `{date, id}`, needs change to `{createdAt, id}`
- ✅ **Error Handling**: Existing repository error patterns can be maintained

### Service Layer
- ✅ **Business Logic**: `TransactionService.getTransactionsByUser()` delegates to repository
- ✅ **Validation**: No changes needed to transaction creation/update validation
- ✅ **User Date Preservation**: User's `date` field will remain unchanged for display/reporting

### GraphQL Layer
- ✅ **Schema Definition**: Existing `TransactionConnection` type supports new sorting
- ✅ **Resolver Logic**: `transactionResolvers.transactions` query requires no changes
- ✅ **Input Validation**: Pagination input validation remains the same

### Frontend Layer
- ✅ **GraphQL Queries**: Existing transaction queries will work unchanged
- ✅ **Component Display**: Transaction cards continue showing user's `date` field
- ✅ **Pagination UI**: "Load More" functionality will work with new cursor format

## Target Architecture

### Database Schema Changes
- Replace `UserDateIndex` GSI with `UserCreatedAtIndex` GSI
- New GSI structure: `userId` (HASH) + `createdAt` (RANGE) with descending sort
- Maintain all existing transaction attributes and relationships
- Apply changes to both development (DynamoDB Local) and production (AWS) environments

### Repository Pattern Updates
- Update repository query to use `UserCreatedAtIndex` instead of `UserDateIndex`
- Modify cursor pagination to encode/decode `{createdAt, id}` instead of `{date, id}`
- Preserve existing filtering logic for active transactions (`isArchived = false`)
- Maintain stable cursor navigation for "Load More" pagination

### Data Flow Impact
- **Transaction Creation**: New transactions automatically appear at top of list via `createdAt` sorting
- **User Date Display**: Frontend continues displaying user's intended `date` in UI components
- **Financial Reports**: Future reporting features will use user's `date` field for accuracy
- **Pagination Behavior**: Cursors remain stable; new transactions don't affect existing page positions

## Implementation Plan

1. [ ] **10.1 Database Layer**
   1. [ ] 10.1.1 Update development database schema in `backend/scripts/create-tables.ts` - remove `UserDateIndex` GSI definition and add `UserCreatedAtIndex` GSI with `userId` (HASH) + `createdAt` (RANGE) sort key
   2. [ ] 10.1.2 Update production database schema in `backend-cdk/lib/backend-cdk-stack.ts` - remove `UserDateIndex` GSI definition and add `UserCreatedAtIndex` GSI with `userId` (HASH) + `createdAt` (RANGE) sort key
   3. [ ] 10.1.3 Reset development database and recreate tables with new GSI using `npm run db:setup`

2. [ ] **10.2 Repository Layer**
   1. [ ] 10.2.1 Update `TransactionRepository.findActiveByUserId()` method - change `IndexName` from `"UserDateIndex"` to `"UserCreatedAtIndex"` while maintaining `ScanIndexForward: false` for descending order
   2. [ ] 10.2.2 Update `CursorData` interface in `backend/src/repositories/TransactionRepository.ts` - change `date: string` to `createdAt: string`
   3. [ ] 10.2.3 Update `encodeCursor()` function to use `transaction.createdAt` instead of `transaction.date`
   4. [ ] 10.2.4 Update `decodeCursor()` function to extract `createdAt` field instead of `date` field from cursor data

## Testing

3. [ ] **10.3 Integration Testing**
   1. [ ] 10.3.1 **[M]** Create new transaction with past date (e.g., `date = "2024-01-01"`) and verify it appears at top of transaction list
   2. [ ] 10.3.2 **[M]** Create multiple transactions with different past dates and verify they all appear in creation order (newest created first)
   3. [ ] 10.3.3 **[M]** Verify pagination "Load More" button works correctly with new GSI
   4. [ ] 10.3.4 **[M]** Test cursor stability: load page 1, create new transaction, verify page 1 content unchanged when navigating back
   5. [ ] 10.3.5 **[M]** Verify transaction cards continue displaying user's intended `date` field, not `createdAt`
   6. [ ] 10.3.6 **[M]** Confirm `createdAt` timestamps are correctly populated for all transactions
   7. [ ] 10.3.7 **[M]** Test with transactions having same `createdAt` time - verify stable sorting by `id`

4. [ ] **10.4 Production Deployment**
   1. [ ] 10.4.1 **[M]** Deploy CDK infrastructure changes to update production DynamoDB GSI
   2. [ ] 10.4.2 **[M]** Validate transaction listing loads correctly in production
   3. [ ] 10.4.3 **[M]** Create test transaction in production and verify it appears at top of list
