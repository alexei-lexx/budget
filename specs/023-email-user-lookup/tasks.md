# Tasks: Migrate User Lookup from Auth0 ID to Email

**Input**: Design documents from `/specs/023-email-user-lookup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Repository tests with 32 scenarios are included based on research.md findings.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create utility functions needed across all user stories

- [X] T001 Install validator package: `npm install validator` in backend/
- [X] T002 Install validator types: `npm install -D @types/validator` in backend/
- [X] T003 [P] Create email normalization utility in backend/src/utils/email.ts with normalizeEmail(), validateEmail(), and normalizeAndValidateEmail() functions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add EmailIndex GSI to Users table in backend-cdk/lib/backend-cdk-stack.ts (partition key: email, projection: ALL)
- [X] T005 Add email attribute definition to Users table in backend-cdk/lib/backend-cdk-stack.ts
- [X] T006 Update table definitions for local development in backend/src/scripts/table-definitions.ts to include EmailIndex GSI, then recreate tables: `npm run test:db:recreate` in backend/
- [ ] T007 MANUAL: Deploy CDK stack to AWS: `cd backend-cdk && npm run build && npx dotenvx run -- npx cdk deploy` (requires AWS credentials and manual confirmation)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Backend User Authentication by Email (Priority: P1) 🎯 MVP

**Goal**: Migrate backend authentication from Auth0 user ID lookups to email-based lookups. Extract email from JWT tokens and perform all user lookups using normalized email.

**Independent Test**: Send Auth0 tokens with email claims to any authenticated endpoint and verify correct user identification. Delivers immediate value by enabling provider-agnostic user identification.

### Implementation for User Story 1

- [X] T008 [US1] Update IUserRepository interface in backend/src/models/user.ts to add findByEmail(email: string): Promise<User | null> method signature
- [X] T009 [US1] Implement findByEmail() method in backend/src/repositories/user-repository.ts using EmailIndex GSI with email normalization and hydrate(userSchema, item) validation per constitution Database Record Hydration principle
- [X] T010 [US1] Update ensureUser() method in backend/src/repositories/user-repository.ts to use findByEmail() instead of findByAuth0UserId()
- [X] T011 [US1] Add @deprecated JSDoc comment to findByAuth0UserId() method in backend/src/repositories/user-repository.ts and backend/src/models/user.ts interface
- [X] T012 [US1] Update JwtPayload interface in backend/src/auth/jwt-auth.ts to make email field required (remove ? optional marker)
- [X] T013 [US1] Update AuthContext interface in backend/src/auth/jwt-auth.ts to use email field instead of auth0UserId field
- [X] T014 [US1] Update getAuthContext() method in backend/src/auth/jwt-auth.ts to extract email claim, normalize it, and validate it exists
- [X] T015 [US1] Update requireAuthentication() return type in backend/src/resolvers/shared.ts to return { email: string } instead of { auth0UserId: string }
- [X] T016 [US1] Update getAuthenticatedUser() implementation in backend/src/resolvers/shared.ts to call findByEmail() instead of findByAuth0UserId()
- [X] T017 [US1] Update ensureUser resolver in backend/src/resolvers/user-resolvers.ts to use email from AuthContext and call findByEmail() instead of findByAuth0UserId()

### Tests for User Story 1

**Basic Functionality Tests (TC-001 to TC-003)**:
- [X] T018 [P] [US1] Add test for exact email match (lowercase) in backend/src/repositories/user-repository.test.ts
- [X] T019 [P] [US1] Add test for returning null when email not found in backend/src/repositories/user-repository.test.ts
- [X] T020 [P] [US1] Add test for finding correct user among multiple users in backend/src/repositories/user-repository.test.ts

**Error & Validation Tests (TC-018 to TC-022)**:
- [X] T021 [P] [US1] Add test for empty string email rejection in backend/src/repositories/user-repository.test.ts
- [X] T022 [P] [US1] Add test for whitespace-only email rejection in backend/src/repositories/user-repository.test.ts
- [X] T023 [P] [US1] Add test for invalid email format rejection in backend/src/repositories/user-repository.test.ts
- [X] T024 [P] [US1] Add test for null/undefined email handling in backend/src/repositories/user-repository.test.ts

**Data Integrity Tests (TC-023 to TC-026)**:
- [X] T025 [P] [US1] Add test to verify user object hydration with Zod schema in backend/src/repositories/user-repository.test.ts
- [X] T026 [P] [US1] Add test to detect multiple users with same email (data corruption) in backend/src/repositories/user-repository.test.ts
- [X] T027 [P] [US1] Add test to refetch created user by email in backend/src/repositories/user-repository.test.ts

**Integration with ensureUser Tests (TC-027 to TC-030)**:
- [X] T028 [P] [US1] Add test for ensureUser() finding existing user by email in backend/src/repositories/user-repository.test.ts
- [X] T029 [P] [US1] Add test for ensureUser() creating user if not found in backend/src/repositories/user-repository.test.ts
- [X] T030 [P] [US1] Add test for ensureUser() with case-insensitive email matching in backend/src/repositories/user-repository.test.ts
- [X] T031 [P] [US1] Add test for ensureUser() normalizing email before lookup in backend/src/repositories/user-repository.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - backend can authenticate users by email instead of Auth0 ID

---

## Phase 4: User Story 2 - Case-Insensitive Email Matching (Priority: P2)

**Goal**: Handle email lookups in a case-insensitive manner to prevent duplicate accounts and authentication failures due to case mismatches.

**Independent Test**: Create test accounts with various email case combinations and verify lookups work correctly regardless of case. Delivers value by preventing authentication failures.

### Tests for User Story 2

**Case-Insensitivity Tests (TC-004 to TC-008)**:
- [X] T032 [P] [US2] Add test for finding user with uppercase email in backend/src/repositories/user-repository.test.ts
- [X] T033 [P] [US2] Add test for finding user with mixed-case email in backend/src/repositories/user-repository.test.ts
- [X] T034 [P] [US2] Add test for create() normalizing email to lowercase in backend/src/repositories/user-repository.test.ts
- [X] T035 [P] [US2] Add test for mixed-case local and domain parts in backend/src/repositories/user-repository.test.ts

**Normalization & Whitespace Tests (TC-009 to TC-012)**:
- [X] T036 [P] [US2] Add test for leading whitespace trimming in backend/src/repositories/user-repository.test.ts
- [X] T037 [P] [US2] Add test for trailing whitespace trimming in backend/src/repositories/user-repository.test.ts
- [X] T038 [P] [US2] Add test for surrounding whitespace trimming in backend/src/repositories/user-repository.test.ts
- [X] T039 [P] [US2] Add test for create() with whitespace normalizing correctly in backend/src/repositories/user-repository.test.ts

**Duplicate Prevention Tests (TC-023)**:
- [X] T040 [US2] Add test to verify duplicate email prevention (case-insensitive) in backend/src/repositories/user-repository.test.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - email matching is case-insensitive

---

## Phase 5: User Story 3 - Optimized Email Lookups (Priority: P3)

**Goal**: Ensure email column has a unique index so that user lookups by email are performant and database operations complete quickly even as the user base grows.

**Independent Test**: Measure query execution times for email lookups and verify they use the index. Validate independently by checking database schema.

### Tests for User Story 3

**Edge Cases - Email Formats Tests (TC-013 to TC-017)**:
- [X] T041 [P] [US3] Add test for plus addressing (user+tag@example.com) in backend/src/repositories/user-repository.test.ts
- [X] T042 [P] [US3] Add test for subdomains (user@mail.example.com) in backend/src/repositories/user-repository.test.ts
- [X] T043 [P] [US3] Add test for numbers and hyphens in email in backend/src/repositories/user-repository.test.ts
- [X] T044 [P] [US3] Add test for maximum email length (254 characters) in backend/src/repositories/user-repository.test.ts
- [X] T045 [P] [US3] Add test for dots in local part in backend/src/repositories/user-repository.test.ts

**Performance Tests (TC-031 to TC-032)**:
- [X] T046 [P] [US3] Add test for parallel email lookups performance in backend/src/repositories/user-repository.test.ts
- [X] T047 [P] [US3] Add test to validate GSI query performance (<50ms) in backend/src/repositories/user-repository.test.ts

**Checkpoint**: All user stories should now be independently functional - email lookups are optimized and performant

---

## Phase 6: Auth0 Configuration (Manual)

**Purpose**: Configure Auth0 to add email claim to access tokens

**⚠️ CRITICAL**: This configuration MUST be completed before the backend can authenticate users successfully. Without this, all authentication requests will fail with "Email claim missing in JWT token" errors.

- [ ] T048 MANUAL: Configure Auth0 Action to add email claim to access tokens

**Detailed Instructions:**

1. **Navigate to Auth0 Dashboard**
   - Go to https://manage.auth0.com/
   - Select your tenant
   - Navigate to Actions → Flows → Login

2. **Create New Action**
   - Click "+" button to create a new custom action
   - Name: "Add Email to Access Token"
   - Runtime: Node 18 (or latest)
   - Click "Create"

3. **Add Action Code**
   Replace the default code with:
   ```javascript
   exports.onExecutePostLogin = async (event, api) => {
     // Use your application's domain as namespace (e.g., 'https://yourapp.com')
     // This prevents claim name collisions
     // IMPORTANT: This must match JWT_CLAIM_NAMESPACE in your backend .env file
     const namespace = 'https://personal-budget-tracker';

     // Add email claim to access token if user has email
     if (event.user.email) {
       api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email);
     }
   };
   ```

   **IMPORTANT**: The namespace value `'https://personal-budget-tracker'` must exactly match the `JWT_CLAIM_NAMESPACE` value in your backend `.env` file

   - Click "Deploy" to save the action

4. **Add Action to Login Flow**
   - Return to Actions → Flows → Login
   - Find your newly created "Add Email to Access Token" action in the right sidebar
   - Drag and drop it into the flow diagram (between "Start" and "Complete")
   - Click "Apply" to save the flow

5. **Verify Configuration**
   - Log out of your application
   - Log back in to get a new access token
   - Decode the access token at https://jwt.io
   - Verify that the token contains a claim like `"https://personal-budget-tracker/email": "user@example.com"`
   - The claim name should match the `JWT_CLAIM_NAMESPACE` environment variable in your backend

**Troubleshooting:**
- If authentication fails with "Email claim missing", verify the Action is deployed and added to the Login flow
- Check Auth0 Real-time Webtask Logs for any errors in your Action code
- Ensure the namespace in your Auth0 Action exactly matches `JWT_CLAIM_NAMESPACE` in backend `.env` file
- Verify `JWT_CLAIM_NAMESPACE` environment variable is loaded correctly (check with console.log or debugger)

**Backend Code Changes Required:**

- [X] T049 Add JWT_CLAIM_NAMESPACE environment variable and update backend to read email from custom namespaced claim

**Implementation Details for T049:**

**Part 1: Add JWT_CLAIM_NAMESPACE environment variable**

Add to `backend/.env.example`:
```bash
# JWT Custom Claims Configuration
# This namespace must match the namespace used in your Auth0 Action
# Used to extract email from custom JWT claims (e.g., "https://yourapp.com/email")
JWT_CLAIM_NAMESPACE=https://personal-budget-tracker
```

Add to `backend/.env.test`:
```bash
# JWT Custom Claims Configuration
JWT_CLAIM_NAMESPACE=https://personal-budget-tracker
```

**Part 2: Update getAuthContext() to use JWT_CLAIM_NAMESPACE**

Update the `getAuthContext()` method in `backend/src/auth/jwt-auth.ts` to read the email from the custom namespaced claim using the environment variable:

```typescript
async getAuthContext(authHeader?: string): Promise<AuthContext> {
  if (!authHeader) {
    return { isAuthenticated: false };
  }

  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) {
    return { isAuthenticated: false };
  }

  const token = tokenMatch[1];

  try {
    const payload = await this.verifyToken(token);

    // Read email from custom namespaced claim
    // The namespace should match what you configured in the Auth0 Action
    const namespace = process.env.JWT_CLAIM_NAMESPACE;
    if (!namespace) {
      throw new Error('JWT_CLAIM_NAMESPACE environment variable must be configured');
    }

    const email = payload[`${namespace}/email`] || payload.email;

    // Validate email claim exists
    if (!email) {
      throw new Error("Email claim missing in JWT token");
    }

    // Normalize and validate email
    const normalizedEmail = normalizeAndValidateEmail(email);

    return {
      isAuthenticated: true,
      user: {
        email: normalizedEmail,
      },
    };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { isAuthenticated: false };
  }
}
```

**Important Notes:**
- The `JWT_CLAIM_NAMESPACE` value must exactly match the namespace used in your Auth0 Action
- The fallback to `payload.email` allows the code to work with both namespaced and non-namespaced claims (useful for testing)
- Environment variable validation ensures the app fails fast if misconfigured
- The `JwtPayload` interface doesn't need to be updated - we access the namespaced claim using bracket notation (`payload[`${namespace}/email`]`) which works with TypeScript's index signature

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, type checking, and documentation

- [X] T050 [P] Run TypeScript compiler to verify no type errors: `npx tsc --noEmit` in backend/
- [X] T051 [P] Run all repository tests: `npm test user-repository.test.ts` in backend/
- [X] T052 [P] Run full test suite: `npm test` in backend/
- [X] T053 Verify DynamoDB Local setup: `npm run test:db:setup` in backend/
- [ ] T054 Manual validation: Test authentication flow with valid JWT tokens containing email claims
- [ ] T055 Manual validation: Verify EmailIndex GSI is being used in DynamoDB metrics/logs
- [ ] T056 Manual validation: Check CloudWatch logs for any "email claim missing" errors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T003) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion (T004-T007)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Auth0 Configuration (Phase 6)**:
  - T048 (Manual Auth0 Action configuration) can be done in parallel with or after User Stories
  - T049 (Update backend to read custom claim) depends on T048 completion (you need to know the namespace)
- **Polish (Phase 7)**: Depends on all user stories being complete AND Auth0 configuration (T048 + T049)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion (tests verify normalization behavior implemented in US1)
- **User Story 3 (P3)**: Depends on User Story 1 completion (validates performance of US1 implementation)

### Within Each User Story

**User Story 1**:
- T008-T010: Repository changes (can run in parallel after interfaces updated)
- T011-T013: JWT/Auth changes (can run in parallel)
- T014-T015: Resolver changes (depends on T011-T013)
- T016-T029: Tests (can all run in parallel, should be written alongside implementation)

**User Story 2**:
- T030-T038: All tests can run in parallel

**User Story 3**:
- T039-T045: All tests can run in parallel

### Parallel Opportunities

- T001-T003 (Setup): All can run in parallel
- T004-T006 (Foundational - before deploy): Can run in parallel
- T016-T029 (US1 tests): All can run in parallel
- T030-T038 (US2 tests): All can run in parallel
- T039-T045 (US3 tests): All can run in parallel
- T050-T052 (Polish checks): Can run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# Phase 1: Interface updates (sequential - foundational)
Task T008: Update IUserRepository interface
Task T011: Update JwtPayload interface
Task T012: Update AuthContext interface

# Phase 2: Implementation (can parallelize if multiple developers)
Parallel Group A:
  Task T009: Implement findByEmail() in repository
  Task T010: Update ensureUser() in repository

Parallel Group B:
  Task T013: Update getAuthContext() in JWT auth
  Task T014: Update requireAuthentication() in resolvers
  Task T015: Update getAuthenticatedUser() in resolvers

# Phase 3: Tests (all can run in parallel)
Parallel Group C:
  Task T016-T029: All basic, error, data integrity, and integration tests
```

---

## Parallel Example: User Story 2 Tests

```bash
# All case-insensitivity and normalization tests (all parallelizable)
Parallel Group:
  Task T030: Test uppercase email
  Task T031: Test mixed-case email
  Task T032: Test create() normalization
  Task T033: Test mixed-case local/domain
  Task T034: Test leading whitespace
  Task T035: Test trailing whitespace
  Task T036: Test surrounding whitespace
  Task T037: Test create() with whitespace
  Task T038: Test duplicate prevention
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T008-T031)
4. **STOP and VALIDATE**: Test authentication flow with email-based lookups
5. Deploy/demo if ready

**Value Delivered**: Backend can authenticate users by email instead of Auth0 ID, decoupling from Auth0 provider.

### Incremental Delivery

1. **Foundation**: Complete Setup + Foundational → GSI deployed, email utils ready
2. **MVP (US1)**: Add email-based authentication → Test independently → Deploy/Demo
3. **Reliability (US2)**: Add case-insensitive matching → Test independently → Deploy/Demo
4. **Performance (US3)**: Validate optimization → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (T001-T007)
2. Once Foundational is done:
   - **Developer A**: User Story 1 implementation (T008-T015)
   - **Developer B**: User Story 1 tests (T016-T029)
3. After US1 complete:
   - **Developer A**: User Story 2 tests (T030-T038)
   - **Developer B**: User Story 3 tests (T039-T045)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- 32 test scenarios total from research.md findings
- All tests use real DynamoDB Local per constitution requirements
- Email normalization: trim → lowercase → NFC (Unicode normalization)
- GSI cost: ~$0.075/month for 1M users (minimal overhead)
- Performance target: <50ms for 95% of email lookups (SC-003)
