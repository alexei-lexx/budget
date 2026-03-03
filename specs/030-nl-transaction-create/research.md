# Research: Natural Language Transaction Creation

**Phase 0 output** | **Date**: 2026-03-03 | **Plan**: [plan.md](plan.md)

---

## Decision 1: Service Naming

**Decision**: `CreateTransactionFromTextService` (not `NlTransactionService`)

**Rationale**:
- The constitution requires descriptive names that reveal intent — "avoid abbreviated forms that obscure meaning"
- `NlTransactionService` is an abbreviation (`Nl` for Natural Language) that conceals purpose
- `CreateTransactionFromTextService` names exactly what the service does: creates a transaction from a text input
- Consistent with `InsightService` naming (names the outcome, not the technology)
- The service's `call()` method signature becomes self-documenting: `call(userId, text) → Transaction`

**Alternatives considered**:
- `NlTransactionService` — rejected: `Nl` prefix is an abbreviation that obscures what the service actually _does_
- `TransactionFromTextCreatorService` — rejected: awkward word order
- `AiTransactionService` — rejected: leaks implementation detail (AI); the technology may change

---

## Decision 2: Technical Approach — Fully Autonomous ReAct Agent with `createTransaction` Tool

**Decision**: The agent is fully autonomous. It uses data tools to gather context, reasons over all transaction fields, and **calls a `createTransaction` tool itself** to persist the transaction. The tool returns the full created transaction object; the agent constructs `{ "transaction": { "id": "..." } }` as its final answer; the service parses `transaction.id` from `response.answer` and fetches the full `Transaction` by ID.

**Tool set**: `getAccounts`, `getCategories`, `getTransactions` (data), `createTransaction` (terminal action)

**Rationale**:
- The user explicitly requires the agent to be autonomous and to **create** the transaction, not just infer attributes
- A `createTransaction` tool as the terminal action is the natural ReAct pattern: reason with data tools, then act with a write tool
- All reasoning (account resolution, category selection, type inference) lives in the agent prompt, not split across service code
- Using `response.answer` as the result carrier is the simplest mechanism — no new fields, no scanning `toolExecutions`, identical to how `InsightService` reads its result
- Returning only `{ id }` from the tool keeps the tool output minimal; the full `Transaction` is fetched by ID after the agent returns, giving a canonical DB-sourced object

**Alternatives considered**:
- Agent returns a structured JSON answer *without* calling a write tool — rejected: the agent does not create the transaction; service would have to call `TransactionService.createTransaction` itself, splitting intelligence between agent and service
- Rule-based parsing only — rejected by spec: "All field inference is powered by a natural language AI model"
- Math tools (`avgTool`, `calculateTool`, `sumTool`) — not needed; no numeric aggregation required here

---

## Decision 3: Agent Output — Tool Returns Full Transaction, Agent Answers `{ transaction: { id } }`

**Decision**: The agent calls the `createTransaction` tool as its terminal action. The tool returns `JSON.stringify(createdTransaction)` (full object, same pattern as data tools); the agent constructs `{ "transaction": { "id": "..." } }` as its final answer; the service parses `transaction.id` from `response.answer` and fetches the full `Transaction` by ID.

**`createTransaction` tool**:
```typescript
// Input schema (validated by Zod inside the tool):
{
  type: "EXPENSE" | "INCOME" | "REFUND",
  amount: number,        // positive
  accountId: string,
  categoryId?: string,   // omit when no category matches
  date: string,          // YYYY-MM-DD
  description?: string,  // omit when nothing meaningful extracted
}
```
Tool function: calls `transactionService.createTransaction(input, userId)`, returns `JSON.stringify(createdTransaction)` back to the agent — full transaction object, consistent with how data tools return their payloads.

**How the service retrieves the result**:
The system prompt instructs the agent to output `{ "transaction": { "id": "<id from createTransaction result>" } }` as its final answer — the agent extracts just the `id` from the tool's full-object response. The service parses `transaction.id` from `response.answer`, then fetches the full `Transaction` by ID:

```typescript
const response = await agent.call({ messages, systemPrompt, tools });

const parsed = JSON.parse(response.answer); // { transaction: { id: string } }
return transactionService.getTransactionById(parsed.transaction.id, userId);
```

Simple parse, canonical DB-sourced `Transaction` object.

**Error handling**: If the agent cannot resolve required fields, it does NOT call `createTransaction` and its final answer is a plain-text explanation. `JSON.parse(response.answer)` fails or yields no `transaction.id`; the service throws a `BusinessError` with the agent's answer as the user-facing message.

**Rationale**:
- `response.answer` already exists on every agent call — no new mechanism needed
- Parsing `{ transaction: { id } }` is trivially simple; no other Transaction shape assumptions in the parse step
- Fetching by ID gives a canonical, DB-validated `Transaction` object
- Consistent with how `InsightService` reads `response.answer`

**System prompt instructs the agent to**:
1. Retrieve accounts, categories, and recent transactions using data tools
2. Infer all transaction fields from the user's text
3. Match category to the user's existing list (omit `categoryId` when no category is a reasonable match)
4. Select account per FR-005 algorithm (currency match → category history → overall history → first account)
5. Call `createTransaction` with the resolved fields once ready
6. Output `{ "transaction": { "id": "<id from createTransaction result>" } }` as the final answer — no other text
7. If required fields (amount, account) cannot be resolved — explain why and do NOT call `createTransaction`

---

## Decision 4: Service Dependencies

**Decision**: `CreateTransactionFromTextService` constructor receives `AgentDataService`, `Agent`, and `TransactionService`.

```typescript
constructor(
  private agentDataService: AgentDataService,
  private agent: Agent,
  private transactionService: TransactionService,
)
```

**Rationale**:
- `AgentDataService` + `Agent` mirror the `InsightService` constructor — consistent pattern
- `TransactionService` is injected to be passed into the `createTransaction` tool and to fetch the `Transaction` by ID after the agent returns — enables mocking in tests
  - `TransactionService.createTransaction` is called inside the tool (not by the service directly); `TransactionService.getTransactionById` is called by the service after parsing `transaction.id` from `response.answer`
- This design satisfies the single-purpose service pattern: one public `call()` method that creates a transaction from text

---

## Decision 5: GraphQL Mutation Signature

**Decision**:
```graphql
createTransactionFromText(input: CreateTransactionFromTextInput!): Transaction!
```

**Input type**:
```graphql
input CreateTransactionFromTextInput {
  text: String!
}
```

**Return type**: Existing `Transaction` type (no new types needed)

**Rationale**:
- `createTransactionFromText` follows the existing naming convention for mutations (`create`, `update`, `archive` + entity name)
- Adding `FromText` suffix differentiates it from the standard `createTransaction` mutation without inventing new terminology
- Returns the full `Transaction` type — the frontend needs to prepend the created transaction to the list; returning the full `Transaction` (with embedded account and category, via existing `Transaction` type with DataLoader resolution) satisfies FR-010 without extra queries
- `text: String!` is the only input — intentionally minimal; all other fields are inferred by the backend

**Alternatives considered**:
- `createSmartTransaction` — rejected: "smart" is informal and does not describe the mechanism
- `createTransactionWithAI` — rejected: leaks implementation technology into the API contract
- Returning a custom `CreateTransactionFromTextResponse` wrapper — rejected: no error payload to wrap (errors surface as GraphQL errors); wrapping the result adds complexity without benefit

---

## Decision 6: Frontend Composable Name

**Decision**: `useCreateTransactionFromText`

**Rationale**:
- Mirrors the mutation name: `createTransactionFromText` → `useCreateTransactionFromText`
- Consistent with other mutation composables that use `use` + mutation name
- `useInsight` is the query counterpart; this is a mutation composable

---

## Decision 7: Context Registration Key

**Decision**: `createTransactionFromTextService` in `GraphQLContext`

**Rationale**:
- Matches the service class name camelCased, following the pattern set by `insightService`, `transactionService`, `accountService`
- Server.ts lazy-initialises the service on first request, same pattern as `insightService`

---

## Resolved Clarifications from Technical Context

All items in the Technical Context were known at plan time — no NEEDS CLARIFICATION items remained. This document records _decisions_ rather than resolving unknowns.

| Topic | Resolution |
|-------|-----------|
| Service name | `CreateTransactionFromTextService` |
| Agent is autonomous | Agent calls `createTransaction` tool to persist the transaction itself |
| Agent output format | Tool returns full transaction object; agent outputs `{ transaction: { id } }` as final answer; service parses `transaction.id`, fetches full `Transaction` by ID |
| Tool set | `getAccounts`, `getCategories`, `getTransactions` (data) + `createTransaction` (write) |
| Account resolution owner | Agent (uses data tools + reasoning per FR-005 algorithm) |
| Transaction creation owner | `createTransaction` tool inside the agent loop |
| Error on unresolvable fields | Agent omits `createTransaction` call; `response.answer` is plain text; `JSON.parse` fails or yields no `transaction.id`; service throws `BusinessError(response.answer)` |
| Math tools needed | No — no numeric aggregation required |
| New repositories needed | None — all data access via existing repos through `AgentDataService` and `TransactionService` |
