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
- [ ] Users table includes `transactionPatternsLimit` field with default value 3
- [ ] Transaction patterns query respects per-user limit configuration
- [ ] Default limit of 3 is applied for users without explicit override
- [ ] Custom limits between 1-10 are supported and enforced

### Data Integrity
- [ ] Database migration adds new field without affecting existing users
- [ ] Invalid limit values (0, negative, >10) fall back to default of 3
- [ ] Existing pattern detection logic remains unchanged, only limit parameter changes

### User Experience
- [ ] Pattern limit change takes effect immediately on next patterns query
- [ ] No UI changes required - configuration through database only
- [ ] System gracefully handles missing or null limit values

## Implementation Plan

### 15.1 Database Layer
- [ ] 15.1.1 Create database migration script for adding transactionPatternsLimit field to Users table
- [ ] 15.1.2 Set default value of 3 for transactionPatternsLimit field in database schema

### 15.2 Repository Layer  
- [ ] 15.2.1 Add transactionPatternsLimit field to User interface and CreateUserInput with default value 3
- [ ] 15.2.2 Update UserRepository.create() method to include transactionPatternsLimit field
- [ ] 15.2.3 Create unit tests for UserRepository pattern limit functionality

### 15.3 Service Layer
- [ ] 15.3.1 Add private validatePatternsLimit() method with range validation (1-10)
- [ ] 15.3.2 Update TransactionService.getTransactionPatterns() to lookup user's transactionPatternsLimit
- [ ] 15.3.3 Replace hardcoded limit parameter with user's custom limit (fallback to 3 for invalid values)
- [ ] 15.3.4 Add unit tests for TransactionService patterns limit validation and usage

## Testing

### Integration Testing (Development Environment)

**Test 1: Core Functionality**
- [ ] [M] Navigate to transaction form with quick action buttons
- [ ] [M] Verify exactly 3 patterns are displayed by default (INCOME and EXPENSE)
- [ ] [M] Use DynamoDB Admin UI to update user's transactionPatternsLimit to 1
- [ ] [M] Refresh application and verify only 1 pattern shows per type

**Production Deployment**
- [ ] Deploy database migration to add transactionPatternsLimit field
- [ ] Verify existing users continue to see 3 patterns by default