# Implementation Plan: Mark Deleted Accounts and Categories

**Branch**: `008-mark-deleted-relations` | **Date**: 2025-10-29 | **Status**: ✅ Phase 1 Complete - Ready for Tasks
**Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md) | **Data Model**: [data-model.md](data-model.md)
**Input**: Feature specification from `/specs/008-mark-deleted-relations/spec.md`

## Summary

Add visual strikethrough styling with accessibility labels (aria-label) to deleted (archived) account and category names displayed in transaction cards. The backend provides embedded archived status flags on account and category objects in transaction data. Frontend components will check these flags and conditionally apply strikethrough text styling + aria-label attributes with "Deleted: " prefix for screen reader accessibility.

## Technical Context

**Language/Version**: TypeScript 5.x (Vue 3 frontend + Node backend)
**Primary Dependencies**: Vue 3, Vuetify 3, Apollo Client (frontend); Apollo Server (backend)
**Storage**: N/A (display/styling only; data already embedded)
**Testing**: Jest (per constitution) - manual visual verification primary for frontend
**Target Platform**: Web (Vue 3 SPA, responsive to mobile/desktop)
**Project Type**: Web (multi-package: frontend + backend + CDK deployments)
**Performance Goals**: None specific (lightweight styling; no performance impact expected)
**Constraints**: WCAG accessibility compliance (aria-label required); consistent styling across responsive breakpoints
**Scale/Scope**: Affects all transaction card displays in frontend (accounts page, transaction list, any transaction detail view)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Backend** (minimal impact):
- ✅ No storage changes required; archived status flag already provided by backend
- ✅ GraphQL schema should already include archived field on Account/Category types (verify in Phase 0)
- ✅ No service layer changes needed (deletion logic unchanged)

**Frontend** (primary implementation):
- ✅ Test Strategy: Manual visual verification + optional Jest tests for complex components (this is a styling feature)
- ✅ TypeScript strict mode: Required for all new/modified code
- ✅ ESLint + Prettier: All code must pass linting and formatting
- ✅ No new dependencies required (Vue 3, Vuetify, Apollo Client already present)

**Gate Result**: ✅ **PASS** - Feature fits within project governance. No new dependencies, no storage changes, existing infrastructure supports soft-delete pattern.

## Project Structure

### Documentation (this feature)

```text
specs/008-mark-deleted-relations/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (this task)
├── data-model.md        # Phase 1 output (this task)
├── quickstart.md        # Phase 1 output (this task)
├── contracts/           # Phase 1 output (this task) - GraphQL schema changes if needed
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

**Structure Decision**: Web application (frontend + backend). This feature is **frontend-focused** with minimal backend changes.

**Backend Impact** (mostly read-only):
```text
backend/
├── src/
│   ├── resolvers/
│   │   └── transaction.ts          # Verify archived field is present in Account/Category types
│   └── schema.graphql              # Verify archived status field in Account/Category types
└── tests/                           # No new tests needed (no backend logic changes)
```

**Frontend Implementation** (primary):
```text
frontend/
├── src/
│   ├── components/
│   │   ├── TransactionCard.vue      # MODIFY: Add strikethrough + aria-label for deleted refs
│   │   └── TransactionExpandable.vue # MODIFY: Apply styling in expanded view
│   ├── pages/
│   │   ├── Transactions.vue         # Uses transaction components
│   │   └── Accounts.vue             # May show related transactions (if applicable)
│   ├── graphql/
│   │   └── queries/
│   │       └── transactions.ts      # VERIFY: archived field included in query selections
│   └── styles/
│       └── components.css           # ADD: Strikethrough styling rules (if not inline)
└── tests/
    └── components/
        └── TransactionCard.spec.ts  # OPTIONAL: Jest tests for conditional styling logic
```

## Complexity Tracking

**Status**: ✅ **NO VIOLATIONS** - Feature fits cleanly within project governance with no deviations.

## Phase 1: Design & Contracts - Complete

### Deliverables Created

✅ **research.md** - Phase 0 research findings:
- GraphQL schema confirmed: `isArchived` field exists on embedded types
- Queries confirmed: `isArchived` already selected in TRANSACTION_FRAGMENT
- Components identified: TransactionCard.vue is primary modification target
- Design decisions finalized: Vue class binding + scoped CSS approach

✅ **data-model.md** - Data structures and component interfaces:
- GraphQL type documentation (TransactionEmbeddedAccount, TransactionEmbeddedCategory)
- Component prop contracts (accountIsArchived, categoryIsArchived)
- Data flow diagrams and reactive behavior
- Accessibility compliance checklist

✅ **contracts/graphql.md** - GraphQL API contracts:
- Existing type definitions (no schema changes needed)
- Query fragment documentation
- Confirmation that all required data is already available

✅ **contracts/components.md** - Vue component specifications:
- TransactionCard.vue prop additions (2 new boolean props)
- Template changes for account and category name spans
- CSS styling rules with Vuetify theming
- Testing contracts and accessibility requirements

✅ **quickstart.md** - Implementation quick reference:
- 7-step implementation checklist
- Code snippets for each modification
- Common issues and solutions
- Validation checklist for quality assurance

✅ **Agent context updated** - Claude Code context file updated with:
- Language: TypeScript 5.x (Vue 3 frontend + Node backend)
- Framework: Vue 3, Vuetify 3, Apollo Client (frontend); Apollo Server (backend)
- Database: N/A (display/styling only)

### Phase 1 Summary

**Design Status**: ✅ **COMPLETE - READY FOR IMPLEMENTATION**

**Key Decisions**:
1. **No backend changes** - Data already available in GraphQL
2. **Frontend-only implementation** - Modify 2 files (TransactionCard.vue, Transactions.vue)
3. **Accessibility-first approach** - aria-label + title attributes + visual styling
4. **Minimal complexity** - 3 CSS rules + 2 component props
5. **Reusable pattern** - Establishes aria-label pattern for future features

**Files Modified**: 2
- `frontend/src/components/transactions/TransactionCard.vue`
- `frontend/src/views/Transactions.vue`

**Files Verified (no changes needed)**: 2
- `backend/src/schema.graphql` (contains isArchived field)
- `frontend/src/graphql/fragments.ts` (already selects isArchived)

**Implementation Estimate**: 1-2 hours
**Testing Estimate**: 30 minutes
**Total Effort**: 2-3 hours

### Constitution Re-check

**Gate**: ✅ **PASS** - No new violations introduced in Phase 1 design
- Still no new dependencies
- Still no storage changes
- Component changes align with existing patterns
- Accessibility compliance met

### Ready for Phase 2

Next step: Run `/speckit.tasks` to generate implementation tasks and execution plan.
