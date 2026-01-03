# Implementation Plan: Category Filter Sorting Enhancement

**Branch**: `025-category-filter-sorting` | **Date**: 2026-01-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/025-category-filter-sorting/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement unified alphabetical sorting for category dropdown in transaction filter, replacing the current type-grouped sorting. Add visual type indicators (colored icons) to distinguish income and expense categories. Extract category business logic from GraphQL resolver to a dedicated CategoryService following the domain entity service pattern.

## Technical Context

**Language/Version**: TypeScript (strict mode enabled)
**Primary Dependencies**: Vue 3, Vuetify, Apollo Client (frontend), Apollo Server, Node.js (backend)
**Storage**: DynamoDB
**Testing**: Jest with co-located test files
**Target Platform**: Web browser (responsive, mobile-first)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Category dropdown renders in <300ms for up to 100 categories (SC-004)
**Constraints**: Maintain backward compatibility with existing transaction filtering, preserve all current functionality
**Scale/Scope**: Up to 100+ categories per user, standard web SPA architecture

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Architecture Compliance

✅ **Backend Layer Structure**: Extracting Query.categories logic to CategoryService (domain entity service) follows the three-layer architecture (Resolver → Service → Repository). Service will orchestrate category retrieval and sorting logic.

✅ **Schema-Driven Development**: No GraphQL schema changes required. Existing `categories(type: CategoryType): [Category!]!` query remains unchanged; sorting is internal implementation.

✅ **Repository Pattern**: Using existing CategoryRepository; modifications to sorting logic maintain vendor independence (localeCompare is portable).

✅ **Service Layer Pattern**: Following domain entity service pattern. CategoryService will manage category-related operations with multiple public methods (getCategoriesByUser, etc.).

✅ **Test Strategy**: Will add co-located tests for CategoryService (service.test.ts) and update CategoryRepository tests (repository.test.ts).

✅ **Input Validation**: No new input parameters; existing validation in resolver layer remains unchanged.

✅ **Frontend Code Discipline**: Using Vuetify v-select with standard item slot customization for icons; minimal custom CSS.

### Performance & Constraints

✅ **Performance Goals**: localeCompare with proper options has negligible overhead for <100 categories; well within SC-004 target (<300ms).

✅ **Backward Compatibility**: All existing filtering functionality preserved; changes are internal to sorting logic and visual presentation.

### Gate Status: **PASS** ✅

No constitutional violations. Implementation aligns with all architectural principles and coding standards.

## Project Structure

### Documentation (this feature)

```text
specs/025-category-filter-sorting/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── repositories/
│   │   ├── category-repository.ts       # MODIFY: Update sorting in findActiveByUserId
│   │   └── category-repository.test.ts  # UPDATE: Test new sorting behavior
│   ├── services/
│   │   ├── category-service.ts          # CREATE: New domain entity service
│   │   └── category-service.test.ts     # CREATE: Service layer tests
│   ├── resolvers/
│   │   └── category-resolvers.ts        # MODIFY: Delegate to CategoryService
│   └── schema.graphql                   # NO CHANGE: Existing schema sufficient

frontend/
├── src/
│   ├── components/
│   │   └── transactions/
│   │       └── TransactionFilterBar.vue # MODIFY: Add icon rendering to v-select
│   └── views/
│       └── Categories.vue               # REFERENCE: Icon design source (no changes)
```

**Structure Decision**: Web application architecture with separate backend and frontend packages. Changes are localized to category handling in backend service/repository layers and category display in frontend transaction filter component. No infrastructure or schema changes required.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitutional violations requiring justification.

---

## Phase 0: Research & Resolution

### Research Tasks

1. **localeCompare Options for Case-Insensitive Sorting**
   - **Question**: What localeCompare options properly handle case-insensitive sorting where "AAAAA" and "aaaaa" are grouped together?
   - **Context**: Need to sort categories alphabetically with case-insensitive collation (e.g., "Travel" and "travel" sort together, "401k" before "AAA")
   - **Status**: Ready for research

2. **Vuetify v-select Item Customization**
   - **Question**: What is the simplest built-in standard Vue.js/Vuetify approach to append icons to v-select items?
   - **Context**: Need to add colored category type icons positioned to the right of category names in dropdown
   - **Status**: Ready for research

3. **CategoryService Design Pattern**
   - **Question**: What methods should CategoryService expose as a domain entity service?
   - **Context**: Extracting resolver logic to service layer following constitution's domain entity service pattern
   - **Status**: Ready for research

### Research Outputs

Research findings will be documented in `research.md` following the format:
- **Decision**: What was chosen
- **Rationale**: Why chosen
- **Alternatives Considered**: What else was evaluated

---

## Phase 1: Design & Contracts

### Generated Artifacts

✅ **data-model.md**: Documents existing Category and Transaction entities; no schema changes required for this feature.

✅ **quickstart.md**: Implementation guide with step-by-step instructions, code snippets, testing scenarios, and troubleshooting.

❌ **contracts/**: Not needed. No GraphQL schema changes (existing `categories(type: CategoryType): [Category!]!` query sufficient).

✅ **Agent Context Update**: Completed via `.specify/scripts/bash/update-agent-context.sh claude`. Added TypeScript, Vue 3, Vuetify, Apollo, DynamoDB to CLAUDE.md.

---

## Constitution Check: Post-Design Re-Evaluation

*Re-evaluated after Phase 1 design artifacts completed.*

### Architecture Compliance (Re-confirmed)

✅ **Backend Layer Structure**: CategoryService implementation follows domain entity service pattern with single repository dependency. Clean separation: Resolver (auth/validation) → Service (orchestration) → Repository (data access).

✅ **Schema-Driven Development**: Confirmed no schema changes needed. Existing GraphQL contract remains stable; implementation changes are internal only.

✅ **Repository Pattern**: Sorting changes use portable `localeCompare()` with standard options. No vendor-specific DynamoDB features introduced.

✅ **Service Layer Pattern**: CategoryService exposes `getCategoriesByUser()` as public method. Designed for extensibility (future CRUD methods can be added).

✅ **Test Strategy**: Test plan includes:
- `category-service.test.ts` with mocked repository (unit test)
- Updated `category-repository.test.ts` with new sorting expectations (integration test)
- Co-located test files per constitution requirement

✅ **Input Validation**: No new inputs introduced. Existing Zod validation in resolver layer remains unchanged.

✅ **Frontend Code Discipline**: Vuetify v-select `item` slot with `v-list-item` component follows framework-first approach. Minimal custom code, maximum framework integration.

### Design Quality (New Evaluation)

✅ **Maintainability**: Service layer extraction improves testability and separation of concerns. Single responsibility maintained across all layers.

✅ **Performance**: `localeCompare()` sorting for <100 categories has negligible overhead (<1ms). Well within SC-004 requirement (<300ms total render time).

✅ **Accessibility**: Icon color system ('success', 'error') follows Vuetify's semantic color tokens. Material Design Icons provide visual distinction beyond color alone.

✅ **Extensibility**: CategoryService design allows future additions (create, update, delete operations) without refactoring existing code.

### Final Gate Status: **PASS** ✅

**Post-design evaluation confirms no constitutional violations.** All architectural principles, coding standards, and test requirements satisfied.

**Design artifacts (research.md, data-model.md, quickstart.md) are complete and ready for Phase 2 (task breakdown via `/speckit.tasks` command).**
