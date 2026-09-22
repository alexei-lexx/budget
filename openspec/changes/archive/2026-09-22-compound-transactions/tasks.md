## Code Style

Apply `docs/code-style.md` throughout implementation.

## 1. Domain Model

- [x] 1.1 (use `testing` skill) Write tests in `transaction.test.ts` for the
      new `compoundTransaction` invariant: rejects `id` without
      `totalAmount` or vice versa, rejects a non-positive `totalAmount`,
      accepts both present or both absent
      Deviation: dropped the "id without totalAmount or vice versa" case.
      `compoundTransaction` is typed as one nested `{ id: string; totalAmount:
number }` object (needed so `toTransactionDbItemForCreate`'s direct
      spread into `TransactionDbItem` type-checks), so both fields are
      already required together by the type for every real caller — testing
      partial presence would need a cast that fabricates a value the type
      system rules out, which is exactly the "no error handling for
      impossible scenarios" anti-pattern. Kept only the genuine runtime
      check: `totalAmount` must be positive (a range check, like the
      existing `amount <= 0` check). Added one invariant not in the original
      task list, caught in review: `CreateTransactionInput.type` is the full
      `TransactionType` union (transfer types included), so a transfer
      transaction with `compoundTransaction` set was reachable through valid
      types even though no current caller does it — mirrors the existing
      "Transfer transactions cannot have a category" guard, now "Transfer
      transactions cannot be part of a compound transaction".
- [x] 1.2 Add optional `compoundTransaction: { id: string; totalAmount:
number }` to `TransactionData` and `CreateTransactionInput`
      (`backend/src/models/transaction.ts`); enforce the both-or-neither
      invariant in `assertInvariants`, mirroring the existing `transferId`
      check

## 2. Persistence

- [x] 2.1 (use `testing` skill) Extend `dyn-transaction-repository.test.ts`
      to cover a round trip of a transaction with `compoundTransaction` set
- [x] 2.2 Add `compoundTransaction: z.object({ id: z.uuid(), totalAmount:
z.number().positive() }).optional()` to `transactionDbItemSchema`
      (`backend/src/repositories/schemas/transaction.ts`)

## 3. Service Layer

- [x] 3.1 (use `testing` skill) Write tests in `transaction-service.test.ts`
      for `createCompoundTransaction`: valid creation stamps every leg with
      the same `compoundTransaction.id` and `totalAmount`; fewer than 2 legs
      is rejected; leg amounts not summing to `expectedTotal` is rejected;
      duplicate `categoryId`s or more than one uncategorised leg is
      rejected; an invalid leg (bad category, type mismatch, non-positive
      amount) rejects the whole call and creates nothing; the account's
      balance reflects the sum of all legs in one update
- [x] 3.2 Implement `TransactionService.createCompoundTransaction`
      following design.md's validation order and the folded-balance
      approach (one `Account` update built by calling
      `increaseBalanceBySignedAmount` once per leg, then a single
      `AtomicWriter.commit` with all legs and that one account)

## 4. MCP Tool

- [x] 4.1 (use `testing` skill) Write `create-compound-transaction.test.ts`
      mirroring `create-transaction.test.ts`: guide token enforcement,
      successful creation, and business-rule failures passed through from
      the service
- [x] 4.2 Add `compoundTransaction?: { id: string; totalAmount: number }` to
      `TransactionDto` and its mapping in `toTransactionDto`
      (`backend/src/langchain/tools/transaction-dto.ts`)
- [x] 4.3 Implement `backend/src/mcp/tools/create-compound-transaction.ts`,
      structured like `create-transaction.ts`: zod `inputSchema` for
      `accountId`, `date`, `type`, `expectedTotal`, `legs` (min 2), and
      `guideTokens`; `requiredGuides = ["basics", "create-transaction"]`;
      calls `transactionService.createCompoundTransaction` and returns the
      mapped `TransactionDto[]`
- [x] 4.4 Register the new tool in `backend/src/mcp/server.ts`'s `tools`
      array

## 5. GraphQL Schema

- [x] 5.1 Add `TransactionEmbeddedCompoundTransaction { id: ID!, totalAmount:
Float! }` and `Transaction.compoundTransaction:
TransactionEmbeddedCompoundTransaction` to
      `backend/src/graphql/schema.graphql`
- [x] 5.2 Run backend codegen (`npm run codegen` in `backend/`); confirm no
      explicit field resolver is needed for `compoundTransaction` — it
      reads directly off the `Transaction` entity by default resolution,
      the same way `transferId` does today (unlike `account`/`category`,
      which need their own resolver functions to fetch related entities)
- [x] 5.3 Sync and codegen the frontend schema (`npm run codegen:sync-schema
&& npm run codegen` in `frontend/`)

## 6. Frontend Display

- [x] 6.1 Add `compoundTransaction { id totalAmount }` to the transaction
      GraphQL query/fragment used by `useTransactions.ts`
- [x] 6.2 Update `TransactionCard.vue` to show the transaction's amount
      against `compoundTransaction.totalAmount` (for example, "5 of 15
      EUR") when `compoundTransaction` is present, otherwise unchanged
- [x] 6.3 Manually verify in the running app: create a compound transaction
      (via the MCP tool or a direct service call) and confirm its legs show
      the leg-of-total display, while ordinary transactions are unaffected
      Verified via a direct service call (dev DynamoDB) + Playwright against
      the running frontend: legs showed "-€5.00 of €15.00" / "-€10.00 of
      €15.00"; ordinary transactions directly below were unaffected.

## 7. Verification

- [x] 7.1 Run the backend test suite (`npm test` in `backend/`) and fix any
      regressions
- [x] 7.2 Run backend typecheck and lint (`npm run typecheck`, `npm run
format` in `backend/`)
- [x] 7.3 Run frontend typecheck (`npm run typecheck` in `frontend/`)
- [x] 7.4 Run `openspec validate --changes compound-transactions --strict`

## Constitution Compliance

Covered in proposal.md's Constitution Compliance section. This breakdown
follows the constitution's Code Quality Validation workflow (test the
changed unit, then the full suite, then typecheck/lint) and test-driven
development (tests before implementation in each layer).
