---

description: "Task list for Passkey Authentication Support implementation"
---

# Tasks: Passkey Authentication Support

**Input**: Design documents from `/specs/029-passkeys/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No tests explicitly requested in specification. Infrastructure tests will be added to verify configuration.

**Organization**: This is an infrastructure-only feature. All three user stories (US1, US2, US3) are delivered simultaneously through a single AWS Cognito User Pool configuration change, as Cognito's native passkey support provides all capabilities out-of-the-box.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature modifies the `infra-cdk` package only:
- Infrastructure code: `infra-cdk/lib/`
- Infrastructure tests: `infra-cdk/test/`

---

## Phase 1: Passkey Configuration (Delivers ALL User Stories)

**Purpose**: Enable passkey authentication in AWS Cognito User Pool configuration

**Note**: This single infrastructure change delivers all three user stories simultaneously:
- US1: Add Passkey as Authentication Method
- US2: Manage Multiple Passkeys
- US3: Remove Passkey

Cognito's native passkey support and Hosted UI provide all these capabilities out-of-the-box.

### Infrastructure Configuration

- [ ] T001 [US1][US2][US3] Add passkey configuration to User Pool in infra-cdk/lib/auth-cdk-stack.ts (signInPolicy, passkeyRelyingPartyId, passkeyUserVerification)
- [ ] T002 [US1][US2][US3] Add USER_AUTH flow to User Pool Client in infra-cdk/lib/auth-cdk-stack.ts (authFlows.user: true)
- [ ] T003 [P] [US1][US2][US3] Add infrastructure test for passkey configuration in infra-cdk/test/auth-cdk.test.ts

**Checkpoint**: Passkey support configured - all user stories now enabled

---

## Phase 2: Deployment & Validation

**Purpose**: Deploy infrastructure changes and verify all user story capabilities work

### Development Environment

- [ ] T004 Deploy auth stack to development environment (npm run deploy:auth from infra-cdk/)
- [ ] T005 Verify Cognito User Pool shows "Passkey" in authentication factors via AWS Console
- [ ] T006 Create test user account via AWS CLI for validation
- [ ] T007 [US1] Test User Story 1: Register first passkey via Cognito Hosted UI and authenticate with it
- [ ] T008 [US2] Test User Story 2: Register additional passkey from different device/browser
- [ ] T009 [US2] Test User Story 2: Verify multiple passkeys visible in Hosted UI account management
- [ ] T010 [US2] Test User Story 2: Authenticate using either passkey
- [ ] T011 [US3] Test User Story 3: Remove one passkey via Hosted UI account management
- [ ] T012 [US3] Test User Story 3: Verify removed passkey no longer works for authentication
- [ ] T013 Verify existing password authentication still works (backward compatibility)
- [ ] T014 Verify JWT token format unchanged (backend receives valid tokens)

**Checkpoint**: All user stories validated in development environment

### Production Environment

- [ ] T015 Deploy auth stack to production environment (./deploy.sh from repository root)
- [ ] T016 Verify production Cognito User Pool has passkey support enabled
- [ ] T017 [US1] Smoke test: Register passkey in production
- [ ] T018 [US1] Smoke test: Authenticate with passkey in production
- [ ] T019 Verify existing production users can still authenticate with passwords

**Checkpoint**: All user stories validated in production environment

---

## Phase 3: Documentation & Communication

**Purpose**: Document the feature and prepare for user rollout

- [ ] T020 [P] Update project documentation to mention passkey support
- [ ] T021 [P] Add passkey troubleshooting guide based on quickstart.md
- [ ] T022 [P] Document browser compatibility requirements for users
- [ ] T023 [P] Prepare user communication about passkey availability

**Checkpoint**: Feature documented and ready for user adoption

---

## Dependencies & Execution Order

### Phase Dependencies

- **Passkey Configuration (Phase 1)**: No dependencies - can start immediately
  - T001 and T002 must complete before T003
  - T003 can run after T001 and T002 complete
- **Deployment & Validation (Phase 2)**: Depends on Phase 1 completion
  - Development validation (T004-T014) must complete before production deployment
  - T004 must complete before T005-T014
  - T005-T014 can run sequentially (manual testing)
  - T015 must complete before T016-T019
  - T016-T019 can run sequentially (manual testing)
- **Documentation (Phase 3)**: Depends on Phase 2 completion
  - All documentation tasks (T020-T023) can run in parallel

### User Story Dependencies

**IMPORTANT**: All user stories (US1, US2, US3) are delivered together by the same infrastructure configuration.

- **User Story 1 (P1)**: Add Passkey as Authentication Method
  - Enabled by T001 and T002 (Cognito passkey configuration)
  - Validated by T007, T017, T018

- **User Story 2 (P2)**: Manage Multiple Passkeys
  - Enabled by T001 and T002 (same configuration enables multiple passkeys)
  - Validated by T008, T009, T010

- **User Story 3 (P3)**: Remove Passkey
  - Enabled by T001 and T002 (Cognito Hosted UI provides removal)
  - Validated by T011, T012

**Why No Separate Phases**: Unlike typical features, these user stories cannot be implemented independently. Cognito's passkey support is all-or-nothing - enabling it gives users all three capabilities simultaneously through the Hosted UI.

### Task Dependencies

- T001 → T002 → T003 (sequential: configure pool → configure client → test)
- T003 can start after T002 completes
- T004 depends on T001, T002, T003 completion
- T005-T014 sequential (manual validation steps in development)
- T015 depends on T014 completion
- T016-T019 sequential (manual validation steps in production)
- T020-T023 can all run in parallel after T019

### Parallel Opportunities

- **Phase 1**: T003 can be written while T001 and T002 are being implemented (test-driven approach)
- **Phase 3**: All documentation tasks (T020-T023) can run in parallel

---

## Parallel Example: Documentation Phase

```bash
# Launch all documentation tasks together:
Task: "Update project documentation to mention passkey support"
Task: "Add passkey troubleshooting guide based on quickstart.md"
Task: "Document browser compatibility requirements for users"
Task: "Prepare user communication about passkey availability"
```

---

## Implementation Strategy

### Single-Phase MVP (Recommended)

This feature is atomic - it cannot be partially implemented:

1. Complete Phase 1: Passkey Configuration (T001-T003)
2. Complete Phase 2: Deployment & Validation (T004-T019)
3. **RESULT**: All three user stories (US1, US2, US3) are live and validated
4. Complete Phase 3: Documentation (T020-T023)
5. Deploy/communicate feature availability

### Why All User Stories Together

Unlike typical features, passkey authentication cannot be incrementally delivered:

- **US1 (Add Passkey)**: Core capability - enabled by Cognito configuration
- **US2 (Multiple Passkeys)**: Native Cognito feature - automatically available when US1 enabled
- **US3 (Remove Passkey)**: Native Cognito Hosted UI feature - automatically available when US1 enabled

**Attempting to "implement US1 only" is impossible** - Cognito gives you all three capabilities simultaneously.

### Validation Strategy

1. Development environment validation (T005-T014):
   - Verify each user story capability works
   - Test on multiple browsers/devices
   - Confirm backward compatibility with passwords

2. Production deployment (T015):
   - Zero-downtime deployment
   - Existing users unaffected

3. Production smoke testing (T016-T019):
   - Quick validation that passkeys work
   - Confirm no regression in password authentication

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] labels indicate which user story the task validates/supports
- All three user stories delivered simultaneously through single infrastructure change
- No backend or frontend code changes required (IC-002 constraint)
- Passkey management provided by Cognito Hosted UI (IC-003 constraint)
- Infrastructure tests verify configuration, manual tests validate user stories
- Each validation task (T007-T012, T017-T019) should be completed before proceeding
- Commit after each task or logical group (T001-T002 together, T003 separately)
- Stop at checkpoints to validate before proceeding

---

## Summary

**Total Tasks**: 23 tasks
- Phase 1 (Configuration): 3 tasks
- Phase 2 (Deployment & Validation): 16 tasks
- Phase 3 (Documentation): 4 tasks

**User Story Coverage**:
- User Story 1 (P1): Enabled by T001-T002, validated by T007, T017, T018
- User Story 2 (P2): Enabled by T001-T002, validated by T008-T010
- User Story 3 (P3): Enabled by T001-T002, validated by T011-T012

**Parallel Opportunities**: 2 tasks can run in parallel
- T003 (can be written during T001-T002 implementation)
- T020-T023 (all documentation tasks)

**Independent Test Criteria**:
- User Story 1: User can register and authenticate with a passkey
- User Story 2: User can register multiple passkeys and authenticate with any of them
- User Story 3: User can remove a passkey and it no longer works for authentication

**MVP Scope**: All user stories (cannot be separated - delivered atomically)
- Enable passkey support in Cognito (T001-T002)
- Validate all capabilities work (T004-T014)
- Deploy to production (T015-T019)

**Implementation Time Estimate**:
- Configuration: < 1 hour (T001-T003)
- Development validation: 1-2 hours (T004-T014)
- Production deployment: < 30 minutes (T015-T019)
- Documentation: 1-2 hours (T020-T023)
- **Total**: 3-6 hours

**Risk Level**: Low
- Infrastructure-only change
- Zero code changes to backend/frontend
- Backward compatible (password auth unchanged)
- Can be rolled back by reverting infrastructure change
