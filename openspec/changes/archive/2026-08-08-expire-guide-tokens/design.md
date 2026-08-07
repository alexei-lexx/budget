## Context

MCP tools require a guide token before they run. Today, `guides.ts` builds that token as `sha256(instruction)` — a hash of the guide text, nothing else. Computed once, when the module loads.

That token never changes unless the guide text changes. So a token issued in one conversation stays valid in every later conversation. Forever.

A real agent proved this is a problem. Connected via Claude web, it answered a data question using token `basics.390CC794` — the real, current token — without calling `load_guides` in that session. It got the token from memory of a past, unrelated conversation, and the server accepted it.

The whole point of the token is to force the agent to fetch the guide before it acts. A token that never expires only forces that once — the first time the agent ever sees it. After that, nothing forces anything.

The original design already named this exact risk and accepted it: "the token guards knowledge delivery, not data." This design says that's not enough — delivery is only "guarded" if it keeps getting re-forced, not just forced once, ever.

## Goals / Non-Goals

**Goals:**

- A guide token issued by `load_guides` stops being valid after roughly one hour, so an agent cannot rely on a token remembered from an earlier conversation.
- No token verification fails solely because a request landed just after an hourly boundary.
- Every other file that touches guide tokens today (`load-guides.ts`, every gated tool) stays exactly as it is — no new parameter, no new import, no new awareness that tokens are time-based.
- The server stays stateless: no token is stored, no session is tracked, verification still needs nothing but the guide's content and the current time.

**Non-Goals:**

- Access control. Unchanged from `add-mcp-guides-tool`: guide tokens are not credentials and this change doesn't make them one.
- Defending against an agent that can execute its own code to recompute the hash. The formula is public (this document) either way; closing that would need a server-side secret, which was considered and rejected — see Decisions.
- Session-scoped tokens (one issued token valid only for the connection that requested it). That needs server-kept state per MCP session, which the original design deliberately avoided for statelessness and which this change does not reopen.

## Decisions

### Fold a time bucket into the existing content hash, no secret

`buildGuideToken(name, instruction)` becomes `buildGuideToken(name, instruction, timestamp = Date.now())`, hashing `instruction` together with `Math.floor(timestamp / HOUR_MS)` instead of `instruction` alone.

Alternatives considered:

- **HMAC with a server secret, keyed by content and time bucket.** Makes the token unreproducible by anything outside the server, including an agent with code execution. Rejected for now: it reopens the objection the original design raised against secret-derived tokens ("adds a secret to manage"), and the immediate, demonstrated problem is memorized reuse across sessions, not code-execution recomputation. Plain hashing fully closes the demonstrated gap; a secret is worth adding only if the code-execution threat becomes the one actually being defended against.
- **Session-bound tokens, tracked server-side.** Strongest guarantee (forces a fetch every session, not just every hour) but requires persisting issued tokens against an MCP session id, which trades away the stateless property the original design called out under Vendor Independence. Bigger change than this problem currently justifies.

### `token` becomes a getter, not an exported function

`Guide.token` stays a property (`token: string` in the interface is unaffected — TypeScript does not distinguish a stored field from an accessor for structural typing), but `GUIDES.basics` defines it with `get token()`, computed via `buildGuideToken("basics", BASICS_INSTRUCTION)` on every read instead of once at module load.

Alternative considered: export `buildGuideToken` for `load-guides.ts` to call directly. Rejected — exposes that tokens are time-based to a file that has no reason to know.

The getter avoids this entirely: nothing is exported, so `load-guides.ts` never gains a parameter to call with in the first place — `guide.token` stays the only thing it touches, identical to today, zero-argument. With `buildGuideToken` no longer exported, whatever parameter it takes internally is purely an implementation detail — only the getter and `verifyGuideTokens` call it, both already inside `guides.ts`.

### Verification checks the current bucket and the one before it

Buckets have hard edges, e.g. 1:00, 2:00. An agent can call `load_guides` at 1:59 and get a "1pm" token, then call the tool it unlocks at 2:01 — still correct, in-sequence usage, just seconds later. If verification only accepted the exact current bucket, that normal case would fail.

So `verifyGuideTokens` checks the token against two values: the current bucket's token and the previous bucket's token (`buildGuideToken` called with `Date.now()` and again with `Date.now() - HOUR_MS`). Either match passes. A token from last week still fails both checks, so stale reuse is still blocked — only the one-bucket-old edge case is spared.

Alternative considered: accept only the exact current bucket. Rejected — it would fail correct agent behavior on every clock-boundary crossing, for no extra security (an old, unrelated-session token is already blocked by the two-bucket check just as well).

### Bucket width: 1 hour

Agent memory lasts forever. 1 hour doesn't. Token expires before memory gets a chance to reuse it. Still long enough to cover one normal session.

## Risks / Trade-offs

**An agent with code execution can still recompute a valid token without calling `load_guides`.**
The formula (`sha256` of content and a public, derivable time bucket) is fully reproducible by anything that can run a hash function and knows the current guide content from a prior fetch. No mitigation in this change — accepted, see Non-Goals. Closing this needs a server secret, deferred until it's the threat actually being observed.

**Worst-case validity window is just under two hours, not one.**
Accepting the previous bucket to avoid boundary-cliff failures means a token issued near the start of an hour can still validate just before the next hour ends. Accepted: still a large improvement over unbounded validity, and the alternative (reject on exact bucket match) trades this for spurious failures on correct usage.

**`Guide.token`'s value now depends on when it's read, not just what guide it is.**
Two reads of `guide.token` a bucket apart return different (both individually valid) strings. This is intentional — `load-guides.ts` only ever reads it once per request — but is a behavior change worth naming: `token` is no longer a fact about a guide, it's a fact about a guide at a moment.

**Tests that assert on a specific token value need a controlled clock.**
`guides.test.ts` today asserts things like `GUIDES.basics.token` matches a shape and compares tokens for equality across calls in the same test; those patterns keep working since a single test still reads the getter within the same bucket. Tests that need to exercise bucket rollover (the two-bucket-tolerance behavior, or that a stale token from bucket N-2 is rejected) will need to fix the clock (e.g. `vi.useFakeTimers()` / `vi.setSystemTime()`) to move across a boundary deterministically.

## Migration Plan

One backend deploy, same as `add-mcp-guides-tool`. Nothing persisted, nothing to migrate. Every currently-issued token from before this deploy is treated as belonging to whatever bucket its content-only hash implies — none of them coincide with the new content-plus-bucket hash, so every connected agent's held tokens invalidate at deploy time and get the existing rejection-and-reload path. No user action needed; agents already re-read tool schemas and recover automatically per the original design's migration notes.

Rollback is a plain revert: `buildGuideToken` drops the time input, `token` goes back to a static field. Nothing was written anywhere, so nothing to clean up.

## Open Questions

None — the mechanism, its boundaries, and its accepted risks are settled by the decisions above.

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — no service or repository touched; this stays inside the MCP entry-point layer, same as the mechanism it modifies.
- **Vendor Independence** — no external service, no persisted state, no secret added. The server remains deployable to any Node.js runtime without change.
- **Result Pattern** — `verifyGuideTokens` keeps returning `Result<true>`; behavior of the failure path is unchanged.
- **Test Strategy** — changes are unit tested in the co-located `guides.test.ts`, using a controlled clock for bucket-boundary cases.
- **TypeScript Code Generation** — `buildGuideToken`'s new parameter is a keyword-free positional default (`timestamp = Date.now()`), consistent with its existing two positional parameters; no abbreviations introduced.
- **Code Quality Validation** — changed-file tests, then full backend suite, then `npm run typecheck` and `npm run format`.

**Not applicable:** Schema-Driven Development, Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend GraphQL Layer, Backend Domain Entities, Backend Port Interfaces, Backend Service Layer, Authentication & Authorization, Frontend Code Discipline, UI Guidelines, Finder Method Naming, Method Ordering.
