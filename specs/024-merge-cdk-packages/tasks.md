---

description: "Task list for merging backend-cdk and frontend-cdk into unified infra-cdk package"
---

# Tasks: Merge CDK Packages

**Input**: Design documents from `/specs/024-merge-cdk-packages/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in specification - no test tasks included

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [MANUAL?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[MANUAL]**: MUST be executed manually by the user, not automated
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **CDK packages**: `backend-cdk/`, `frontend-cdk/` (current), `infra-cdk/` (target)
- **Deployment**: `deploy.sh` at repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create initial infra-cdk directory structure and prepare for migration

- [X] T001 Create infra-cdk/ directory at repository root
- [X] T002 Create infra-cdk/bin/ directory for CDK app entry point
- [X] T003 Create infra-cdk/lib/ directory for stack definitions
- [X] T004 Create infra-cdk/test/ directory for merged tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before user stories can deliver value

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Copy backend-cdk/package.json to infra-cdk/package.json, update name to "infra-cdk", and preserve all existing scripts (including any custom scripts)
- [X] T006 Update bin field in infra-cdk/package.json to point to "bin/app.js"
- [X] T007 [P] Copy backend-cdk/tsconfig.json to infra-cdk/tsconfig.json
- [X] T008 [P] Copy backend-cdk/jest.config.json to infra-cdk/jest.config.json
- [X] T009 [P] Copy backend-cdk/eslint.config.mjs to infra-cdk/eslint.config.mjs
- [X] T010 [P] Copy backend-cdk/.prettierrc.json to infra-cdk/.prettierrc.json
- [X] T011 [P] Copy backend-cdk/.env.production to infra-cdk/.env.production
- [X] T012 [P] Copy backend-cdk/.env.example to infra-cdk/.env.example
- [X] T013 Copy backend-cdk/lib/backend-cdk-stack.ts to infra-cdk/lib/backend-cdk-stack.ts
- [X] T014 Copy frontend-cdk/lib/frontend-cdk-stack.ts to infra-cdk/lib/frontend-cdk-stack.ts
- [X] T015 Create infra-cdk/bin/app.ts with unified CDK app instantiating BackendCdkStack and FrontendCdkStack
- [X] T016 Copy test files from backend-cdk/test/ to infra-cdk/test/ (if any exist)
- [X] T017 Copy test files from frontend-cdk/test/ to infra-cdk/test/ (if any exist)
- [X] T018 Run npm install in infra-cdk/ directory to install dependencies
- [X] T019 Run npm run build in infra-cdk/ to verify TypeScript compilation succeeds
- [X] T020 Run cdk synth in infra-cdk/ to verify CloudFormation template synthesis succeeds
- [X] T021 Run cdk diff in infra-cdk/ to verify no unexpected infrastructure changes (should show no changes)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Unified Dependency Management (Priority: P1) 🎯 MVP

**Goal**: Maintain a single set of dependencies and development tools for all CDK infrastructure, eliminating version drift and reducing maintenance overhead.

**Independent Test**: Verify both stacks share the same package.json, dependencies, and dev tool configurations. Run `npm list aws-cdk-lib` and verify single version (2.233.0). Run `npm run build` and `npm run lint` to verify unified tooling works.

### Implementation for User Story 1

- [X] T022 [US1] Verify infra-cdk/package.json shows aws-cdk-lib@2.233.0 for both stacks (no version drift)
- [X] T023 [US1] Verify infra-cdk/package.json contains all necessary devDependencies (eslint, prettier, typescript, jest)
- [X] T024 [US1] Verify only one node_modules directory exists at infra-cdk/node_modules (not in backend-cdk/ or frontend-cdk/)
- [X] T025 [US1] Run npm run build in infra-cdk/ and verify both stack files compile successfully
- [X] T026 [US1] Run npm run lint in infra-cdk/ and verify linting applies to all stack code
- [X] T027 [US1] Run npm run prettier in infra-cdk/ and verify formatting applies to all stack code
- [X] T028 [US1] Run npm test in infra-cdk/ and verify tests from both packages execute (if tests exist)

**Checkpoint**: At this point, User Story 1 should be fully functional - unified dependency management is operational

---

## Phase 4: User Story 2 - Simplified Deployment (Priority: P2)

**Goal**: Deploy both backend and frontend stacks from a single CDK app, simplifying deployment orchestration and enabling single-command deployment when changes affect both stacks.

**Independent Test**: Run `npm run deploy` (or `cdk deploy --all`) from infra-cdk/ and verify both BackendCdkStack and FrontendCdkStack deploy successfully. Verify cdk-outputs.json contains outputs from both stacks.

### Implementation for User Story 2

- [X] T029 [US2] Update "deploy" script in infra-cdk/package.json to use "cdk deploy --all" instead of "cdk deploy"
- [X] T030 [US2] Add "deploy:all" script to infra-cdk/package.json as alias for "deploy"
- [X] T031 [US2] Update deploy.sh to navigate to infra-cdk/ instead of backend-cdk/ and frontend-cdk/
- [X] T032 [US2] Update deploy.sh to run npm install once in infra-cdk/ instead of twice
- [X] T033 [US2] Update deploy.sh to run cdk deploy --all instead of separate backend and frontend deployments
- [X] T034 [US2] Update deploy.sh to read outputs from infra-cdk/cdk-outputs.json instead of backend-cdk/cdk-outputs.json and frontend-cdk/cdk-outputs.json
- [X] T035 [US2] Update deploy.sh to read MigrationFunctionName from BackendCdkStack.MigrationFunctionName in unified outputs file
- [X] T036 [US2] Update deploy.sh to read S3BucketName from FrontendCdkStack.S3BucketName in unified outputs file
- [X] T037 [US2] Update deploy.sh to read CloudFrontDistributionId from FrontendCdkStack.CloudFrontDistributionId in unified outputs file
- [X] T038 [MANUAL] [US2] Run deploy.sh to test full deployment workflow with unified package
- [X] T039 [MANUAL] [US2] Verify infra-cdk/cdk-outputs.json exists and contains both BackendCdkStack and FrontendCdkStack sections
- [X] T040 [MANUAL] [US2] Verify both stacks deployed successfully via AWS CloudFormation console or aws cloudformation list-stacks
- [X] T041 [MANUAL] [US2] Verify migration Lambda invocation executes successfully after deployment

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - unified dependencies AND simplified deployment operational

---

## Phase 5: User Story 3 - Individual Stack Deployment (Priority: P3)

**Goal**: Deploy backend or frontend stacks individually when needed, maintaining deployment flexibility for edge cases like debugging, rollbacks, or single-stack changes.

**Independent Test**: Run `npm run deploy:backend` and verify only BackendCdkStack deploys. Run `npm run deploy:frontend` and verify only FrontendCdkStack deploys (assuming backend already exists). Both commands should succeed without errors.

### Implementation for User Story 3

- [X] T042 [P] [US3] Add "deploy:backend" script to infra-cdk/package.json running "dotenvx run -f .env.production -- cdk deploy BackendCdkStack"
- [X] T043 [P] [US3] Add "deploy:frontend" script to infra-cdk/package.json running "dotenvx run -f .env.production -- cdk deploy FrontendCdkStack"
- [X] T044 [MANUAL] [US3] Run npm run deploy:backend from infra-cdk/ and verify only BackendCdkStack deploys
- [X] T045 [MANUAL] [US3] Verify BackendCdkStack export "BackendCdkStack-GraphqlApiDomain" exists via aws cloudformation list-exports
- [X] T046 [MANUAL] [US3] Run npm run deploy:frontend from infra-cdk/ and verify only FrontendCdkStack deploys
- [X] T047 [MANUAL] [US3] Verify FrontendCdkStack successfully imports BackendCdkStack-GraphqlApiDomain export
- [X] T048 [MANUAL] [US3] Verify application is accessible via CloudFront distribution domain
- [X] T049 [MANUAL] [US3] Verify GraphQL API responds correctly via API Gateway domain from BackendCdkStack outputs

**Checkpoint**: All user stories (1, 2, 3) should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, verification, and documentation updates

- [X] T050 Delete backend-cdk/ directory completely (git rm -rf backend-cdk/)
- [X] T051 Delete frontend-cdk/ directory completely (git rm -rf frontend-cdk/)
- [X] T052 Run cdk diff in infra-cdk/ one final time to verify no unexpected changes
- [X] T053 [MANUAL] Verify application end-to-end (frontend accessible, backend GraphQL API responds, auth works)
- [X] T054 Update .specify/memory/constitution.md to reflect new three-package structure (backend/, frontend/, infra-cdk/)
- [X] T055 Run quickstart.md validation by following deployment steps from specs/024-merge-cdk-packages/quickstart.md
- [X] T056 [P] Review and validate all configuration files in infra-cdk/ are correct
- [X] T057 [P] Verify .gitignore excludes infra-cdk/node_modules/, infra-cdk/cdk.out/, and infra-cdk/.env.production

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion - BLOCKS all user stories
- **User Stories (Phase 3, 4, 5)**: All depend on Foundational (Phase 2) completion
  - User stories CAN proceed sequentially in priority order (P1 → P2 → P3)
  - User stories CANNOT run in parallel (each builds on previous story's deployment)
- **Polish (Phase 6)**: Depends on all user stories (Phase 3-5) being complete

### User Story Dependencies

- **User Story 1 (P1) - Unified Dependency Management**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Simplified Deployment**: Depends on User Story 1 completion - requires unified package to exist before deployment can be simplified
- **User Story 3 (P3) - Individual Stack Deployment**: Depends on User Story 2 completion - requires unified deployment to work before individual deployment can be tested

### Within Each User Story

- **User Story 1**: All verification tasks (T022-T028) can run in parallel after foundation is complete
- **User Story 2**: Script tasks (T029-T030) and (T042-T043) can run in parallel, deploy.sh updates (T031-T037) are sequential, deployment verification (T038-T041) is sequential
- **User Story 3**: Script tasks (T042-T043) can run in parallel, deployment tests (T044-T049) are sequential

### Parallel Opportunities

- **Setup (Phase 1)**: All directory creation tasks (T001-T004) can run in parallel
- **Foundational (Phase 2)**: Configuration file copies (T007-T012) can run in parallel
- **User Story 1**: All verification tasks (T022-T028) can run in parallel
- **User Story 3**: Script addition tasks (T042-T043) can run in parallel
- **Polish (Phase 6)**: Old directory deletion (T050-T051) can run in parallel, configuration review tasks (T056-T057) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch all configuration file copies together:
Task: "Copy backend-cdk/tsconfig.json to infra-cdk/tsconfig.json"
Task: "Copy backend-cdk/jest.config.json to infra-cdk/jest.config.json"
Task: "Copy backend-cdk/eslint.config.mjs to infra-cdk/eslint.config.mjs"
Task: "Copy backend-cdk/.prettierrc.json to infra-cdk/.prettierrc.json"
Task: "Copy backend-cdk/.env.production to infra-cdk/.env.production"
Task: "Copy backend-cdk/.env.example to infra-cdk/.env.example"
```

## Parallel Example: User Story 1

```bash
# Launch all verification tasks together:
Task: "Verify infra-cdk/package.json shows aws-cdk-lib@2.233.0"
Task: "Verify only one node_modules directory exists"
Task: "Run npm run build and verify compilation"
Task: "Run npm run lint and verify linting"
Task: "Run npm run prettier and verify formatting"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create directory structure)
2. Complete Phase 2: Foundational (merge files, create unified app) - CRITICAL
3. Complete Phase 3: User Story 1 (verify unified dependencies work)
4. **STOP and VALIDATE**: Test unified dependency management independently
5. Deploy (optional at this point - can validate without deployment)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Validate unified dependencies (MVP!)
3. Add User Story 2 → Test independently → Deploy via unified app
4. Add User Story 3 → Test independently → Test individual stack deployment
5. Add Polish → Clean up old directories, update constitution

Each story adds value without breaking previous stories.

### Sequential Delivery (Recommended for This Feature)

This feature requires sequential delivery because:
- US2 (Simplified Deployment) requires US1 (Unified Dependencies) to exist
- US3 (Individual Deployment) requires US2 (Simplified Deployment) to work

Recommended order:
1. Foundation (Phase 1-2) → Creates unified package structure
2. US1 (Phase 3) → Validates unified dependencies
3. US2 (Phase 4) → Enables unified deployment
4. US3 (Phase 5) → Enables individual deployment
5. Polish (Phase 6) → Cleanup and documentation

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[MANUAL] tasks**: MUST be executed manually by the user, not automated (all deployment and deployment verification tasks)
- **[Story] label**: Maps task to specific user story for traceability
- **Stack names**: MUST remain BackendCdkStack and FrontendCdkStack to avoid resource recreation
- **Export names**: MUST remain unchanged (BackendCdkStack-GraphqlApiDomain)
- **Rollback strategy**: Git revert if deployment fails (requires all changes committed)
- **Deployment order**: CloudFormation automatically enforces FrontendStack deploys after BackendStack due to import dependency
- **Deployment tasks**: All tasks involving actual AWS deployment (T038-T041, T044-T049, T053) MUST be done manually by the user
- Commit after each phase completion or logical group
- Stop at any checkpoint to validate story independently
- This is a one-time manual migration, not an automated process
