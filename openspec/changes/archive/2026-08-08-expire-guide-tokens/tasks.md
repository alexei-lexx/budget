## 1. Time-bucketed token derivation

- [x] 1.1 (use `testing` skill) In `backend/src/mcp/tools/guides.test.ts`, add failing tests: reading `GUIDES.basics.token` twice within the same hour returns the same value; reading it again roughly an hour later (fake timers) returns a different value
- [x] 1.2 In `backend/src/mcp/tools/guides.ts`, add an `HOUR_MS` constant and give `buildGuideToken` a third positional parameter `timestamp = Date.now()`, hashing `instruction` together with `Math.floor(timestamp / HOUR_MS)` instead of `instruction` alone; keep `buildGuideToken` unexported — it stays a private, module-internal helper, called only from the `token` getter and `verifyGuideTokens`
- [x] 1.3 Change `GUIDES.basics.token` from a static field to a `get token()` accessor that calls `buildGuideToken("basics", BASICS_INSTRUCTION)` on every read, so each read reflects the current time bucket
- [x] 1.4 Run `npm test -- guides.test.ts` in `backend/` and confirm the new tests and the existing `token has form name.HASH8` test pass

## 2. Boundary-tolerant verification

- [x] 2.1 (use `testing` skill) In `backend/src/mcp/tools/guides.test.ts`, add failing tests for `verifyGuideTokens`: a token built for the immediately preceding hour bucket (fake timers) is accepted; a token built two or more buckets in the past is rejected with the existing "Missing or invalid guide token" message
- [x] 2.2 In `backend/src/mcp/tools/guides.ts`, update `verifyGuideTokens` so a guide is considered satisfied when the supplied token matches either the guide's current-bucket token or its previous-bucket token (`buildGuideToken(name, instruction, Date.now())` or `buildGuideToken(name, instruction, Date.now() - HOUR_MS)`)
- [x] 2.3 Run `npm test -- guides.test.ts` in `backend/` and confirm all tests pass, including the pre-existing happy-path, missing-token, malformed-token, and no-disclosure cases

## 3. Validation

- [x] 3.1 Run `npm test` in `backend/` (full suite) and confirm no regressions in `load-guides.test.ts` or any gated tool's tests
- [x] 3.2 Run `npm run typecheck` and `npm run format` in `backend/` and resolve any issues

## Constitution Compliance

- **Backend Layer Structure** — not applicable to these tasks: no service or repository is touched; all work stays inside the MCP entry-point layer (`guides.ts`).
- **Vendor Independence** — compliant: no external service, persisted state, or secret is introduced by any task.
- **Result Pattern** — compliant: `verifyGuideTokens` keeps returning `Result<true>`; no task changes its interface.
- **Test Strategy** — compliant: tasks 1.1 and 2.1 add unit tests co-located in `guides.test.ts`; no repository or service layer involved.
- **TypeScript Code Generation** — compliant: task 1.2 adds `buildGuideToken`'s new parameter as a positional default, consistent with its existing two positional parameters, per the design decision; no abbreviations introduced.
- **Code Quality Validation** — compliant: tasks 1.4 and 2.3 gate each group on its own test file before task 3 runs the full suite, typecheck, and format.

**Not applicable:** Schema-Driven Development, Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend GraphQL Layer, Backend Domain Entities, Backend Port Interfaces, Backend Service Layer, Authentication & Authorization, Frontend Code Discipline, UI Guidelines, Finder Method Naming, Method Ordering.
