# Task 15: Configurable Transaction Patterns Limit

## Objective

Enable configurable transaction patterns limit per user with a default of 3 patterns, allowing individual users to override the limit through direct database modification without requiring a UI.

## Use Cases

**UC-1: Default Pattern Limit**
- When user requests transaction patterns, system returns maximum 3 patterns by default
- System behavior remains consistent with current implementation for existing users

**UC-2: Custom Pattern Limit Override**
- Admin can update specific user's pattern limit directly in Users table
- When user requests transaction patterns, system respects their custom limit
- Custom limit can be higher or lower than default (minimum 1, maximum 10)

**UC-3: Pattern Limit Validation**
- System validates pattern limit is within acceptable range (1-10)
- Invalid limits fall back to default value of 3
- Zero or negative limits are rejected and use default

## Acceptance Criteria

### Core Functionality
- [ ] Users table includes optional `transactionPatternsLimit` field (no default value in database)
- [ ] Transaction patterns query respects per-user limit configuration when set
- [ ] Application default limit of 3 is used when user has no custom limit stored
- [ ] Custom limits between 1-10 are supported and enforced

### Data Integrity
- [ ] Adding optional field does not affect existing users (no migration needed)
- [ ] Invalid limit values (0, negative, >10) fall back to application default of 3
- [ ] Existing pattern detection logic remains unchanged, only limit parameter changes
- [ ] Users without custom limit stored continue to use application default

### User Experience
- [ ] Pattern limit change takes effect immediately on next patterns query
- [ ] No UI changes required - configuration through database only
- [ ] System gracefully handles missing or null limit values (uses application default)

## Implementation Plan

### 15.1 Repository Layer
- [x] 15.1.1 Add optional transactionPatternsLimit field to User interface (no default value)

### 15.2 Service Layer
- [x] 15.2.1 Update TransactionService.getTransactionPatterns() to validate limit parameter (1-10 range, fallback to 3)
- [x] 15.2.2 Add unit tests for limit parameter validation in getTransactionPatterns()

### 15.3 GraphQL Layer
- [x] 15.3.1 Update getTransactionPatterns resolver to pass user.transactionPatternsLimit as limit parameter

## Testing

### Integration Testing (Development Environment)

**Test 1: Core Functionality**
- [x] [M] Navigate to transaction form with quick action buttons
- [x] [M] Verify exactly 3 patterns are displayed by default (INCOME and EXPENSE)
- [x] [M] Use DynamoDB Admin UI to update user's transactionPatternsLimit to 1
- [x] [M] Refresh application and verify only 1 pattern shows per type

**Production Deployment**
- [x] Deploy updated application code (no database changes needed)
- [x] Verify existing users continue to see 3 patterns by default (application-level default)
- [x] Verify users without stored limit value automatically use application default
