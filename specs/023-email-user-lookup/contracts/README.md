# API Contracts

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Branch**: 023-email-user-lookup
**Date**: 2025-12-29

This directory contains the API contract definitions for the email-based user lookup feature.

## Contract Files

### 1. [graphql-schema.md](./graphql-schema.md)
Documents GraphQL schema changes (none required for this feature).

**Key Point**: The GraphQL API contract remains unchanged. This is a purely internal backend migration.

### 2. [typescript-interfaces.md](./typescript-interfaces.md)
Documents TypeScript interface changes for internal backend contracts.

**Key Changes**:
- `AuthContext` interface: Now uses `email` instead of `auth0UserId`
- `JwtPayload` interface: `email` field now required (was optional)
- `IUserRepository` interface: Added `findByEmail()` method
- Helper functions: `requireAuthentication()` and `getAuthenticatedUser()` updated

## Contract Stability

### External Contracts (Stable ✅)

**GraphQL API**: No changes
- Frontend clients require no updates
- All mutations and queries maintain existing signatures
- Response structures unchanged

**Auth0 JWT**: No changes
- Token format remains the same
- Claims structure unchanged
- Only changes which claim is used for lookup (internal)

### Internal Contracts (Breaking Changes ⚠️)

**TypeScript Interfaces**: Breaking changes
- Code using `context.auth.user.auth0UserId` must migrate to `context.auth.user.email`
- New `findByEmail()` repository method available
- Email claim validation now required

**Repository Layer**: Additive changes
- New `findByEmail()` method added
- `ensureUser()` behavior changes from auth0UserId lookup to email lookup
- Existing methods remain functional

## Contract Versioning

**GraphQL API Version**: No version change required
- External contract unchanged
- No client-side migration needed

**Internal API Version**: Major change
- Backend code must be updated atomically
- No gradual rollout of internal changes

## Testing Contracts

Contracts are validated through:

1. **TypeScript Compilation**: Ensures type safety
2. **Repository Tests**: Validate email lookup functionality
3. **Integration Tests**: Verify end-to-end authentication flow
4. **Schema Validation**: Ensure GraphQL schema unchanged

See [../data-model.md](../data-model.md) for detailed entity specifications.
