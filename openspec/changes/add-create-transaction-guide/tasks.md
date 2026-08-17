## 1. Guides Module

- [ ] 1.1 Draft the `create-transaction` guide text: port the `Type` / `Amount` / `Account` / `Category` / `Date` / `Description` inference rules from `create-transaction-agent.ts` near-verbatim, drop `VOICE_INPUT_SUBPROMPT` and the `<successful-response>` output template, and adapt the "stop and respond with an error" process step to "ask the user for it"
- [ ] 1.2 (use `testing` skill) Extend `guides.ts` tests: the `create-transaction` guide is present in `GUIDES`/`GUIDE_NAMES`, its token has the form `create-transaction.<HASH8>` and changes when its text changes, `verifyGuideTokens` accepts it, rejects it when missing or invalid, and — for a call requiring both `basics` and `create-transaction` — rejects when either one is missing and names the missing guide(s), while accepting when both are valid
- [ ] 1.3 Add the `create-transaction` guide constant to `guides.ts` and widen the `GUIDES` type from `Record<"basics", Guide>` to `Record<"basics" | "create-transaction", Guide>`

## 2. `load_guides` Tool Coverage

- [ ] 2.1 (use `testing` skill) Extend `load-guides.test.ts`: requesting `["create-transaction"]` returns one guide object with `name`, `token`, and `instruction`; requesting `["basics", "create-transaction"]` returns both, each token paired to its own guide
- [ ] 2.2 Run the extended tests against the existing `load-guides.ts` implementation and confirm it passes unchanged — it already iterates generically over `GUIDES`, so no production code change is expected here

## 3. Gate the Create Transaction Tool

- [ ] 3.1 (use `testing` skill) Add rejection-path tests to `create-transaction.test.ts`: missing/invalid `create-transaction` token with a valid `basics` token is rejected, missing/invalid `basics` token with a valid `create-transaction` token is rejected, both missing is rejected, each failure names the missing guide(s), and no transaction is created in any case
- [ ] 3.2 (use `testing` skill) Update the existing success-path tests in `create-transaction.test.ts` to pass valid `basics` and `create-transaction` tokens
- [ ] 3.3 Add `create-transaction` to `requiredGuides` in `create-transaction.ts` (`["basics", "create-transaction"]`)

## 4. Validation

- [ ] 4.1 Run the tests for every changed file, then the full backend suite (`npm test` in `backend/`)
- [ ] 4.2 Run `npm run typecheck` and `npm run format` in `backend/` and resolve all issues
- [ ] 4.3 Connect an MCP client to the running backend and confirm: `create_transaction` called with only a valid `basics` token is rejected, `load_guides` with `["basics", "create-transaction"]` returns both guides and tokens, and `create_transaction` with both tokens succeeds

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — all changes stay inside the existing `backend/src/mcp/tools/` entry-point layer; no service or repository touched.
- **Input Validation** — the second guide check reuses the existing MCP-boundary token check; business validation for transaction creation is untouched.
- **Result Pattern** — a missing/invalid `create-transaction` token returns the existing `Failure` variant, like every other guide rejection.
- **Test Strategy** — tests stay co-located as `[source-file].test.ts`, extended rather than restructured (tasks 1.2, 2.1, 3.1, 3.2).
- **TypeScript Code Generation** — the widened `GUIDES` type keeps every dependent signature unchanged; no new abbreviations or assertions.
- **Vendor Independence** — no new dependency; token derivation reuses the existing Node `crypto` hashing.
- **Code Quality Validation** — changed-file tests, then the full backend suite, then `npm run typecheck` and `npm run format` (tasks 4.1–4.2).

**Not applicable:** Schema-Driven Development, Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend Domain Entities, Backend Port Interfaces, Authentication & Authorization, Finder Method Naming, Frontend Code Discipline, UI Guidelines.
