# Add MCP Guides Tool

## Why

The MCP server exposes its tools to external AI agents, but has no reliable way to give those agents the domain knowledge needed to use them correctly. Today the knowledge lives scattered across individual tool descriptions — duplicated, always loaded into the agent's context whether or not the tools are used, and unable to express anything cross-cutting. Rules that span multiple tools (exclude report-excluded categories from totals, how REFUND affects spending, include archived data for historical periods, ask before assuming a period) have nowhere to live at all, so external agents produce incorrect analysis.

Server-level MCP `instructions` are the protocol's intended channel for this, but clients are not obliged to surface them and Claude web and desktop do not reliably do so. Tool definitions are the only channel that always reaches the agent — so the knowledge must be delivered through a tool, and the agent must be made to fetch it.

## What Changes

- Add an MCP tool `load_guides` that takes one or more guide names and returns each guide's full text together with a **guide token** of the form `<name>.<HASH8>`, where `HASH8` is derived from the guide's content. `load_guides` itself requires no token.
- Add a single guide named `basics`, covering the account/category/transaction domain model, report exclusion, refund and transfer semantics, archived data, and the rules for analysis and calculations. Its content is derived from the assistant agent's existing background knowledge, minus the agent-specific output formatting rules.
- **BREAKING** — Each MCP tool explicitly declares which guides it requires. A tool that declares at least one guide gains a required `guideTokens` input (array of strings), and is rejected without performing its operation when invoked without a valid token for each guide it declared. A tool that declares no guides keeps its current input and is unaffected. Under this change, every tool except `load_guides` declares `basics`.
- The rejection message names the required guide and instructs the agent to load it and retry, and never discloses a valid token — otherwise the agent could satisfy the check from the error alone, without ever receiving the guide's content.
- Because the token is derived from guide content, editing a guide invalidates previously issued tokens and forces agents to re-read it.
- Strip domain knowledge out of the tool descriptions once it lives in a guide. A description keeps only what is specific to its own tool: what the tool does and its own constraints (for example the date-range cap, that currency is inherited from the account, or that transfers are not creatable here). What the entities are and how they behave moves to the guide. Which guides a tool requires is named in the description of its `guideTokens` input.

## Capabilities

### New Capabilities

None. Guides are part of the existing MCP surface rather than a separate capability.

### Modified Capabilities

- `mcp-server`: adds two requirements — one for the `load_guides` tool, one for guide token enforcement across the tool surface — and modifies every existing tool requirement, each of which gains the required `guideTokens` input.

## Impact

**Affected code** — `backend/` only:

- New `backend/src/mcp/tools/guides.ts` plus co-located test — guide text, token construction, and token verification, shared by `load_guides` and every gated tool
- New tool `backend/src/mcp/tools/load-guides.ts` plus co-located test
- Every existing tool in `backend/src/mcp/tools/` and its co-located test: new input, new rejection path, slimmed description
- `backend/src/mcp/server.ts`: register `load_guides`

**Affected consumers:** every configured MCP client (Claude web, Claude desktop) breaks until its agent adapts. Agents re-read tool schemas each session, so adaptation is automatic; no client-side configuration change is needed.

**Cost:** one additional tool call per session before any budget tool can be used.

**Not affected:** GraphQL schema and resolvers, services, repositories, ports, domain entities, frontend, infrastructure, database contents. No migration. No new dependencies — content hashing uses the Node standard library.

**Deliberately out of scope:** the LangChain assistant agent at `backend/src/langchain/agents/assistant-agent.ts` states the same domain knowledge in its system prompt, and still will after this change. Collapsing the two into one shared source is a separate change with its own trade-offs, since the agent prompt and the guide address different audiences.

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure** — MCP tools are an entry point alongside GraphQL resolvers and continue to delegate to services. Guide loading and token verification introduce no data access, so no service or repository is added; the guides module is pure.
- **Input Validation** — the MCP layer stays thin, as the GraphQL layer does. Guide tokens are an agent-protocol concern, not a business rule, so verification belongs at the MCP boundary and MUST NOT be pushed into the service layer. Business validation for each tool is unchanged and stays in services.
- **Result Pattern** — token rejection is an expected, caller-recoverable failure and is returned as the failure variant, consistent with how the existing tools report validation failures.
- **Authentication & Authorization** — unchanged. Guide tokens are not credentials and grant no access to data; MCP access token authentication and per-user data scoping continue to apply as before, and a valid guide token never substitutes for authentication.
- **Test Strategy** — tests are co-located as `[source-file].test.ts` beside each source file. Guide token verification is a pure function and is unit tested.
- **TypeScript Code Generation** — descriptive names, no abbreviations; keyword arguments for functions taking three or more arguments.
- **Code Quality Validation** — changed-file tests, then the full backend suite, then `npm run typecheck` and `npm run format`.

**Not applicable:** Schema-Driven Development (no GraphQL change), Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Frontend Code Discipline, UI Guidelines.

**Vendor Independence** — unaffected and reinforced: the MCP server runs stateless (`sessionIdGenerator: undefined` in both the local server and the Lambda handler), and deriving the token from guide content rather than from server-side session state keeps it that way. No runtime-specific behaviour is introduced.
