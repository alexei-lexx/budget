# Tasks: Add MCP Guides Tool

## 1. Guides Module

- [x] 1.1 Draft the `basics` guide text from the assistant agent's system prompt in `backend/src/langchain/agents/assistant-agent.ts`, dropping its agent-specific output formatting rules and keeping the domain model, report exclusion, refund and transfer semantics, archived data, and analysis/calculation rules
- [x] 1.2 (use `testing` skill) Write tests for `backend/src/mcp/tools/guides.ts`: a token has the form `<name>.<HASH8>`, tokens differ per guide, a token changes when the guide text changes, verification accepts a matching token, rejects a missing/malformed/wrong token, and ignores tokens for guides that were not required
- [x] 1.3 Implement `backend/src/mcp/tools/guides.ts`: the `basics` guide constant, guide lookup by name, token building (SHA-256 of the guide text via `node:crypto`, first 8 characters upper-cased, hashed once at module load), and verification of a token list against a list of required guide names
- [x] 1.4 Add the shared `guideTokens` Zod input field and the rejection failure to `guides.ts`, with a message that names the required guides and tells the agent to call `load_guides` and retry, and never contains a valid token

## 2. `load_guides` Tool

- [x] 2.1 (use `testing` skill) Write tests for `backend/src/mcp/tools/load-guides.ts`: one name returns one guide object with `name`, `token`, and `instruction`; several names return one object per name with each token paired to its own guide; an unknown name returns a failure naming it and returns no guides
- [x] 2.2 Implement `load-guides.ts` with `names` as its only input, returning the guide array through the Result pattern and `toToolResult`, with no `guideTokens` input of its own
- [x] 2.3 Register `load_guides` in `backend/src/mcp/server.ts` and update the tool-count and tool-name assertions in `server.test.ts` (9 tools become 10)

## 3. Gate the Account Tools

- [x] 3.1 (use `testing` skill) Add rejection-path tests to `get-accounts.test.ts`, `create-account.test.ts`, and `update-account.test.ts`: without a valid `basics` token the tool fails, the failure names the guide, the failure contains no valid token, and the service is never called
- [x] 3.2 (use `testing` skill) Update the existing success-path tests in those three files to pass a valid `basics` token
- [x] 3.3 Add the required `guideTokens` input and the pre-service token check to `get-accounts.ts`, `create-account.ts`, and `update-account.ts`, declaring `basics`
- [x] 3.4 Strip domain knowledge from the three descriptions, keeping only what is specific to each tool, and name the required guide in the `guideTokens` field description

## 4. Gate the Category Tools

- [x] 4.1 (use `testing` skill) Add rejection-path tests to `get-categories.test.ts`, `create-category.test.ts`, and `update-category.test.ts`, matching the account tools' pattern
- [x] 4.2 (use `testing` skill) Update the existing success-path tests in those three files to pass a valid `basics` token
- [x] 4.3 Add the required `guideTokens` input and the pre-service token check to `get-categories.ts`, `create-category.ts`, and `update-category.ts`, declaring `basics`
- [x] 4.4 Strip domain knowledge from the three descriptions and name the required guide in the `guideTokens` field description

## 5. Gate the Transaction Tools

- [x] 5.1 (use `testing` skill) Add rejection-path tests to `get-transactions.test.ts`, `create-transaction.test.ts`, and `update-transaction.test.ts`, asserting in `get-transactions.test.ts` that the token check runs before the date-range validation and before any repository call
- [x] 5.2 (use `testing` skill) Update the existing success-path tests in those three files to pass a valid `basics` token
- [x] 5.3 Add the required `guideTokens` input and the pre-service token check to `get-transactions.ts`, `create-transaction.ts`, and `update-transaction.ts`, declaring `basics`
- [x] 5.4 Strip domain knowledge from the three descriptions, keeping tool-specific constraints (the 365-day range cap, currency inherited from the account, transfers not creatable or settable here), and name the required guide in the `guideTokens` field description

## 6. Validation

- [x] 6.1 Run the tests for every changed file, then the full backend suite (`npm test` in `backend/`)
- [x] 6.2 Run `npm run typecheck` and `npm run format` in `backend/` and resolve all issues
- [x] 6.3 Connect an MCP client to the running backend and confirm the full round trip: a gated tool called without a token is rejected, `load_guides` returns the guide and its token, and the same call with that token succeeds

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — MCP tools remain an entry point that delegates to services. The guides module adds no data access, so no service or repository is introduced.
- **Input Validation** — the guide token check is an agent-protocol concern and stays at the MCP boundary, never pushed into the service layer. Validation ordering holds: authentication, then the I/O-free token check, then anything that touches the database.
- **Result Pattern** — token rejection is an expected, caller-recoverable failure and is returned as the failure variant, like the existing tools' validation failures.
- **Authentication & Authorization** — unchanged. A guide token is not a credential, grants no data access, and never substitutes for the MCP access token; per-user data scoping is untouched.
- **Test Strategy** — tests are co-located as `[source-file].test.ts`. Token building and verification are pure functions and are unit tested directly; each gated tool is tested for its rejection path.
- **TypeScript Code Generation** — descriptive names, no abbreviations, keyword arguments for functions taking three or more arguments.
- **Vendor Independence** — no new dependency; hashing uses the Node standard library and the server stays stateless.
- **Code Quality Validation** — changed-file tests, then the full backend suite, then `npm run typecheck` and `npm run format` (tasks 6.1–6.2).

**Not applicable:** Schema-Driven Development (no GraphQL change), Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend Domain Entities, Backend Port Interfaces, Finder Method Naming, Frontend Code Discipline, UI Guidelines.
