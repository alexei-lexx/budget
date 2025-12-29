# Implementation Plan: Migrate User Lookup from Auth0 ID to Email

**Branch**: `023-email-user-lookup` | **Date**: 2025-12-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-email-user-lookup/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate backend user authentication from Auth0 user ID lookups to email-based lookups. This decouples user identification from the Auth0 provider and prepares for future AWS Cognito migration. The backend will extract the email claim from Auth0 JWT tokens and perform all user lookups using email (case-insensitive, normalized). Changes are transparent to users and require no user action.

## Technical Context

**Language/Version**: TypeScript (Node.js 24.x)
**Primary Dependencies**: Apollo Server, GraphQL, AWS DynamoDB SDK, jsonwebtoken, jwks-rsa (Auth0)
**Storage**: AWS DynamoDB with Global Secondary Indexes
**Testing**: Jest (repository tests with real DynamoDB Local, service tests with mocked repositories)
**Target Platform**: AWS Lambda (Node.js runtime)
**Project Type**: Web (backend/frontend split)
**Performance Goals**: Email lookups <50ms for 95% of requests (per spec SC-003)
**Constraints**: Zero downtime deployment, no user re-authentication required, maintain data integrity
**Scale/Scope**: Production user base, all authenticated endpoints, critical path for every API request

**Current Implementation**:
- JWT verification extracts `sub` (Auth0 user ID) from token payload (see [jwt-auth.ts](../../backend/src/auth/jwt-auth.ts))
- User lookup via `findByAuth0UserId()` using `Auth0UserIdIndex` GSI (see [user-repository.ts](../../backend/src/repositories/user-repository.ts))
- Central lookup in `getAuthenticatedUser()` resolver helper (see [shared.ts](../../backend/src/resolvers/shared.ts))
- Users table has `id` (primary key), `auth0UserId` (indexed), and `email` (not indexed)
- Email already normalized to lowercase in `create()` method

**Required Changes**:
1. Add GSI on `email` field in Users table ([backend-cdk-stack.ts](../../backend-cdk/lib/backend-cdk-stack.ts))
2. Add `findByEmail()` method to UserRepository
3. Update `AuthContext` interface to use `email` instead of `auth0UserId`
4. Update JWT auth service to extract and return email
5. Update `getAuthenticatedUser()` to call `findByEmail()` instead of `findByAuth0UserId()`
6. Update `ensureUser()` to use email-based lookup
7. Ensure email normalization (lowercase + trim whitespace) at all entry points

**Open Questions** (to be resolved in research.md):
- NEEDS CLARIFICATION: Email normalization best practices (whitespace handling, Unicode normalization, validation)
- NEEDS CLARIFICATION: DynamoDB GSI performance characteristics and cost implications
- NEEDS CLARIFICATION: Migration testing strategy for case-insensitive lookups
- NEEDS CLARIFICATION: Error handling patterns for missing email claim vs. user not found

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Architectural Compliance

| Principle | Status | Notes |
|-----------|--------|-------|
| **Repository Pattern** | ✅ PASS | Adding `findByEmail()` to UserRepository follows established pattern |
| **Three-Layer Architecture** | ✅ PASS | Changes maintain GraphQL → Service → Repository flow |
| **Schema-Driven Development** | ✅ PASS | No GraphQL schema changes required (User.email already exposed) |
| **Backend Layer Structure** | ✅ PASS | Repository handles data access, resolvers handle auth context |
| **Database Record Hydration** | ✅ PASS | Existing hydration with userSchema will be used for new lookup method |
| **Authentication & Authorization** | ✅ PASS | Core focus of this feature - migrating auth mechanism from Auth0 ID to email |
| **Test Strategy** | ✅ PASS | Will add repository tests with real DynamoDB, follow co-location pattern |
| **Input Validation** | ✅ PASS | JWT layer validates email claim exists, repository normalizes email input |

### Data & Infrastructure

| Principle | Status | Notes |
|-----------|--------|-------|
| **Soft-Deletion** | N/A | Not applicable to Users table |
| **Data Migrations** | N/A | No data migration needed - email field already exists, adding GSI via CDK |
| **Vendor Independence** | ✅ PASS | Email-based lookup is provider-agnostic, prepares for Cognito migration |

### Pre-Implementation Gates

- ✅ All required patterns are followed with no violations
- ✅ No complexity justification needed
- ✅ Ready to proceed to Phase 0 research

### Post-Design Re-Evaluation (Phase 1 Complete)

**Re-checked**: 2025-12-29 after completing research, data model, and contracts

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| **Repository Pattern** | ✅ PASS | `findByEmail()` method follows existing pattern; email normalization added |
| **Three-Layer Architecture** | ✅ PASS | Email normalization utility in utils/; repository methods handle data access; resolvers updated correctly |
| **Schema-Driven Development** | ✅ PASS | Confirmed no GraphQL schema changes needed; external API contract stable |
| **Database Record Hydration** | ✅ PASS | `findByEmail()` uses existing `hydrate(userSchema, item)` pattern |
| **Test Strategy** | ✅ PASS | 32 test scenarios designed; follows co-location pattern; uses real DynamoDB Local |
| **Input Validation** | ✅ PASS | Email validation added at JWT layer; normalization at repository layer |
| **Authentication & Authorization** | ✅ PASS | Email-based auth implemented; maintains security boundaries |
| **Vendor Independence** | ✅ PASS | Email normalization is provider-agnostic; supports future Cognito migration |

**Design Validation**:
- ✅ All constitution principles remain satisfied
- ✅ No new violations introduced during design phase
- ✅ Email normalization follows best practices (trim, lowercase, NFC)
- ✅ GSI configuration optimized for performance and cost
- ✅ Error handling prevents user enumeration
- ✅ Testing strategy comprehensive and constitution-compliant

**Ready to proceed to Phase 2: Task Generation**

## Project Structure

### Documentation (this feature)

```text
specs/023-email-user-lookup/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This is a web application with backend/frontend separation plus CDK infrastructure packages.

```text
backend/                                    # Apollo GraphQL server
├── src/
│   ├── auth/
│   │   └── jwt-auth.ts                    # JWT verification, WILL MODIFY: extract email from token
│   ├── models/
│   │   └── user.ts                        # User interface, WILL MODIFY: update IUserRepository
│   ├── repositories/
│   │   ├── user-repository.ts             # WILL MODIFY: add findByEmail() method
│   │   ├── user-repository.test.ts        # WILL MODIFY: add tests for email lookup
│   │   └── schemas/
│   │       └── user.ts                    # User Zod schema (already exists)
│   ├── resolvers/
│   │   ├── shared.ts                      # WILL MODIFY: update getAuthenticatedUser()
│   │   └── user-resolvers.ts              # May need updates for ensureUser
│   ├── services/                          # No service layer changes expected
│   └── server.ts                          # GraphQL context setup, may need updates
└── (tests co-located with source files per constitution)

backend-cdk/                                # Backend infrastructure
└── lib/
    └── backend-cdk-stack.ts               # WILL MODIFY: add EmailIndex GSI to Users table

frontend/                                   # Vue.js SPA
└── (no changes expected - migration is backend-only)

frontend-cdk/                               # Frontend infrastructure
└── (no changes expected)
```

**Structure Decision**: Web application with four independent npm packages. This feature only affects the `backend/` and `backend-cdk/` packages. Frontend remains unchanged since the migration is transparent to the client.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution principles are followed.
