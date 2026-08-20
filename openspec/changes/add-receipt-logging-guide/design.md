## Context

The `create-transaction` guide's `## Description` rule says the description "MUST describe the item or service — not the reason, parties, or context." That blanket ban on parties is what leaves a receipt/check scan with nowhere to put the store name. See `proposal.md` - Why.

## Goals / Non-Goals

**Goals:**

- Give the `## Description` rule a narrow, explicit exception for the store/vendor name when the source is a receipt or check photo.
- Add an itemization rule so multi-item purchases are broken out with quantity and unit of measure when the receipt/check makes them legible.
- Extend the guide's existing "do not guess" philosophy to this new content: never invent a store name, item, quantity, or unit that isn't legible.

**Non-Goals:**

- No change to how type, amount, account, category, or date are inferred.
- No OCR, image-parsing, or receipt-specific tool/schema changes — Claude already reads the photo; only the guide text changes.
- No new guide file or new MCP tool — this stays inside `CREATE_TRANSACTION_INSTRUCTION`.

## Decisions

**Add a new `## Receipts and Checks` section rather than editing `## Description` in place.**
The itemization and never-invent rules apply to purchase items, which aren't a top-level transaction field — folding them into `## Description` would conflate "what goes in the description field" with "how to read a receipt." A dedicated section keeps the field-by-field rules unchanged and groups the receipt-specific guidance together. The section states the store-name exception to the `## Description` "no parties" rule and cross-references it, so the two sections never fall out of sync.

**Scope the store-name exception to receipts/checks, not descriptions in general.**
Alternative considered: drop "parties" from the `## Description` ban entirely. Rejected — that would let store/vendor names leak into descriptions inferred from plain text ("bought groceries at Trader Joe's"), widening the change beyond the proposal and reintroducing noise the original rule was written to prevent.

**State the never-invent rule once, covering store, item, quantity, and unit together.**
These four values fail the same way (illegible photo) and take the same instruction (leave it out, don't guess). One combined rule is simpler than four near-duplicates and matches the guide's existing terse style.

## Risks / Trade-offs

- Claude over-applies itemization to non-receipt purchases (e.g., a typed multi-item list) → Mitigation: the rule is explicitly scoped to reading from a receipt or check photo, not to purchases in general.
- Two sections (`## Description` and `## Receipts and Checks`) reference the same exception, risking drift on a future edit → Mitigation: the exception is stated once in `## Receipts and Checks` and `## Description` only points to it, not duplicates it.

## Constitution Compliance

- **Schema-Driven Development**: Not applicable — no GraphQL schema change.
- **Backend Layer Structure / Service Layer / Port Interfaces**: Not applicable — no resolver, service, or repository code touched; `CREATE_TRANSACTION_INSTRUCTION` is a static prompt string.
- **Test Strategy**: No new testable behavior at the repository/service layer; the guide text itself isn't unit-tested today and this change doesn't introduce a new pattern that would need it.
- **TypeScript Code Generation standards**: The edit stays inside the existing template-literal constant; no new types, names, or arguments introduced.

No violations.
