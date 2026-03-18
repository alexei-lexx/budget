## Context

AI-powered operations (`insight` query, `createTransactionFromText` mutation) run an agent that collects a full execution trace. On success, the trace is returned alongside the primary result and the frontend enables the agent trace button. On failure, the resolver throws a `GraphQLError`, discarding the trace entirely — the button stays permanently disabled.

The fix requires threading the trace through the failure path at every layer:

```
agent.call() ──→ agentTrace collected
                      │
               [post-agent failure]
                      │
Service  ─── Failure({ message, agentTrace })   ← currently drops agentTrace
                      │
Resolver ─── return InsightFailure { message, agentTrace }  ← currently throws
                      │
Frontend ─── read agentTrace from response data  ← currently reads from error
```

Two GraphQL operations are affected: `insight` (query) and `createTransactionFromText` (mutation). Both follow the same pattern.

## Goals / Non-Goals

**Goals:**

- Agent trace button becomes enabled after a failed AI response
- `agentTrace` is always present in the API response, regardless of success or failure
- Error path is fully typed end-to-end (schema → codegen → composables)
- Pre-agent failures (validation, auth) return an empty trace — no button enable

**Non-Goals:**

- Changes to the trace panel UI
- Changes to how `AgentTraceMessage` types are structured
- Handling infrastructure errors (database, network) — these remain thrown exceptions
- Changing error display UX (snackbars vs. inline) on the frontend

## Decisions

### Decision 1: GraphQL union types over error extensions

**Chosen**: Replace `InsightResponse` / `CreateTransactionFromTextResponse` with typed union types — `InsightOutput = InsightSuccess | InsightFailure`, same for `CreateTransactionFromTextOutput`.

**Alternative considered**: Attach `agentTrace` to `GraphQLError.extensions`. The resolver would still throw on failure, and the frontend would read from `error.graphQLErrors[0].extensions.agentTrace`.

**Why unions win**:

- Extensions are `Record<string, unknown>` — no type safety, no codegen coverage
- Reading from `error.extensions` on the frontend is inconsistent with reading from `result.data` on success — two different paths for the same field
- Union types mirror the existing `Result<T, E>` pattern used in the service layer
- Constitution requires schema-driven development; the schema should reflect all observable outcomes, not hide them in the error protocol

Both `InsightSuccess` and `InsightFailure` carry `agentTrace: [AgentTraceMessage!]!`. The resolver no longer throws for domain failures.

### Decision 2: Typed service error interface with `message` + `agentTrace`

**Chosen**: Each agent service defines its own error interface:

```typescript
interface InsightServiceError {
  message: string;
  agentTrace: AgentTraceMessage[];
}

type InsightOutput = Result<InsightSuccessData, InsightServiceError>;
```

`message` is used (not `error`) to avoid the `result.error.error` double-nesting.

**Alternative considered**: Extend the generic `Result<T, E>` type to carry optional metadata on the failure branch. Rejected — it would pollute a generic type with agent-specific concerns.

Pre-agent `Failure` calls (validation, auth) pass `agentTrace: []`. Post-agent `Failure` calls pass the collected trace.

### Decision 3: Resolver returns data, never throws for domain failures

Resolvers currently use the pattern `if (!result.success) throw new GraphQLError(result.error)`. With union types, they instead return a typed object:

```typescript
if (!result.success) {
  return {
    __typename: "InsightFailure",
    message: result.error.message,
    agentTrace: result.error.agentTrace,
  };
}
return { __typename: "InsightSuccess", ...result.data };
```

A `__resolveType` resolver is required to discriminate the union:

```typescript
InsightOutput: {
  __resolveType: (obj) => obj.__typename,
}
```

Infrastructure exceptions (database, network) remain unhandled and propagate as-is — only domain failures are represented in the union.

### Decision 4: Frontend reads agentTrace from response data

With union types, the frontend query uses inline fragments:

```graphql
... on InsightSuccess { answer agentTrace { ... } }
... on InsightFailure { message agentTrace { ... } }
```

Both branches expose `agentTrace` at the same path in the response data. The composable no longer needs a `catch` block to access the trace — it reads `insightResult.value?.insight?.agentTrace` regardless of outcome.

## Risks / Trade-offs

**Breaking schema change** → Clients depending on `InsightResponse` or `CreateTransactionFromTextResponse` by name will break. Mitigation: rename and re-run codegen in both backend and frontend as part of the same change; no external consumers.

**`__resolveType` must be registered** → Forgetting to add the union resolver causes a runtime error when Apollo tries to resolve the union type. Mitigation: add it explicitly to the resolvers index as part of this change.

**Pre-agent failures return empty trace** → The button stays disabled for validation failures, which is correct behavior. No risk, but worth documenting to avoid confusion in tests.

## Migration Plan

1. Update `backend/src/graphql/schema.graphql` — rename types, introduce unions
2. Run `npm run codegen` in backend
3. Update service error types and `Failure` calls in both services
4. Update resolvers to return union data and register `__resolveType`
5. Run `npm run codegen:sync-schema` then `npm run codegen` in frontend
6. Update GraphQL query/mutation documents to use inline fragments
7. Update composables to read `agentTrace` from response data
8. Run full validation pipeline (tests → typecheck → lint) in both packages

No database changes. No migration files required. Rollback: revert schema and re-run codegen.

## Open Questions

_(none — all decisions settled during exploration)_

## Constitution Compliance

- **Schema-Driven Development**: Change begins with schema modification; codegen runs before any service or frontend changes ✓
- **Backend Layer Structure**: Resolvers transform request/response only; no business logic added; services remain the domain decision point ✓
- **Backend Service Result Pattern**: `Result<T, E>` pattern preserved; error type parameterized, not bypassed ✓
- **Backend GraphQL Layer**: Schema reflects user-facing outcomes; union types surface domain results without leaking implementation details ✓
- **TypeScript Code Generation**: Full codegen coverage maintained; no `as any` or non-null assertions needed ✓
