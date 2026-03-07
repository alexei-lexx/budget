# Implementation Plan: Distinguish Refund and Income Transactions

**Branch**: `032-distinguish-transactions` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/032-distinguish-transactions/spec.md`

## Summary

Add visually distinct color indicators for REFUND transactions in the transaction card (currently shown as green, identical to INCOME). Extend to TRANSFER types for full visual consistency. All changes are purely frontend — no backend or data model changes required.

## Technical Context

**Language/Version**: TypeScript 5.x, Vue 3
**Primary Dependencies**: Vue 3, Vuetify 3, Apollo Client
**Storage**: N/A — frontend-only change
**Testing**: Jest (frontend); manual visual testing per constitution
**Target Platform**: Browser (PWA, mobile-first)
**Project Type**: Web application (frontend only)
**Performance Goals**: No impact — computed property change only
**Constraints**: WCAG AA color contrast (FR-006); must not break existing layout
**Scale/Scope**: Two frontend files; one utility function

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Schema-Driven Development | PASS | No API changes — no schema modification needed |
| Frontend Code Discipline | PASS | Using Vuetify semantic color tokens (no custom CSS) |
| TypeScript strict mode | PASS | All changes fully typed |
| Test Strategy | PASS | Frontend manual testing per constitution; no Jest required for UI-only changes |
| Vendor Independence | PASS | No infrastructure changes |
| No backend layer violations | PASS | Frontend-only change |

No gate violations. No Complexity Tracking table needed.

## Project Structure

### Documentation (this feature)

```text
specs/032-distinguish-transactions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (N/A — no data model changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A — no API changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── utils/
│   │   └── transaction.ts          # ADD: getTransactionTypeColor() utility
│   └── components/
│       └── transactions/
│           ├── TransactionCard.vue  # MODIFY: amountColor computed
│           └── TransactionForm.vue  # MODIFY: icon colors in type toggle (align with utility)
```

**Structure Decision**: Web application — only the `frontend/` package is affected. No changes to `backend/` or `infra-cdk/`.

## Phase 0: Research

See [research.md](research.md) for all decisions and rationale.

**Key resolved decisions**:
1. **REFUND color**: `info` (blue) — already used by the form's icon; aligns the card with the form
2. **TRANSFER colors**: `warning` (orange/amber) — neutral, signals internal movement distinct from income/expense
3. **Centralization**: Add `getTransactionTypeColor()` to `frontend/src/utils/transaction.ts` — DRY utility used by both card and form

## Phase 1: Design

### Component Changes

#### `frontend/src/utils/transaction.ts`

Add a new exported function that maps `TransactionType` → Vuetify color name:

```typescript
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case "INCOME":      return "success";  // green  — money in from external
    case "REFUND":      return "info";     // blue   — money returned
    case "TRANSFER_IN": return "warning";  // orange — internal movement in
    case "TRANSFER_OUT":return "warning";  // orange — internal movement out
    case "EXPENSE":     return "error";    // red    — money out to external
  }
}
```

#### `frontend/src/components/transactions/TransactionCard.vue`

Replace the inline `amountColor` computed with a call to the utility:

```typescript
import { isPositiveTransactionType, getTransactionTypeColor } from "@/utils/transaction";

const amountColor = computed(() => getTransactionTypeColor(props.transaction.type));
```

#### `frontend/src/components/transactions/TransactionForm.vue`

Replace hardcoded `color="..."` on the three type-toggle icons with the utility, using a computed helper:

```typescript
import { getTransactionTypeColor } from "@/utils/transaction";
// No reactive state needed — types are static in the toggle
```

Template:
```html
<v-icon :color="getTransactionTypeColor('EXPENSE')">mdi-cash-minus</v-icon>
<v-icon :color="getTransactionTypeColor('INCOME')">mdi-cash-plus</v-icon>
<v-icon :color="getTransactionTypeColor('REFUND')">mdi-cash-refund</v-icon>
```

### Color System

| Type | Color Token | Visual | Rationale |
|------|------------|--------|-----------|
| EXPENSE | `error` | Red | Money leaving to external payee |
| INCOME | `success` | Green | Money arriving from external source |
| REFUND | `info` | Blue | Money returned — positive but distinct from income |
| TRANSFER_IN | `warning` | Orange/Amber | Internal account movement — not "new" money |
| TRANSFER_OUT | `warning` | Orange/Amber | Internal account movement — not "lost" money |

### WCAG AA Compliance

Vuetify's `info`, `success`, `error`, and `warning` tokens are defined per Material Design 3 guidelines and meet WCAG AA contrast ratios against white/dark surfaces in both light and dark themes. No custom colors are introduced.

### No API Changes

No GraphQL schema, resolver, service, or repository changes. No `npm run codegen` required.
