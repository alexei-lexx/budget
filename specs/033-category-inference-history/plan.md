# Implementation Plan: Improve Category Inference Using Recent Transaction History

**Branch**: `033-category-inference-history` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)

## Summary

Enrich the `getCategories` agent tool response to always include recent transaction descriptions grouped by category. The agent uses these as soft context when inferring ambiguous categories — no extra tool call, no new repository methods, no schema changes.

## Technical Context

**Language/Version**: TypeScript (Node.js 20+)
**Primary Dependencies**: Apollo Server, AWS SDK v3 (DynamoDB), Zod, Jest, Faker
**Storage**: DynamoDB — existing tables, no new tables or migrations
**Testing**: Jest — unit tests with mocked repositories
**Target Platform**: Node.js (AWS Lambda / local Apollo Server)
**Project Type**: Web application (`backend/` + `frontend/`)
**Performance Goals**: Zero additional tool calls in the agent loop
**Constraints**: Lookback window and description cap are fixed server-side constants
**Scale/Scope**: Per-user; enrichment draws from one user's transaction history

## Constitution Check

| Principle | Status | Notes |
|---|---|---|
| Schema-Driven Development | ✅ Pass | No GraphQL schema changes |
| Backend Layer Structure | ✅ Pass | Service enriches response; repository unchanged |
| Backend GraphQL Layer | ✅ Pass | Public `categories` query unchanged |
| Repository Pattern | ✅ Pass | No repository changes; existing query reused |
| Database Record Hydration | ✅ Pass | No new read paths |
| Soft-Deletion | ✅ Pass | `getFilteredTransactions` returns only active transactions |
| Data Migrations | ✅ Pass | Read-only enrichment; no data written |
| Authentication & Authorization | ✅ Pass | `userId` scoping unchanged |
| Test Strategy | ✅ Pass | Service tests with mocked repositories |
| Input Validation | ✅ Pass | No new inputs |
| TypeScript Code Generation | ✅ Pass | No codegen needed |
| Vendor Independence | ✅ Pass | No new DynamoDB-specific patterns |

## Project Structure

### Documentation (this feature)

```text
specs/033-category-inference-history/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── interfaces.md    # Phase 1
└── tasks.md             # Phase 2 (/speckit.tasks — not created here)
```

### Source Code

```text
backend/
└── src/
    └── services/
        ├── agent-data-service.ts       # CategoryData + enrichment + constants
        ├── agent-data-service.test.ts  # Tests for enriched getCategories
        └── create-transaction-from-text-service.ts  # System prompt update
```

**Structure Decision**: Backend only. 3 files, all within `backend/src/services/`.

## Phase 0 Artifacts

→ [research.md](./research.md)

Key decisions: always-on enrichment (no flag), reuse existing `getFilteredTransactions` + in-memory filter, 90-day lookback, 10 descriptions per category, prompt describes behavior not field names.

## Phase 1 Artifacts

→ [data-model.md](./data-model.md) — `CategoryData` interface change, constants, enrichment algorithm
→ [contracts/interfaces.md](./contracts/interfaces.md) — response shape diff, system prompt diff
→ [quickstart.md](./quickstart.md) — test commands and verification

### Changes by file

**`backend/src/services/agent-data-service.ts`**

1. Add `recentDescriptions: string[]` to `CategoryData`
2. Add constants: `CATEGORY_HISTORY_LOOKBACK_DAYS = 90`, `CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY = 10`
3. In `getCategories()`, after the existing fetch-and-filter:
   - Paginate `transactionRepository.findActiveByUserId(userId, pagination, { dateAfter: lookbackDate, dateBefore: today })` into a flat array
   - Filter in memory: keep only `t` where `t.categoryId && t.description`
   - Drop any whose `categoryId` is not in the returned category ID set (excludes archived category refs)
   - Group descriptions by `categoryId`; keep up to 10 per group
   - Attach each group to its `CategoryData` as `recentDescriptions` (or `[]` if none)

**`backend/src/services/agent-data-service.test.ts`**

New test cases in the `getCategories` describe block:
- Returns `recentDescriptions: []` for all categories when `getFilteredTransactions` returns no results
- Excludes transactions without `categoryId`
- Excludes transactions without `description`
- Excludes transactions whose `categoryId` is not in the returned category set
- Caps descriptions at `CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY`
- Paginates `transactionRepository.findActiveByUserId` with the correct lookback date range

**`backend/src/services/agent-tools/agent-data-tools.ts`**

Update the prose string (`ToolSignature.description`) of the `getCategories` tool to surface the new field:
- Before: `"Get user categories filtered by scope."`
- After: `"Get user categories filtered by scope. Each category includes recent usage examples showing how similar transactions were previously categorised."`

One word change in `SYSTEM_PROMPT` Category rule 3:
- `MUST look up past transactions for history-based criteria — do not guess`
- → `May look up past transactions for history-based criteria — do not guess`
