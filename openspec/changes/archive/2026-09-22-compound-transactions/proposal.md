## Issue

[#592: split transaction](https://github.com/alexei-lexx/budget/issues/592)

A single purchase often mixes unrelated categories (for example, groceries and
household items on one receipt). Today, one transaction holds one category, so
the category with the largest amount is picked. Reports built on category
totals become inaccurate.

## Why

Recording one purchase as several category-accurate transactions fixes the
report, but today those transactions look unrelated in the UI. Users lose the
fact that they came from one purchase. This is most useful when the MCP
assistant reads a receipt and recognizes multiple categories — it should
record several transactions in one call and keep them recognizably linked, not
silently split.

## What Changes

- Add a new MCP tool, `create_compound_transaction`, that creates 2 or more
  transactions in one call, atomically (all legs are created or none are).
  A call with fewer than 2 legs is rejected; no transaction is created.
  All legs share one account, one date, and one transaction type — a
  compound transaction represents one real-world event (one purchase, one
  payout), never a mix of expense and income. The caller states an expected
  total, which must equal the sum of the legs' amounts, or the call is
  rejected. Legs must have distinct categories — the point is one leg per
  category — and at most one leg may be uncategorised; otherwise the call is
  rejected.
- Each created leg is stamped with a shared compound transaction id and the
  total amount, then behaves as an ordinary, independent transaction —
  editable and deletable on its own, with no further validation tying it to
  its siblings.
- Show the compound relationship on the transaction card: a leg displays its
  own amount against the shared total (for example, "5 of 15 EUR").
- No manual UI entry point for creating a compound transaction. Creation is
  MCP-only.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `mcp-server`: add the `create_compound_transaction` tool (guides required:
  `basics`, `create-transaction`, same as `create_transaction`); the tool's
  own description tells the agent to use it for multi-category receipts
  instead of itemizing into one description.
- `transactions`: a transaction that is part of a compound transaction
  displays its amount against the shared total on its card.

## Impact

- **Backend model**: `Transaction` gains an optional `compoundTransaction: { id, totalAmount }`
  field; both are set together or both absent.
- **Backend service**: new `TransactionService.createCompoundTransaction`
  method, using the existing `AtomicWriter` port (same mechanism
  `TransferService` uses for its two-leg atomic writes).
- **Backend repository**: `DynTransactionRepository` and its record schema
  persist and validate the new field.
- **MCP**: new tool file and server registration.
- **GraphQL**: schema adds `TransactionEmbeddedCompoundTransaction { id, totalAmount }`
  and `Transaction.compoundTransaction`; codegen run on backend and frontend.
- **Frontend**: `TransactionCard.vue` displays the leg-of-total amount when
  `compoundTransaction` is present.

## Constitution Compliance

- **Schema-Driven Development**: the GraphQL change (`Transaction.compoundTransaction`)
  starts with a schema update, followed by codegen on both backend and
  frontend. Compliant.
- **Backend Layer Structure**: the MCP tool calls `TransactionService`
  directly, same as every other MCP write tool; no direct repository access
  from the MCP layer. Compliant.
- **Backend Service Layer**: `createCompoundTransaction` is added to
  `TransactionService`, not a new service. `TransactionService` already
  depends on `AccountRepository`, `TransactionRepository`, and `AtomicWriter`,
  so no new dependency is introduced. A compound transaction has no identity
  or lifecycle of its own past creation (unlike `Transfer`, which has its own
  GraphQL type and is fetched/edited/deleted as a unit) — it is batched
  Transaction creation, which belongs with the rest of that entity's CRUD.
  Compliant.
- **Backend Domain Entities**: `compoundTransaction` is validated in the
  `Transaction` private constructor as an all-or-nothing field, keeping
  invalid state unrepresentable. Compliant.
- **Backend Port Interfaces**: reuses the existing `AtomicWriter`,
  `TransactionRepository`, and `AccountRepository` ports; no new port.
  Compliant.
- **Database Record Hydration**: the repository schema validates the new
  field on every read, consistent with every other `Transaction` field.
  Compliant.
- **Result Pattern**: sibling `TransactionService` methods (`createTransaction`,
  `updateTransaction`) throw `BusinessError` on failure rather than returning
  a `Result`, and `createCompoundTransaction` follows that same existing
  convention for consistency within the service. This mirrors the codebase's
  actual current pattern rather than the constitution's literal wording;
  flagging for awareness, not proposing to fix it here — out of scope for
  this change.
