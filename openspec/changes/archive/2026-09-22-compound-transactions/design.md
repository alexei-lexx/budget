## Context

See proposal.md - Why.

Current state relevant to this design:

- `TransactionService.createTransaction` (`backend/src/services/transaction-service.ts:145`)
  creates one `Transaction`, computes one updated `Account` balance via
  `Account.increaseBalanceBySignedAmount`, and commits both through
  `AtomicWriter.commit`.
- `TransferService.createTransfer` (`backend/src/services/transfer-service.ts`)
  is the only existing multi-transaction atomic write: it builds two
  `Transaction` entities, computes two updated `Account`s, and commits both
  in one `AtomicWriter.commit` call.
- `AtomicWriter` (`backend/src/ports/atomic-writer.ts`) takes final states —
  `transactionsToCreate` and `accountsToUpdate` — not deltas. Its DynamoDB
  implementation, `DynAtomicWriter`, uses a DynamoDB `TransactWriteItems`
  call.
- MCP write tools declare `requiredGuides` and take a `guideTokens` input
  (`backend/src/mcp/tools/create-transaction.ts`), and are registered in
  `backend/src/mcp/server.ts`.
- `TransactionDto` (`backend/src/langchain/tools/transaction-dto.ts`) is the
  shape both MCP and LangChain tools return; it mirrors `Transaction`'s
  fields.

## Goals / Non-Goals

**Goals:**

- One atomic MCP call creates 2 or more transactions sharing one account,
  date, and type.
- Each created leg carries which compound transaction it belongs to and the
  group's total.
- Every leg passes the same validation a single `create_transaction` call
  would.
- The tool's own description directs the agent to use it instead of
  itemizing across categories into one description; no guide-text change is
  needed for this.

**Non-Goals:**

- No atomic update or delete across a compound transaction's legs after
  creation.
- No dedicated `CompoundTransaction` GraphQL type, query, or repository
  lookup by compound transaction id — a leg exposes only its own
  `compoundTransaction.totalAmount`; it cannot be used to look up its
  siblings.
- No manual UI form for creating a compound transaction.
- No re-validation that `compoundTransaction.totalAmount` still equals the
  live sum of its legs after independent edits.

## Decisions

### New method on `TransactionService`, not a new service

`createCompoundTransaction` reuses the exact primitives `createTransaction`
and `TransferService.createTransfer` already use: `Transaction.create`,
`Account.increaseBalanceBySignedAmount`, `AtomicWriter.commit`.
`TransactionService` already depends on `AccountRepository`,
`CategoryRepository`, `TransactionRepository`, and `AtomicWriter` — nothing
new to wire in.

Alternative considered: a dedicated `CompoundTransactionService`, mirroring
`TransferService`. Rejected — `Transfer` earns its own service because it is
a distinct entity with its own GraphQL type and get/update/delete lifecycle.
A compound transaction has neither; it is a batch of ordinary `Transaction`
creates.

### One account update, folded across all legs

`AtomicWriterInput.accountsToUpdate` takes final account states, not deltas,
one entry per account. Since every leg shares one account, the method folds
all legs' signed amounts into that account by calling
`increaseBalanceBySignedAmount` once per leg on the running result, then
passes the single resulting `Account` — not one update per leg.

### Category lookups: one call per leg, no cache

Legs come from a receipt, typically a handful. Not enough volume to justify
a lookup cache. Each leg's `categoryId`, when given, is validated the same
way `createTransaction` validates one: exists, owned, active, type matches.

### Validation order

1. `legs.length >= 2` (cheap, no DB call)
2. sum of `legs[].amount` equals `expectedTotal` (cheap)
3. leg `categoryId`s are pairwise distinct, and at most one leg omits
   `categoryId` (cheap — a plain comparison over the submitted input, no DB
   call)
4. account exists, owned, active (DB)
5. each leg's category, when given, exists, owned, active, type matches the
   shared `type` (DB)
6. build entities, compute the folded account balance, commit atomically

Matches the constitution's validation ordering: cheap checks before
DB-dependent checks.

### Domain entity: all-or-nothing `compoundTransaction` field

`Transaction.create` and `Transaction.fromPersistence` accept an optional
`compoundTransaction: { id: string; totalAmount: number }`. The private
constructor enforces both-or-neither, mirroring the existing `transferId`
invariant already in `assertInvariants` ("Transfer transactions must include
transferId" / "Only transfer transactions can include transferId").
`totalAmount` must be positive. A leg's own `amount` is not checked against
`totalAmount` at the entity level — the sum-vs-`expectedTotal` check happens
once, in the service, before any entity is built.

### Persistence: additive optional field, no migration

`transactionDbItemSchema` (`backend/src/repositories/schemas/transaction.ts`)
gains `compoundTransaction: z.object({ id: z.uuid(), totalAmount:
z.number().positive() }).optional()`. Existing rows simply lack the
attribute, which validates as absent — no backfill migration needed for an
additive optional field.

### GraphQL: embedded field only, following the existing pattern

`TransactionEmbeddedCompoundTransaction { id: ID!, totalAmount: Float! }`
and `Transaction.compoundTransaction: TransactionEmbeddedCompoundTransaction`,
the same shape as `TransactionEmbeddedAccount`/`TransactionEmbeddedCategory`.
`transaction-resolvers.ts` needs the same field-mapping treatment those two
already get. Codegen runs on both backend and frontend, per the
constitution's schema-driven rule.

### MCP tool and DTO

New `backend/src/mcp/tools/create-compound-transaction.ts`, structured like
`create-transaction.ts`: a zod `inputSchema`, `requiredGuides = ["basics",
"create-transaction"]`, calling `transactionService.createCompoundTransaction`
and mapping each result through `toTransactionDto`. Registered in
`backend/src/mcp/server.ts`'s `tools` array.

`TransactionDto` gains an optional `compoundTransaction` field, since it is
the shape both MCP and LangChain tools return.

## Risks / Trade-offs

- **Drift after creation** → a leg's amount can be edited independently, so
  `compoundTransaction.totalAmount` can stop matching the live sum of its
  siblings → Accepted trade-off. The display is a snapshot of intent at
  creation time, not a live-recomputed total (see proposal.md).
- **No way to list a compound transaction's other legs** → there is no
  query by compound transaction id, so nothing can currently jump from one
  leg to its siblings, only see the shared total on each → Accepted for
  this change; would need a new filter or query to add later.
- **DynamoDB transact-write item limit** → `DynAtomicWriter` uses a single
  `TransactWriteItems` call, capped at 100 items → Not a practical concern
  for receipt-driven use (single-digit legs); no specific guard added.

## Migration Plan

None needed. The schema field is additive with no backfill, and the new MCP
tool is opt-in by the agent. Standard deploy.

## Constitution Compliance

Covered in proposal.md's Constitution Compliance section; these technical
decisions do not change that assessment.
