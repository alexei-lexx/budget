## Context

`createCreateTransactionTool` is a factory function that returns a `ToolSignature` — the object the AI agent calls to persist a transaction. It is instantiated once per `CreateTransactionFromTextService.call()` invocation, so each HTTP request gets a fresh tool instance. The agent has no built-in constraint on how many times it may invoke any given tool.

## Goals / Non-Goals

**Goals:**

- Prevent the agent from persisting more than one transaction per request
- Allow retries when a creation attempt throws (network error, validation failure, etc.)
- Keep the change confined to the tool factory and its call site

**Non-Goals:**

- Rate-limiting across multiple requests or users
- Modifying the agent runner or other tools
- Frontend changes

## Decisions

### Closure counter inside the factory

The factory becomes:

```typescript
export const createCreateTransactionTool = (
  transactionService: TransactionService,
  userId: string,
  maxCreations: number,
): ToolSignature<CreateTransactionToolInput>
```

Inside `func`, a `let successfulCreations = 0` variable (closed over) is incremented only after a successful `createTransaction` call. If `successfulCreations >= maxCreations` at the start of an invocation the function returns an error string without calling the service.

The parameter is required (no default) — callers must make an explicit, intentional choice rather than relying on an implicit safe default.

**Why closure over alternatives:**

- _Middleware / wrapper_: More indirection with no gain for a single-function guard.
- _Agent-level instruction_: Already tried (system prompt says "create only one") — not reliably enforced.
- _Service-level deduplication_: Would require request-scoped state plumbed through the service layer — far more invasive and the wrong layer for an agent policy.

The closure is the smallest, most self-contained solution. Because each request creates a new tool instance the counter is naturally request-scoped.

### Error returned as a string, not thrown

`ToolSignature.func` returns `Promise<string>`. Returning an error message (e.g. `"Error: transaction creation limit reached"`) is the idiomatic way to signal a tool failure to the agent without crashing the runner. The agent will see the message, understand it cannot create another transaction, and stop.

## Risks / Trade-offs

- **Tool reuse across requests** → If `createCreateTransactionTool` were ever called once and the resulting tool reused across multiple requests, the counter would carry over. Mitigation: the current call site already constructs a new instance per request; document this invariant.
- **maxCreations > 1** → The parameter is intentionally generic, but no caller currently needs a value other than `1`. Making it required ensures every call site is explicit about the limit.

## Migration Plan

No data migration required. The change is purely additive (a new optional parameter with a default). Existing call sites that do not pass `maxCreations` continue to work with the stricter default of `1`.
