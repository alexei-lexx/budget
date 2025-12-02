# Implementation Plan: Transaction Duplication

**Branch**: `017-duplicate-transaction` | **Date**: 2025-12-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-duplicate-transaction/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Users need a "Copy" button on expanded transaction cards to quickly duplicate transactions without manually re-entering all details. When clicked, the appropriate form opens (transaction create form for expenses/income/refunds, transfer form for transfers) with fields prefilled from the original transaction, except date which is set to today.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend & backend)
**Primary Dependencies**: Vue 3, Vuetify (frontend); Apollo Server (backend); Apollo Client (frontend)
**Storage**: DynamoDB (transactions table with existing structure)
**Testing**: Jest (both frontend and backend)
**Target Platform**: Web (responsive design)
**Project Type**: Multi-package web application (frontend + backend + infrastructure-as-code)
**Performance Goals**: Copy button interaction completes in <500ms
**Constraints**: Must follow existing authorization patterns (user data isolation); must respect soft-deletion rules
**Scale/Scope**: Adding one button + one backend mutation; no new database schema changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✓ **Multi-Package Architecture**: Uses existing frontend/backend packages only (no new packages added)
✓ **Schema-Driven Development**: Backend GraphQL schema already handles transactions; duplication uses existing `createTransaction` or `createTransfer` mutations
✓ **Three-Layer Backend**: Duplication logic implemented in service layer using existing repositories
✓ **Soft-Deletion Rules**: Duplicated transactions follow same soft-deletion patterns as originals
✓ **Authorization**: User ID comes from authenticated context (not from input); users can only duplicate their own transactions
✓ **Input Validation**: Mutation input uses existing Zod validation for transaction creation
✓ **Repository Pattern**: Uses existing transaction and account repositories
✓ **TypeScript Strict Mode**: No new code violations expected
✓ **Code Generation**: No schema changes needed; existing generated types sufficient

## Project Structure

### Documentation (this feature)

```text
specs/017-duplicate-transaction/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application (frontend + backend)

backend/
├── src/
│   ├── resolvers/       # Add duplicate transaction mutation resolver
│   ├── services/        # Use existing TransactionService for duplication logic
│   ├── repositories/    # Use existing transaction/account repositories
│   └── schema.graphql   # Update if adding new mutation
└── tests/

frontend/
├── src/
│   ├── components/      # Add Copy button to transaction card
│   ├── composables/     # Use existing create form composables
│   └── views/           # Transaction list view (existing)
└── tests/
```

**Structure Decision**: Using existing multi-package web application structure. Feature touches:
- **Backend**: One new mutation to duplicate transactions (leverages existing service/repository layers)
- **Frontend**: One new button on transaction card + wire to existing create form modal (leverages existing Vuetify dialog patterns)

## Complexity Tracking

No violations. Constitution check passed completely. Feature is a straightforward addition to existing codebase using established patterns.

---

## Planning Status

**✓ Phase 0 Complete**: Research completed. All technical decisions align with existing project architecture.

**✓ Phase 1 Complete**: Design and contracts finalized.
- Generated `research.md` (no external research required)
- Generated `data-model.md` (documents existing entities used)
- Generated `contracts/graphql-mutations.md` (reuses existing mutations)
- Generated `quickstart.md` (implementation walkthrough)
- Updated agent context for Claude development

**Next Step**: Run `/speckit.tasks` to generate `tasks.md` with implementation tasks
