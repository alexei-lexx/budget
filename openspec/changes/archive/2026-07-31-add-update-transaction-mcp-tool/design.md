## Context

The MCP server (`backend/src/mcp/`) already exposes `get_transactions` and `create_transaction`, each a thin wrapper: an MCP-specific zod schema, a description, and a call into the existing service layer, mapped to `Result`/`CallToolResult` via `toToolResult`. `TransactionService.updateTransaction` already implements the full business logic (account/category ownership checks, category-type matching, cross-account balance adjustment, transfer-safety via `Transaction.update()`'s invariants) and is already exposed to the frontend via the `updateTransaction` GraphQL mutation.

Unlike accounts and categories, there is no langchain in-app-chat tool for updating a transaction to mirror — `backend/src/langchain/tools/` has `create-transaction.ts` but no `update-transaction.ts`. The closest existing precedent for input shape and clear-vs-leave-unchanged semantics is the `updateTransaction` GraphQL mutation (`backend/src/graphql/resolvers/transaction-resolvers.ts`), which already threads `UpdateTransactionServiceInput` end-to-end, including passing `categoryId`/`description` as explicit `null` to clear them.

This change adds no new business logic — it wires one more MCP tool over behavior that already exists and is already exposed through the GraphQL mutation. The one decision worth recording is how the MCP tool's zod schema should represent the "clear this field" vs. "leave this field unchanged" distinction, since none of the existing MCP tools (`update_account`, `update_category`) need it — neither `Account` nor `Category` has an optional-and-clearable field.

## Goals / Non-Goals

**Goals:**

- Expose `update_transaction` as an MCP tool, scoped to the authenticated user, following the exact structural pattern of `create-transaction.ts` and `update-account.ts`.
- Preserve the clear-vs-leave-unchanged semantics for `categoryId` and `description` that `UpdateTransactionServiceInput` and the GraphQL mutation already implement.

**Non-Goals:**

- No changes to `TransactionService`, `Transaction` model, or any repository.
- No archive/delete transaction tool.
- No GraphQL schema changes.
- No new langchain tool for the in-app chat surface.

## Decisions

**`categoryId` and `description` use `.nullable().optional()` zod schemas to distinguish "clear" from "leave unchanged".**
`UpdateTransactionServiceInput` types these fields as `string | null | undefined` where `undefined` means "leave unchanged" and `null` means "clear". A plain `.optional()` schema (as used by `update_account`/`update_category`, whose fields have no clear-semantics) can't represent explicit `null`. The tool's input builder mirrors the GraphQL resolver's spread (`...(categoryId !== undefined && { categoryId })`), which passes `null` through as-is while omitting the key entirely when the field wasn't supplied.
_Alternative considered:_ omit clear-support and require callers to delete/recreate the transaction to clear a category or description. Rejected — the underlying service already supports this cleanly, and hiding it would make the MCP surface strictly weaker than the GraphQL one for no reason.

**`type` is restricted to `INCOME`, `EXPENSE`, `REFUND`, matching `create_transaction`.**
`UpdateTransactionServiceInput.type` is typed `NonTransferTransactionType | undefined`, so a transaction can never be turned into a transfer via update, and the GraphQL resolver enforces the same restriction via `parseNonTransferType`. The MCP tool's zod enum mirrors this at the schema level rather than relying on a runtime check.

**Existing transfer transactions remain updatable for non-type fields.**
When `type` is omitted, the service keeps the transaction's existing type — including `TRANSFER_IN`/`TRANSFER_OUT` — and only validates the fields actually supplied. This matches current GraphQL mutation behavior (no special-casing there either), so the MCP tool applies no additional guard. Note this only updates one side of a transfer pair; that asymmetry is pre-existing service-layer behavior, not something introduced by this change.

**`accountId` is optional with no clear semantics (no `null`).**
A transaction always belongs to exactly one account, so "clear the account" isn't a meaningful state — matching `UpdateTransactionServiceInput.accountId: string | undefined`.

**Error handling reuses the `create_transaction` pattern.**
`TransactionService.updateTransaction` throws `BusinessError` (not found, invalid account/category, currency mismatch) or `ModelError` (invariant violations). Both extend `Error`, so the existing `try { ... } catch (error) { if (error instanceof Error) return Failure(error.message); throw error; }` pattern from `create-transaction.ts` is reused as-is.

**Tool naming: `update_transaction`.**
Consistent with existing MCP naming (`create_transaction`, `update_account`, `update_category`).

## Risks / Trade-offs

- **The MCP tool is the first agent-facing surface with clear-vs-leave-unchanged semantics** → Mitigation: the design decision above is documented so a future `update_transaction`-equivalent langchain tool (if ever added) can reuse the same schema pattern rather than reinventing it.
- **No guard against silently desynchronizing a transfer pair when only one side's amount/date is updated** → Mitigation: this is pre-existing behavior at the service and GraphQL layers, not a new risk introduced by this change; out of scope here.

## Constitution Compliance

- **Backend Layer Structure**: The tool calls `TransactionService` directly, consistent with the existing `create_transaction` MCP tool bypassing the GraphQL resolver layer entirely for this non-GraphQL API surface.
- **Result Pattern**: The tool maps `TransactionService` outcomes to `Result`/`Failure` before handing off to `toToolResult`, matching `create-transaction.ts`.
- **Backend Domain Entities**: No changes to `Transaction`; its private constructor and invariants are unaffected.
- **Authentication & Authorization**: `userId` comes from the authenticated MCP session (`createAuthenticatedMcpServer`), never from tool input.
- **TypeScript Code Generation**: New code follows existing naming and argument conventions from `create-transaction.ts` and `update-account.ts`.
- **Test Strategy**: The new tool file is co-located with its `.test.ts` counterpart.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change.
