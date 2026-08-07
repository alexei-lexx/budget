## Why

Guide tokens (introduced in `add-mcp-guides-tool`) are derived only from guide content, so the same token stays valid forever once content stops changing. This was accepted as a low-risk trade-off, but observed agent behavior shows it defeats the mechanism's actual purpose: an agent can skip `load_guides` in a session entirely by supplying a token it recalls from an earlier, unrelated conversation (via persistent cross-session memory), and the tool proceeds without the guide's current content ever entering the agent's working context. Content-only derivation cannot close this gap on its own — it needs an expiry dimension.

## What Changes

- Guide token derivation in `backend/src/mcp/tools/guides.ts` incorporates a 1-hour time bucket in addition to guide content, so a token issued by `load_guides` expires roughly an hour after issuance.
- Token verification accepts the current time bucket and the immediately preceding one, so a token remains valid for up to ~2 hours and no legitimate call fails solely for landing just after an hourly boundary.
- All bucket and expiry logic stays inside `guides.ts`; no other file needs to change or gains any awareness that tokens are time-based.
- No server secret is introduced. The token remains a plain content-derived hash, now also keyed by the time bucket, so the server stays stateless and keeps nothing to manage or leak.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mcp-server`: the "Load Guides via MCP" requirement's token-derivation rule changes from content-only to content-plus-time-bucket, and the "Guide Token Enforcement" requirement gains a boundary-tolerance rule (current and previous bucket both accepted).

## Impact

**Affected code** — `backend/src/mcp/tools/guides.ts` only, plus its co-located test. Token derivation and verification both move from a one-time, content-only computation to a content-and-time computation.

**Not affected:** `load-guides.ts`, every gated tool (`get-accounts.ts`, `create-transaction.ts`, etc.) and their tests, the `guideTokens` input schema and description, GraphQL schema, services, repositories, frontend, infrastructure, database contents. No migration, no new dependency, no secret to provision.

**Consumer impact:** a token now goes stale after roughly 1–2 hours instead of never. An agent holding a stale token gets the existing rejection path (failure naming the guide, instructing it to reload) — no new failure mode, just a shorter validity window on the existing one.

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — no service or repository introduced; logic stays in the MCP entry-point layer where guide token handling already lived.
- **Vendor Independence** — the token still depends only on inputs computable inline (content, wall-clock time); no external service, no persisted state, no secret. The MCP server stays stateless and portable to any Node.js runtime.
- **Result Pattern** — `verifyGuideTokens` keeps returning `Result<true>`; interface unchanged.
- **Test Strategy** — changes are unit tested in the co-located `guides.test.ts`; no repository or service layer involved.
- **TypeScript Code Generation** — descriptive names, no abbreviations, keyword arguments for functions taking three or more arguments.
- **Code Quality Validation** — changed-file tests, then full backend suite, then `npm run typecheck` and `npm run format`.

**Not applicable:** Schema-Driven Development, Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend GraphQL Layer, Backend Domain Entities, Backend Port Interfaces, Backend Service Layer, Authentication & Authorization (guide tokens remain non-credentials, unaffected), Frontend Code Discipline, UI Guidelines, Finder Method Naming, Method Ordering (`guides.ts` exports functions, not a class).
