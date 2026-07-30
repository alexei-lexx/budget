## Context

The MCP server (`backend/src/mcp/`) already exposes `get_categories`, `get_accounts`, `get_transactions`, `create_account`, `update_account`, and `create_transaction`, each a thin wrapper: an MCP-specific zod schema, a description, and a call into the existing service layer, mapped to `Result`/`CallToolResult` via `toToolResult`. `CategoryService` already implements `createCategory` and `updateCategory` with full business rules (name length/trim validation, duplicate-name check). An equivalent agent-facing surface already exists for the in-app AI chat, in `backend/src/langchain/tools/create-category.ts` and `update-category.ts`, built on the `langchain` `tool()` helper against the same `CategoryService`.

This change adds no new business logic — it wires two more MCP tools over behavior that already exists and is already exposed through a parallel agent surface, following the exact precedent set by `add-account-mcp-tools`. None of the design.md trigger conditions (cross-cutting change, new dependency, data model change, security/performance/migration complexity) apply beyond what that precedent already covers; the value of this document is recording the behavioral decisions carried over from the langchain tools, so the MCP versions don't silently diverge.

## Goals / Non-Goals

**Goals:**

- Expose `create_category` and `update_category` as MCP tools, scoped to the authenticated user, following the exact structural pattern of `create-account.ts`/`update-account.ts`.
- Keep MCP tool behavior consistent with the existing langchain tools for the same operations, since both sit on top of the same `CategoryService`.

**Non-Goals:**

- No changes to `CategoryService`, `Category` model, or any repository.
- No archive/delete category tool.
- No GraphQL schema changes.
- No change to the langchain tools themselves.

## Decisions

**`create_category` requires `name`, `type`, and `excludeFromReports` (defaulting to `false`).**
This matches the langchain `create_category` tool's schema exactly (`z.boolean().default(false)` for `excludeFromReports`), which in turn matches `CategoryService.createCategory`'s input. No divergence between the two agent surfaces.

**`update_category` accepts `id` (required) plus optional `name`, `type`, `excludeFromReports`.**
Matches the langchain `update_category` tool's schema, which uses `.strict()` to reject unknown fields. The MCP version mirrors the same optional-field set; only supplied fields are forwarded to `CategoryService.updateCategory`.

**Descriptions carry over the langchain tools' agent guidance verbatim where it is caller-facing.**
The langchain tool descriptions instruct the calling agent to check existing categories first and confirm with the user on near-duplicate names before creating/updating. This guidance is about how a calling agent should behave, not about the langchain framework specifically, so it applies equally to MCP clients and is reused as-is.

**Error handling reuses the `create_account`/`update_account` pattern.**
`CategoryService.createCategory`/`updateCategory` throw `BusinessError` (name length, duplicate name). It extends `Error`, so the existing `try { ... } catch (error) { if (error instanceof Error) return Failure(error.message); throw error; }` pattern from `create-account.ts`/`update-account.ts` is reused as-is — no new error type or handling logic needed.

**No archive/delete tool.**
Archiving a category is a deletion-equivalent action, not something to hand to an agent in this change. Only `create_category` and `update_category` are added.

**Tool naming matches the langchain tools: `create_category`, `update_category`.**
Consistent with existing MCP naming (`get_categories`, `create_account`, `update_account`) and with the langchain tools performing the same operations. No collision risk — different MCP servers.

## Risks / Trade-offs

- **Two agent surfaces (langchain in-app chat, MCP) implement the same operations against `CategoryService` with hand-maintained parity** (e.g., the near-duplicate-name confirmation guidance in the description) → Mitigation: this change documents the parity explicitly; any future change to one tool's input/output shape or description should check the sibling tool in the other surface.

## Constitution Compliance

- **Backend Layer Structure**: Both tools call `CategoryService` directly, consistent with the existing `create_account`/`update_account` MCP tools bypassing the GraphQL resolver layer entirely for this non-GraphQL API surface.
- **Result Pattern**: Both tools map `CategoryService` outcomes to `Result`/`Failure` before handing off to `toToolResult`, matching `create-account.ts`/`update-account.ts`.
- **Backend Domain Entities**: No changes to `Category`; its private constructor and invariants are unaffected.
- **Authentication & Authorization**: `userId` comes from the authenticated MCP session (`createAuthenticatedMcpServer`), never from tool input.
- **TypeScript Code Generation**: New code follows existing naming and argument conventions from `create-account.ts`/`update-account.ts`.
- **Test Strategy**: New tool files are co-located with their `.test.ts` counterparts.
- **Schema-Driven Development**: Not applicable — no GraphQL schema change.
