# GraphQL Schema Contract

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Date**: 2025-12-29

## Summary

**No GraphQL schema changes required** for this feature.

## Rationale

The GraphQL schema already exposes only the `email` field for the User type. The `auth0UserId` field is internal and never exposed via the API.

**Current Schema** (from `/home/alex/workspace/budget2/backend/src/schema.graphql`):

```graphql
type User {
  email: String!
}
```

**Frontend Impact**: None. The frontend already receives and displays email addresses. The migration from Auth0 ID to email lookups is purely internal to the backend.

## Unchanged Operations

All existing queries and mutations remain unchanged:

**Mutations**:
- `ensureUser: User!` - Continues to work, now uses email-based lookup internally

**Behavior**:
- External API contract remains stable
- Frontend clients require no updates
- Response structure unchanged

## Internal Changes (Not Exposed via Schema)

While the GraphQL schema doesn't change, the following internal implementation changes occur:

1. **Authentication Context**: `AuthContext` now contains email instead of auth0UserId (internal only)
2. **User Lookup Mechanism**: Resolvers use email-based lookup instead of Auth0 ID lookup (internal only)
3. **JWT Claims**: Backend extracts email claim instead of sub claim for user identification (internal only)

These changes maintain the existing GraphQL contract while improving backend flexibility and preparing for future Cognito migration.
