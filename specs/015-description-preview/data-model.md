# Data Model: Transaction Description Preview

**Feature**: Transaction Description Preview in Collapsed Cards
**Date**: 2025-11-30

## Summary

This feature requires **no data model changes**. All required data already exists in the Transaction entity.

## Existing Entity

### Transaction

**Existing Fields (no changes)**:
- `id`: string
- `date`: string (ISO date)
- `amount`: number
- `currency`: string
- `type`: TransactionType enum (INCOME | EXPENSE | TRANSFER_IN | TRANSFER_OUT | REFUND)
- `description`: string | null (optional, already exists)
- `account`: Account object
  - `id`: string
  - `name`: string
  - `isArchived`: boolean
- `category`: Category object | null
  - `id`: string
  - `name`: string
  - `isArchived`: boolean

**Relevant Field**: `description` (string | null)
- Already stored in database
- Already returned by GraphQL API
- Already available in frontend Transaction type
- Used only in expanded card state currently
- **This feature adds display in collapsed state**

## Validation Rules

**No changes to existing validation**:
- Description remains optional (null allowed)
- No new length constraints
- No new format requirements
- Existing XSS protection via Vue template rendering

## State Transitions

**No state changes**:
- No new transaction states
- No new workflow states
- Display-only feature, no business logic changes

## Relationships

**No relationship changes**:
- Transaction ↔ Account: unchanged
- Transaction ↔ Category: unchanged
- No new entities or relationships

## Data Access

**No repository changes required**:
- Existing queries already fetch `description` field
- No new database queries needed
- No new GraphQL resolvers needed

## GraphQL Schema

**No schema changes required**:
- `Transaction` type already includes `description: String` field
- All queries already return description
- No new mutations needed

---

## Impact Summary

- **Backend**: No changes
- **Database**: No changes
- **GraphQL**: No changes
- **Frontend Types**: No changes (Transaction type already includes description)
- **Component**: UI rendering changes only in TransactionCard.vue
