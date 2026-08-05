# Design: Add MCP Guides Tool

## Context

The MCP server lets external AI agents read and write the user's data: accounts, categories, and transactions. The agents are Claude web and Claude desktop.

To use those tools correctly, an agent needs domain knowledge. What a category's report-exclusion flag means. Why a REFUND reduces spending. That historical queries must include archived data.

Today that knowledge sits in the tool descriptions. Three problems:

- It is copied across several tools.
- It loads into the agent's context in every conversation, even when no tool is used.
- Knowledge that spans several tools has nowhere to live.

The server has one way to influence an agent: tool definitions and tool results. It cannot see what an agent knows. It cannot remember an agent between calls. So a tool has to deliver the knowledge, and the agent has to be forced to ask for it.

## Mechanism

A **guide** is a named block of domain knowledge. Currently there is one guide. It is called `basics`.

A new tool, `load_guides`, hands guides out. Every other tool refuses to run until the agent proves it fetched them. A tool that requires a guide is called **gated**.

The proof is a **guide token**. It is an opaque value. The server issues it together with the guide. For example: `basics.3F9A2B71`. The agent cannot get that value any other way. It has to call `load_guides` and read it off the response.

The normal sequence:

1. The agent reads the `get_transactions` description. It states that the `basics` guide is required.
2. The agent calls `load_guides` with the name `basics`.
3. The server returns the guide text and the token `basics.3F9A2B71`.
4. The agent calls `get_transactions`. It passes the usual arguments plus `guideTokens: ["basics.3F9A2B71"]`.
5. The server accepts the token as current.
6. The transactions are returned.

When the token is missing, malformed, or wrong:

- The tool returns a failure.
- Nothing is read. Nothing is written.
- The failure text names the required guide. It tells the agent to obtain a valid token and retry.
- The failure text never contains the correct token. Otherwise the agent could pass the check straight from the error message. It would never read the guide.

## Goals / Non-Goals

**Goals:**

- Deliver domain knowledge on a channel the client cannot drop
- Keep each piece of that knowledge in one place
- Keep it out of the agent's context until a budget tool is used
- Let a tool require several guides in one round trip

**Non-Goals:**

- Access control. Guide tokens are not credentials. They protect nothing. The MCP access token stays the only security boundary.
- Making the agent understand or follow a guide. The mechanism forces the fetch. Nothing more.
- Keeping the guide present and intact in the agent's context on later calls. See Risks.
- Touching the app's own AI assistant. That is a separate agent, built with LangChain, in `backend/src/langchain/agents/assistant-agent.ts`. Its system prompt repeats the same domain knowledge. Merging the two copies is a separate change. See the proposal.
- Versioning guides. A guide has one current version.

## Decisions

### Deliver the knowledge through a tool

MCP offers three channels. Server-level `instructions` is the intended one. It fails on three counts:

- It loads into every conversation. That is the context cost this change removes.
- The client decides whether to pass it to the model. Claude web and desktop do not.
- It is one block for the whole server. It cannot say that one tool needs one guide and another needs two.

It was also tried here already. An `instructions` block was added and then reverted (`ed8e74e5`, `78390d19`). Claude web and desktop never passed it to the model. Its content was almost the same as the `basics` guide.

So the content is not the problem. The channel is. A tool call cannot be dropped. The protocol also lets each client decide whether to show `instructions` at all, so other clients may drop it too.

Resources and prompts have to be attached by the client or the user. Neither fires on a tool call.

That leaves tools. Setting `instructions` next to `load_guides` is not worth it. It would repeat the tool description and the failure message, on a channel that enforces nothing.

### Derive the token from the guide's content

The token is the guide name, a dot, and 8 characters. Those 8 characters are the start of the SHA-256 digest of the guide text, upper-cased. For example: `basics.3F9A2B71`.

The token has to meet two constraints. The agent must not be able to produce it without reading the guide. The server must verify it without keeping anything.

Alternatives rejected:

- **Anything the agent can guess.** The bare guide name. A timestamp or the current date. A model would supply the value at once and never call `load_guides`.
- **Random tokens.** They would have to be kept somewhere to be checked later.
- **A value derived from a server secret**, such as an HMAC of the guide name. It is unguessable and needs nothing kept. But it does not change when the guide is edited. It also adds a secret to manage.

A content hash meets both constraints. It also invalidates old tokens when a guide is edited. And every Lambda invocation produces the same token.

Eight characters is enough. A model cannot compute a hash, so it cannot reconstruct the value. Collisions do not matter. Verification compares against the one valid token. It is not a lookup.

### Each tool declares its guides explicitly

A tool states its required guides at registration. A tool that declares at least one gets the `guideTokens` input and the check. A tool that declares none is untouched.

Implicit gating would need a carve-out for `load_guides` itself. It would also hide each tool's contract from its own definition.

The check needs a matching token for every declared guide. Tokens for other guides are ignored. So one `load_guides` call can cover a whole session.

### Check the token before touching the database

The check is synchronous and does no I/O. So it runs before the tool does any work. A rejected call reads nothing and writes nothing.

### Keep guide text, token building, and verification in one module

`backend/src/mcp/tools/guides.ts` holds all three. Building and parsing a token have to use one format, and both ends are needed. `load_guides` builds tokens. Every gated tool verifies them.

Putting this logic in `load-guides.ts` would force each data tool to import from a sibling tool. Nothing in `backend/src/mcp/tools/` does that today. A shared non-tool helper in that directory has precedent: `to-tool-result.ts`.

Guide text is a TypeScript constant, hashed once at module load. Tool descriptions are already written this way. Reading Markdown files at runtime would add Lambda packaging concerns and buys nothing.

### Return guides as JSON, one object per guide

`load_guides` takes a list of names. It can return several guides in one call. Each one needs its name, its token, and its body, paired without ambiguity. So the result is an array of objects with `name`, `token`, and `instruction`.

Plain text was considered. It would need a delimiter convention, and the agent would have to parse it to pair each token with its guide.

JSON also keeps `load_guides` consistent with every other tool. They all serialise through `toToolResult`. Failures keep the standard error shape.

The cost is escaping. Every newline in the guide body becomes `\n`. For a page of prose that is a few percent. It is worth paying.

### One guide for now

Several guides are supported. Only one is used. `basics` covers everything today. Inventing an `analysis` or `transfers` guide now would be speculative. `load_guides` takes and returns a list either way. A split later costs no redesign and no extra round trip.

## Risks / Trade-offs

**A token can outlive the guide it stands for.**
A short token survives truncation and summarisation. A page of prose does not. In a long conversation the agent may keep passing a valid token after the guide has left its context. Summarisation may also rewrite the guide into something it no longer says.
Mitigation: none. The server cannot tell these cases from a healthy one. Accepted as the ceiling of this approach. The guide is short, which makes it cheap to keep and cheap to reload. An agent can call `load_guides` again at any time.

**An extra round trip before any budget tool can be used.**
Mitigation: accepted. It is the cost of loading knowledge lazily. `load_guides` takes a list, so one call covers every guide a session needs.

**The agent could loop: call, failure, wrong retry, failure.**
Mitigation: each tool description states the requirement, so the normal path never fails. The failure message also names what to do next.

**A deploy that edits a guide invalidates tokens mid-conversation.**
Mitigation: the failure path is the recovery path. The agent reloads. This is rare. The alternative is agents acting on stale knowledge.

**A client or framework auto-fills the required parameter with a placeholder.**
Mitigation: verification fails closed. The message explains the fix.

**Every connected MCP client breaks at once.**
Mitigation: agents re-read tool schemas each session. Recovery is automatic. No user action is needed.

**An agent could reuse a remembered token across conversations.**
Mitigation: none, and none needed. The token guards knowledge delivery, not data.

## Migration Plan

One backend deploy. Nothing is persisted. There is no stored token, no database change, and no migration file. MCP access tokens and authentication are untouched.

Rollback is a plain revert. Removing the `guideTokens` input restores the old tool contracts. Nothing was written anywhere, so there is nothing to clean up. An agent still holding a token just passes an argument that no longer exists.

## Constitution Compliance

**Applicable principles, all compliant:**

- **Backend Layer Structure.** MCP tools stay an entry point that delegates to services. Guides add no data access. No service or repository is introduced. The layering does not change.
- **Input Validation.** A guide token is an agent-protocol concern, not a business rule. So the check belongs at the MCP boundary. It is deliberately not pushed into the service layer. Each tool's business validation stays where it is. Validation order holds: authentication, then the I/O-free token check, then anything that hits the database.
- **Result Pattern.** A rejected call is an expected, recoverable failure. It is returned as the failure variant, like the existing tools report validation failures.
- **Authentication & Authorization.** Unchanged. A guide token is not a credential. It grants no access. It never substitutes for the MCP access token. Per-user data scoping is untouched.
- **Test Strategy.** Tests are co-located as `[source-file].test.ts`. Token building and verification are pure functions and are unit tested directly. Each gated tool is tested for its rejection path.
- **TypeScript Code Generation.** Descriptive names. No abbreviations. Keyword arguments for functions taking three or more arguments.
- **Vendor Independence.** No new dependency. Hashing uses the Node standard library. Nothing runtime-specific is introduced. The server stays deployable to any Node.js runtime.
- **Code Quality Validation.** Changed-file tests, then the full backend suite, then `npm run typecheck` and `npm run format`.

**Not applicable:** Schema-Driven Development (no GraphQL change), Data Migrations, Soft-Deletion, Database Record Hydration, GraphQL Pagination Strategy, Backend Domain Entities, Backend Port Interfaces, Finder Method Naming, Frontend Code Discipline, UI Guidelines.
