# Implementation Plan: Natural Language Transaction Creation

**Branch**: `030-nl-transaction-create` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/030-nl-transaction-create/spec.md`

## Summary

Add a natural-language text input to the Transactions page that allows users to describe a transaction in plain English (e.g., "spent 45 euro at rewe yesterday"). The backend uses an autonomous AI/LLM agent (same AWS Bedrock `ReActAgent` used by the Insights feature). The agent receives four tools: `getAccounts`, `getCategories`, `getTransactions` (read), and `createTransaction` (write). The agent reasons over the user's data and autonomously calls `createTransaction` to persist the transaction; the tool returns the full created transaction (same pattern as data tools), the agent outputs `{ "transaction": { "id": "..." } }` as its final answer, and the service fetches the full `Transaction` by ID. The frontend mirrors the Insight page loading pattern — input and submit disabled, spinner shown — while the mutation is in flight.

## Technical Context

**Language/Version**: TypeScript (Node.js backend, browser frontend)
**Primary Dependencies**: Apollo Server (backend), Vue 3 + Vuetify + Apollo Client (frontend), AWS Bedrock via `ReActAgent` (AI agent), `AgentDataService` (data access for agent)
**Storage**: DynamoDB (via existing repositories — no schema changes)
**Testing**: Jest (backend unit tests co-located alongside source files)
**Target Platform**: Web (mobile-first PWA)
**Performance Goals**: End-to-end mutation response ≤ 3 seconds (NFR-001); AI inference is the dominant latency source
**Constraints**: AI inference only; no static keyword fallback; single transaction per submission; authenticated users only
**Scale/Scope**: Single new GraphQL mutation, one new backend service, one new resolver file, one new frontend composable, UI additions to existing Transactions view

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| Schema-Driven Development | ✅ PASS | Start with `schema.graphql` mutation addition; codegen before implementation |
| Three-layer architecture (Resolver → Service → Repository) | ✅ PASS | `createTransactionFromTextResolvers` → `CreateTransactionFromTextService` → existing repos via `AgentDataService` + `TransactionService` |
| Single-purpose service pattern | ✅ PASS | `CreateTransactionFromTextService` exposes one public `call()` method; matches `InsightService` precedent |
| Repository pattern for DB access | ✅ PASS | Reuses existing repositories; no direct DB access in service |
| Soft-deletion awareness | ✅ PASS | Account/category lookups use existing `findAllByUserId` (which filters archived); no new entities |
| Input validation ordering (auth → cheap → DB) | ✅ PASS | Resolver authenticates first; service validates empty text (cheap) then fetches accounts (DB) |
| Test strategy (co-located service tests) | ✅ PASS | `create-transaction-from-text-service.test.ts` co-located next to service |
| No vendor lock-in introduced | ✅ PASS | Same Bedrock integration already in use; no new vendor dependency |
| Frontend: framework components over custom | ✅ PASS | Vuetify `v-text-field`, `v-btn`, `v-progress-circular` only |
| UI Guidelines: snackbar for errors | ✅ PASS | Errors surface via `showErrorSnackbar()` composable |
| TypeScript strict mode / no `!` or `as any` | ✅ PASS | Design enforces this; highlighted in tasks |

**Post-Phase-1 re-check**: No new violations introduced by the design. `CreateTransactionFromTextService` is fully autonomous via ReAct — the agent calls a `createTransaction` tool (backed by `TransactionService.createTransaction`) to persist the transaction. This is consistent with the constitution's single-purpose service pattern; `TransactionService` is injected, not duplicated.

## Project Structure

### Documentation (this feature)

```text
specs/030-nl-transaction-create/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── schema-additions.graphql
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
backend/
├── src/
│   ├── schema.graphql                              # ADD: CreateTransactionFromTextInput, createTransactionFromText mutation
│   ├── server.ts                                   # ADD: createTransactionFromTextService to context + lazy init
│   ├── resolvers/
│   │   ├── index.ts                                # ADD: spread createTransactionFromTextResolvers.Mutation
│   │   └── create-transaction-from-text-resolvers.ts  # NEW: single resolver for createTransactionFromText
│   └── services/
│       ├── create-transaction-from-text-service.ts      # NEW: single-purpose service (call method)
│       └── create-transaction-from-text-service.test.ts # NEW: unit tests with mocked deps

frontend/
├── src/
│   ├── graphql/
│   │   └── mutations.ts                            # ADD: CREATE_TRANSACTION_FROM_TEXT mutation
│   ├── composables/
│   │   └── useCreateTransactionFromText.ts          # NEW: composable (mirrors useInsight pattern)
│   └── views/
│       └── Transactions.vue                        # ADD: NL input section above transaction list
```

**Structure Decision**: Web application (Option 2) with full backend/frontend split. No new packages — all code is added to the existing `backend/` and `frontend/` packages.

## Complexity Tracking

> No constitution violations — section not applicable.
