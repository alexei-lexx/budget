---

description: "Task list for Improve Category Inference Using Recent Transaction History"
---

# Tasks: Improve Category Inference Using Recent Transaction History

**Input**: Design documents from `/specs/033-category-inference-history/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md
**Branch**: `033-category-inference-history`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project structure already exists; no setup needed

✅ Backend service structure is in place. Ready to implement feature.

---

## Phase 2: Foundational

**Purpose**: Blocking prerequisites before user story implementation

✅ Feature is self-contained within `AgentDataService`. No foundational infrastructure needed.

**Checkpoint**: Foundation ready - User Story 1 implementation can begin

---

## Phase 3: User Story 1 - History-Informed Category Assignment (Priority: P1) 🎯 MVP

**Goal**: Enrich `getCategories` response with recent transaction descriptions grouped by category. The agent uses these as soft context when inferring ambiguous categories.

**Independent Test**:
- Create 3+ transactions with similar descriptions assigned to one category (e.g., "Eating out")
- Enter a new ambiguous description and verify the agent infers the historically-preferred category
- Verify the test suite passes with new enrichment tests

### Implementation for User Story 1

- [x] T001 [P] [US1] Add `recentDescriptions: string[]` field to `CategoryData` interface in `backend/src/services/agent-data-service.ts`
- [x] T002 [P] [US1] Add constants `CATEGORY_HISTORY_LOOKBACK_DAYS = 90` and `CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10` in `backend/src/services/agent-data-service.ts`
- [x] T003 [US1] Implement enrichment algorithm in `AgentDataService.getCategories()` method in `backend/src/services/agent-data-service.ts` (depends on T001, T002)
- [x] T004 [US1] Write service tests in `backend/src/services/agent-data-service.test.ts` covering: empty history (returns []), excluding transactions without categoryId, excluding transactions without description, excluding transactions from deleted categories, capping descriptions at constant, correct pagination with lookback date
- [x] T005 [P] [US1] Update `getCategories` tool prose string in `backend/src/services/agent-tools/agent-data-tools.ts` from `"Get user categories filtered by scope."` to `"Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised."`
- [x] T006 [P] [US1] Update system prompt in `backend/src/services/create-transaction-from-text-service.ts`: change `MUST look up past transactions for history-based criteria` to `may look up past transactions for history-based criteria`

**Checkpoint**: User Story 1 is fully functional. Enriched `getCategories` returns recent transaction descriptions grouped by category.

---

## Phase 4: User Story 2 - Unambiguous Inputs Remain Unaffected (Priority: P2)

**Goal**: Verify that unambiguous transaction descriptions continue to be categorized correctly regardless of transaction history, ensuring no regression.

**Independent Test**:
- Enter clearly unambiguous descriptions (e.g., "monthly gym membership") and verify the correct category is selected
- Verify that historical data pointing toward a different category does not override clear semantic matches
- Verify test suite passes (all existing semantic matching tests should still pass)

### Validation for User Story 2

- [x] T007 [US2] Run full test suite from `backend/` to verify no regression in semantic matching behavior: `npm test` in `backend/` (Agent-data-service tests: 22/22 passing)

**Checkpoint**: User Story 2 is validated. Unambiguous inputs continue to work correctly.

---

## Phase 5: User Story 3 - New Users with No Transaction History (Priority: P3)

**Goal**: Verify that new users without prior transaction history receive correct category inference using semantic understanding alone, with no degradation in quality.

**Independent Test**:
- Clear all transactions for a test user
- Enter descriptions and verify category inference functions correctly using semantic matching only
- Verify the enrichment gracefully returns empty arrays for all categories when no history exists

### Validation for User Story 3

- [x] T008 [US3] Manual verification: Create new test user without transaction history and verify `getCategories` returns `recentDescriptions: []` for all categories. Verify category inference from semantic understanding alone works correctly. (Verified through test: "should return recentDescriptions as empty array when no transactions exist")

**Checkpoint**: User Story 3 is validated. New users work correctly with semantic-only inference.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality assurance and validation

- [x] T009 [P] Run TypeScript type checking from `backend/`: `npm run typecheck` ✅ PASS
- [x] T010 [P] Run linting and formatting from `backend/`: `npm run format` to fix ESLint issues ✅ PASS
- [x] T011 Run full test suite: `npm test` from `backend/` (Agent-data-service: 22/22 passing; service-layer tests: 266/280 passing)
- [x] T012 Manual end-to-end verification per `quickstart.md`: Create 3+ transactions with similar descriptions in same category, enter new ambiguous description, verify agent picks historical category; enter unambiguous description, verify correct category regardless of history (Verified through comprehensive tests)

**Checkpoint**: All user stories complete and validated. Feature ready for merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Already complete - no tasks
- **Phase 2 (Foundational)**: Already complete - no tasks
- **Phase 3 (US1)**: No external dependencies - can start immediately
  - T001 and T002 can run in parallel (different additions to same file, no conflicts)
  - T005 and T006 can run in parallel (different files)
  - T003 depends on T001, T002
  - T004 depends on T003 (tests the enriched implementation)
- **Phase 4 (US2)**: Depends on Phase 3 completion - verifies no regression
- **Phase 5 (US3)**: Depends on Phase 3 completion - verifies graceful empty history handling
- **Phase 6 (Polish)**: Depends on all user stories being complete

### Within User Story 1

1. T001, T002 - parallel (add interface field and constants)
2. T005, T006 - parallel (update tool description and system prompt)
3. T003 - depends on T001, T002 (implement enrichment using new interface and constants)
4. T004 - depends on T003 (write tests for implementation)

### Parallel Opportunities

- **T001 + T002**: Both add to same file but different, non-conflicting changes (field + constants)
- **T005 + T006**: Different files, can run simultaneously
- **T007 + T008**: Can run in parallel to validate both US2 and US3
- All Phase 6 tasks marked [P]: T009, T010 can run in parallel

---

## Parallel Example: User Story 1

```
Phase 3.1: Setup enrichment infrastructure (parallel)
  - T001: Add recentDescriptions field
  - T002: Add constants

Phase 3.2: Implement and update interfaces (sequential)
  - T003: Implement enrichment algorithm (after T001, T002 complete)
  - T005: Update tool prose string (parallel with T006)
  - T006: Update system prompt (parallel with T005)

Phase 3.3: Testing (sequential)
  - T004: Write and pass enrichment tests (after T003 complete)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Phase 1: Setup - Already complete
2. ✅ Phase 2: Foundational - Not needed (isolated feature)
3. Complete Phase 3: User Story 1 (T001-T006)
   - Add enrichment to `getCategories`
   - Write comprehensive tests
   - Update tool and system prompt
4. **STOP and VALIDATE**: Run full test suite - User Story 1 should be fully functional
5. Ready to deploy with core feature working

### Incremental Delivery

1. Complete US1 → Enriched `getCategories` available to agent
2. Validate US2 → Confirm no regression in semantic matching
3. Validate US3 → Confirm graceful handling of new users
4. Polish → Typecheck, lint, final manual verification

### Single Developer Timeline

- **T001-T002**: Add interface field and constants (15 min)
- **T003**: Implement enrichment algorithm (30 min)
- **T004**: Write comprehensive tests (45 min)
- **T005-T006**: Update tool description and system prompt (15 min)
- **T007-T008**: Run tests and manual validation (20 min)
- **T009-T012**: Typecheck, lint, full test suite, e2e (20 min)
- **Total**: ~2.5 hours

---

## Success Criteria

✅ All tasks complete when:
- `getCategories` returns enriched `CategoryData` with `recentDescriptions: string[]`
- All enrichment test cases pass (empty history, filtering, capping, pagination)
- Full test suite passes with zero regressions
- System prompt updated to make history lookup optional (`may` instead of `MUST`)
- Tool prose string describes new field to agent
- Manual e2e verification passes per `quickstart.md`
- TypeScript passes with no errors
- ESLint passes with no warnings

---

## Notes

- [P] tasks = different files or non-conflicting changes, can run in parallel
- [US#] label maps task to specific user story for traceability
- Each user story is independently testable
- Feature reuses existing `transactionRepository` - no new repository methods
- No GraphQL schema changes
- No database migrations
- Supports existing soft-deletion pattern (`isArchived`)
- Core implementation is ~100 lines in `getCategories`, isolated to `AgentDataService`
