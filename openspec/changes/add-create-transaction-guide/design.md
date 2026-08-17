## Context

See proposal.md - Why. The guide mechanism (`load_guides`, per-tool `requiredGuides`, guide tokens) already supports more than one guide — it just has one (`basics`) today. `GUIDES` in `backend/src/mcp/tools/guides.ts` is currently typed `Record<"basics", Guide>`. `GuideName`, `GUIDE_NAMES`, `verifyGuideTokens`, and `buildGuideTokensField` all operate generically over `GuideName`, derived from `Object.keys(GUIDES)`.

The source for the new guide's content is `backend/src/langchain/agents/create-transaction-agent.ts`'s `## Inference rules` section, which the in-app assistant already uses to fill in a transaction's fields without asking the user for anything it can infer.

## Goals / Non-Goals

**Goals:**

- Give MCP-connected agents the same field-inference behavior the in-app assistant already has for `create_transaction`'s fields
- Reuse the existing guide token mechanism unchanged
- Keep the ported rules close to their source wording rather than rewriting them

**Non-Goals:**

- `update_transaction` guide coverage — deferred, per proposal.md
- Refactoring `create-transaction-agent.ts` or sharing one source between the agent prompt and the guide — this is a port, not a merge
- Making the agent actually follow the guide — the mechanism only forces the fetch, same as the existing `basics` guide
- Guide versioning

## Decisions

### Port scope and editing discipline

Lift the `Type` / `Amount` / `Account` / `Category` / `Date` / `Description` inference rules near-verbatim from `create-transaction-agent.ts`. Keep wording close to the source rather than paraphrasing. Small duplication with `basics` (e.g. "Category MUST be active") is accepted rather than cross-referenced.

Two subsections are dropped entirely:

- `VOICE_INPUT_SUBPROMPT` — speech-to-text transcription artifacts. No MCP client transcribes voice through `create_transaction`; irrelevant to this audience.
- The `<successful-response>` output template — that block is the subagent's contract with its LangChain caller. MCP already returns the created transaction as structured tool-result JSON; the calling agent composes its own reply.

One line is adapted: `## Process` step 2 in the source reads _"If a mandatory field cannot be inferred, MUST stop and respond with an error."_ The guide instead says to ask the user for it. The source agent is a one-shot subagent that must terminate with a final answer; an MCP-connected Claude is mid-conversation and can ask a follow-up.

Alternatives considered: rewriting the rules in new prose tuned for MCP. Rejected — paraphrasing risks silently drifting from behavior already proven in the in-app assistant, and there's no reason to.

### Guide name

`create-transaction`, matching the MCP tool it gates.

Alternatives considered: `logging` (reads as generic/system-logging out of context), `transaction-entry`, `field-inference` (names the mechanism, not the tool — less obvious to an agent scanning `load_guides`' guide list). Naming it after the tool makes the pairing unambiguous.

### Guide scope

Required by `create_transaction` only. Not required by `update_transaction` (see proposal.md - What Changes for why: updates are typically targeted, already-disambiguated edits, not free text needing mandatory-field inference). Not required by `get_accounts` / `get_categories` / `get_transactions` either — those are already gated on `basics`, and the new guide's rules describe how to use their results (selection priority) rather than imposing new requirements on those tools themselves.

### Type generalization

`GUIDES`'s type becomes `Record<"basics" | "create-transaction", Guide>`. Every other guide-mechanism function already operates generically over `GuideName`, so no other signature changes — matching the original guides design's expectation that "a split later costs no redesign and no extra round trip."

### Where the content lives

`backend/src/mcp/tools/guides.ts`, alongside `basics` — no new file. Consistent with the existing decision to keep guide text, token construction, and verification in one module.

## Risks / Trade-offs

- **A second required guide token adds a gate agents must clear.** → Mitigation: `load_guides` already accepts multiple names in one call, so this stays a single round trip, not two.
- **Editing `create-transaction`'s content invalidates in-flight tokens for it, same as `basics`.** → Mitigation: none needed beyond what's already accepted for `basics` — recovery is a reload, by design.
- **Two sources of truth for the same inference rules (`create-transaction-agent.ts`'s prompt and the new guide's text) can drift over time.** → Mitigation: none; accepted duplication, matching the precedent already set for `basics` versus `assistant-agent.ts`'s system prompt.

## Migration Plan

One backend deploy. Guide text is a compile-time constant, hashed on first use — no migration file, no schema change, nothing persisted. Rollback is a plain revert: restore `requiredGuides` on `create_transaction` to `["basics"]` and drop the new guide constant.

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — the new guide is data in an existing MCP-layer module; no service or repository touched.
- **TypeScript Code Generation** — `GuideName`'s widened union keeps every existing signature (`verifyGuideTokens`, `buildGuideTokensField`) unchanged; no new abbreviations or assertions introduced.
- **Test Strategy** — new guide content and the second `requiredGuides` entry are covered by the existing co-located test files (`guides.test.ts`, `create-transaction.test.ts`), extended rather than restructured.
- **Vendor Independence** — no new dependency; token derivation continues to use the Node `crypto` standard library already in place for `basics`.

**Not applicable:** Schema-Driven Development, Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend Domain Entities, Backend Port Interfaces, Authentication & Authorization, Frontend Code Discipline, UI Guidelines — same as proposal.md, unchanged by this design.
