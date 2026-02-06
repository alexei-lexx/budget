# Tasks: AWS Cognito Migration

**Input**: Design documents from `/specs/022-cognito-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: CDK infrastructure tests already exist (`infra-cdk/test/auth-cdk.test.js`). No additional tests requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`, `infra-cdk/lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No setup tasks required - project structure already exists

**Note**: This migration modifies existing infrastructure. No new project initialization needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational tasks - this is a configuration migration, not a new feature

**Note**: Existing authentication infrastructure (OIDC client, JWT verification) is already in place.

---

## Phase 3: User Story 1 - Authentication Infrastructure Setup (Priority: P1) 🎯 MVP

**Goal**: Deploy Cognito User Pool infrastructure via CDK that provides OIDC-compatible authentication

**Independent Test**: Run `npm test` in infra-cdk to verify stack creates User Pool, Client, and Domain. Deploy to AWS dev environment and verify OIDC discovery endpoint returns valid configuration.

### Implementation for User Story 1

- [ ] T001 [US1] Create Cognito User Pool stack in `infra-cdk/lib/auth-cdk-stack.ts` with User Pool, User Pool Client, and User Pool Domain per data-model.md specifications
- [ ] T002 [US1] Update CDK app entry point to instantiate AuthCdkStack in `infra-cdk/bin/app.ts`
- [ ] T003 [US1] Run existing CDK tests to verify stack configuration in `infra-cdk/test/auth-cdk.test.js`
- [ ] T004 [US1] Deploy AuthCdkStack to dev environment and verify User Pool creation in AWS Console

**Checkpoint**: Cognito User Pool deployed with hosted UI accessible at `{prefix}.auth.{region}.amazoncognito.com`

---

## Phase 4: User Story 2 - Application Configuration Update (Priority: P2)

**Goal**: Update backend and frontend configuration to use Cognito instead of Auth0, with backward compatibility

**Independent Test**: Start backend with Cognito issuer URL, verify JWKS fetch succeeds. Start frontend, verify OIDC client initializes with Cognito authority.

### Implementation for User Story 2

- [ ] T005 [P] [US2] Update JWT verification to support `client_id` claim validation (Cognito) alongside `aud` claim (Auth0) in `backend/src/auth/jwt-auth.ts`
- [ ] T006 [P] [US2] Make `AUTH_AUDIENCE` optional and add `AUTH_CLIENT_ID` support in `backend/src/auth/jwt-auth.ts`
- [ ] T007 [P] [US2] Make `AUTH_CLAIM_NAMESPACE` optional for Cognito (uses standard `email` claim) in `backend/src/auth/jwt-auth.ts`
- [ ] T008 [P] [US2] Update backend environment template with `AUTH_CLIENT_ID` and document optional `AUTH_AUDIENCE` in `backend/.env.example`
- [ ] T009 [P] [US2] Update frontend environment template to document `VITE_AUTH_AUDIENCE` as optional in `frontend/.env.example`
- [ ] T010 [US2] Update backend CDK stack to pass Cognito environment variables (`AUTH_ISSUER`, `AUTH_CLIENT_ID`) in `infra-cdk/lib/backend-cdk-stack.ts`
- [ ] T011 [US2] Verify backend starts successfully with Cognito configuration and fetches JWKS

**Checkpoint**: Backend validates both Auth0 and Cognito tokens based on environment configuration. Frontend works with optional audience.

---

## Phase 5: User Story 3 - End-to-End Authentication Flow (Priority: P3)

**Goal**: Verify complete authentication flow from login through API access with Cognito

**Independent Test**: Navigate to application, complete login at Cognito hosted UI, verify GraphQL requests succeed with Cognito-issued tokens.

### Implementation for User Story 3

- [ ] T012 [US3] Create test user in Cognito User Pool via AWS CLI per quickstart.md
- [ ] T013 [US3] Configure local development environment with Cognito URLs (update `.env` files)
- [ ] T014 [US3] Test login flow: frontend redirect to Cognito hosted UI, authentication, redirect back with tokens
- [ ] T015 [US3] Test API access: verify GraphQL requests with Cognito access token succeed
- [ ] T016 [US3] Test token refresh: verify automatic silent renewal before expiration
- [ ] T017 [US3] Test logout flow: verify tokens cleared and redirect to Cognito logout endpoint

**Checkpoint**: Complete authentication lifecycle works end-to-end with Cognito

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and documentation

- [ ] T018 [P] Update auth.ts comment from "Auth0-specific" to "OIDC provider-specific" in `frontend/src/plugins/auth.ts`
- [ ] T019 [P] Remove Auth0 references from any remaining configuration or documentation
- [ ] T020 Validate quickstart.md instructions work for new developer setup
- [ ] T021 Update MEMORY.md with lessons learned from migration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - no setup needed
- **Foundational (Phase 2)**: Skipped - existing infrastructure sufficient
- **User Story 1 (Phase 3)**: Can start immediately - CDK infrastructure
- **User Story 2 (Phase 4)**: Depends on US1 completion (needs Cognito URLs)
- **User Story 3 (Phase 5)**: Depends on US1 + US2 completion (needs deployed infrastructure and configured apps)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies - creates Cognito infrastructure
- **User Story 2 (P2)**: Depends on US1 - needs Cognito User Pool ID and Client ID
- **User Story 3 (P3)**: Depends on US1 + US2 - needs deployed infrastructure and configured applications

### Within Each User Story

- T001-T004 (US1): Sequential - create stack, update app, test, deploy
- T005-T009 (US2): Parallel [P] tasks can run together (different files)
- T010-T011 (US2): Sequential - update CDK then verify
- T012-T017 (US3): Sequential - each test builds on previous

### Parallel Opportunities

- T005, T006, T007 can run in parallel (same file but independent changes - treat as one task)
- T008, T009 can run in parallel (different files)
- T018, T019 can run in parallel (different concerns)

---

## Parallel Example: User Story 2

```bash
# Launch backend jwt-auth.ts changes together (logically one task):
Task: T005-T007 "Update jwt-auth.ts for client_id validation and optional AUTH_AUDIENCE/AUTH_CLAIM_NAMESPACE"

# Launch env template updates in parallel:
Task: T008 "Update backend/.env.example"
Task: T009 "Update frontend/.env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Cognito infrastructure)
2. **STOP and VALIDATE**: Verify User Pool created, hosted UI accessible
3. Can demo Cognito setup without app changes

### Incremental Delivery

1. Add User Story 1 → Deploy Cognito → Validate hosted UI (Infrastructure MVP)
2. Add User Story 2 → Configure apps → Validate JWKS fetch (Configuration complete)
3. Add User Story 3 → Test E2E → Validate login flow (Full integration)
4. Each story adds value without breaking previous stories

### Backward Compatibility

Throughout implementation, maintain Auth0 compatibility:
- Backend validates both `aud` (Auth0) and `client_id` (Cognito) claims
- Frontend `VITE_AUTH_AUDIENCE` remains optional
- Can switch back to Auth0 by changing environment variables

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- CDK tests already exist - T003 runs existing tests, not new tests
- Frontend code already handles optional audience - only .env.example update needed
- Backend requires code changes to jwt-auth.ts for client_id validation
- T005-T007 are logically one task (same file) but listed separately for clarity
