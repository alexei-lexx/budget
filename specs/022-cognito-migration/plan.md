# Implementation Plan: AWS Cognito Migration

**Branch**: `022-cognito-migration` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-cognito-migration/spec.md`

## Summary

Replace Auth0 authentication infrastructure with AWS Cognito while maintaining the existing OIDC-based authentication flow. The migration is primarily a configuration change: update identity provider URLs and client credentials in frontend and backend, plus add Cognito User Pool infrastructure to CDK. The application code remains unchanged beyond environment variable updates.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)
**Primary Dependencies**:
- Frontend: Vue 3, oidc-client-ts 3.4.1, Apollo Client
- Backend: Apollo Server, jsonwebtoken 9.0.2, jwks-rsa 3.2.2
- Infrastructure: AWS CDK

**Storage**: DynamoDB (existing), Cognito User Pool (new)
**Testing**: Jest (backend and infra-cdk)
**Target Platform**: AWS (Lambda, S3, CloudFront, API Gateway, DynamoDB, Cognito)
**Project Type**: Web application (frontend + backend + infra-cdk)
**Performance Goals**: JWT validation <50ms (cached JWKS), token refresh <1s
**Constraints**: Zero application code changes; configuration-only migration
**Scale/Scope**: Single-tenant personal finance application; 2 environments (dev, prod)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Vendor Independence | PASS | Auth system already abstracted via OIDC; Cognito uses standard OIDC protocols; no vendor-specific code in application |
| Schema-Driven Development | N/A | No GraphQL schema changes required |
| Backend Layer Structure | PASS | Auth middleware already exists; no new layers needed |
| Authentication & Authorization | PASS | Swapping identity provider (Auth0 → Cognito); same JWT verification flow |
| Repository Pattern | N/A | No data model changes |
| Test Strategy | PASS | Infrastructure tests already exist for Cognito stack; existing JWT tests remain valid |
| TypeScript Code Generation | PASS | No code generation changes needed |

**Pre-Design Gate Result**: PASS - No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/022-cognito-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output - Auth migration research
├── data-model.md        # Phase 1 output - Cognito entities and configuration
├── quickstart.md        # Phase 1 output - Developer setup guide
├── contracts/           # Phase 1 output - N/A (no API changes)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── auth/
│   │   └── jwt-auth.ts      # JWT verification (config change only)
│   ├── server.ts            # Context creation (no changes)
│   └── resolvers/           # Authentication enforcement (no changes)
└── .env.example             # Environment variable template update

frontend/
├── src/
│   ├── plugins/auth.ts      # OIDC configuration (config change only)
│   ├── composables/useAuth.ts # Auth state management (no changes)
│   └── router/index.ts      # Protected routes (no changes)
└── .env.example             # Environment variable template update

infra-cdk/
├── lib/
│   ├── auth-cdk-stack.ts    # NEW: Cognito User Pool infrastructure
│   ├── backend-cdk-stack.ts # Update: Cognito env vars
│   └── frontend-cdk-stack.ts # No changes
├── bin/
│   └── infra-cdk.ts         # Update: Add AuthCdkStack
└── test/
    └── auth-cdk.test.js     # Already exists: Cognito stack tests
```

**Structure Decision**: Existing web application structure (backend/ + frontend/ + infra-cdk/) remains unchanged. New infrastructure added to infra-cdk/lib/auth-cdk-stack.ts for Cognito User Pool.

## Post-Design Constitution Check

*Re-check after Phase 1 design completion.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Vendor Independence | PASS | Cognito uses standard OIDC; application remains provider-agnostic |
| Schema-Driven Development | N/A | No GraphQL schema changes |
| Backend Layer Structure | PASS | No layer changes; auth middleware is provider-agnostic |
| Authentication & Authorization | PASS | JWT verification unchanged; only issuer URL configuration changes |
| Repository Pattern | N/A | User data model unchanged |
| Test Strategy | PASS | Existing tests validate JWT verification; CDK tests cover Cognito stack |
| TypeScript Code Generation | PASS | No generated types affected |

**Post-Design Gate Result**: PASS - Design maintains all constitution principles.

## Complexity Tracking

No constitution violations requiring justification.
