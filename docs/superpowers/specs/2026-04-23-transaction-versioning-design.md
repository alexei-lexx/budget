# Transaction Versioning (OCC) — Design

## Problem

Transactions and transfers are mutated without conflict detection. Two failure modes exist today:

- **Lost update**: two concurrent `updateTransaction` calls on the same row resolve to last-write-wins. The earlier edit is accepted by the API and silently overwritten.
- **Transfer leg divergence**: `updateTransfer` touches two transaction rows. Concurrent updates can interleave so the two legs reflect different mutations. The transfer becomes structurally incoherent (amounts or dates disagree across legs).

Both are low-probability in single-user use but become severe once any balance-derived state is denormalized.

## Goal

Add optimistic concurrency control (OCC) on the Transaction row via a `version` attribute. Every mutation is conditional on the version being unchanged since read and bumps it atomically.

## Non-goals

- Version on Account. Account balance updates use atomic `ADD`; account edits that need old-value awareness use value-conditional checks.
- Per-field version or granular conflict resolution. Whole-row OCC is sufficient.
- Client-visible version token or ETag on the GraphQL API. OCC is internal.
- User-facing conflict resolution UI beyond a retry-prompting error.
- Automatic retry inside the backend. Conflicts surface to the user, who re-submits from the UI.

## Model

`Transaction` gains `version: number`.

- `createTransactionModel` sets `version: 0` on the new object.
- `updateTransactionModel` returns `{ ...transaction, version: transaction.version + 1, ... }` — same pattern as `updatedAt`.
- `archiveTransactionModel` returns `{ ...transaction, version: transaction.version + 1, isArchived: true, ... }`.
- The model is the single place that knows "bump = +1". Business logic (services, delta calculations, validation) never reads or writes `version`.

### Zod schemas

`transactionSchema` and `transactionDbItemSchema` add:

```ts
version: z.int().nonnegative();
```

Required. No fallback. Relies on migration-first deployment (see Migration).

## Repository

### New error class

`backend/src/ports/repository-error.ts`:

```ts
export class VersionConflictError extends RepositoryError {
  constructor(originalError?: unknown) {
    super("Transaction version conflict", "VERSION_CONFLICT", originalError);
    this.name = "VersionConflictError";
  }
}
```

### `create` / `createMany`

No logic change. `version: 0` comes from the model, persisted as-is. Existing `attribute_not_exists(id)` condition stays.

### `update`

`buildUpdateParams` changes:

- SET adds `version = :newVersion`.
- `ConditionExpression` becomes `attribute_exists(id) AND version = :expectedOld`.
- `:expectedOld = transaction.version - 1`, `:newVersion = transaction.version`.
- `UpdateCommand` call passes `ReturnValuesOnConditionCheckFailure: "ALL_OLD"`.

Catch block splits `ConditionalCheckFailedException`:

- Exception has `Item` present → row exists, version mismatch → `throw new VersionConflictError(error)`.
- Exception has no `Item` → row missing → current behavior: `throw new RepositoryError("Transaction not found", "NOT_FOUND", error)`.

The primary key (`userId`, `id`) always locates the row. The condition is a gate on that already-located row, so `Item` in the exception unambiguously means "row present, condition failed on version".

### `updateMany` (transfer path)

Both legs go in one `TransactWriteCommand`. Each `Update` op:

- Uses the same `buildUpdateParams` shape (version condition + SET bump).
- Passes `ReturnValuesOnConditionCheckFailure: "ALL_OLD"`.

On `TransactionCanceledException`, walk `CancellationReasons`:

- Any reason with `Code === "ConditionalCheckFailed"` and `Item` present → `throw new VersionConflictError`.
- Any with `Code === "ConditionalCheckFailed"` and `Item` absent → `throw new RepositoryError("NOT_FOUND")`.
- Prefer conflict over not-found when both appear.

No signature changes to `update` or `updateMany`.

## Services

Four mutating methods now need conflict mapping:

- `TransactionServiceImpl.updateTransaction`
- `TransactionServiceImpl.deleteTransaction`
- `TransferService.updateTransfer`
- `TransferService.deleteTransfer`

### Shared helper

`backend/src/services/with-conflict-mapping.ts`:

```ts
export async function runWithConflictMapping<T>(
  op: () => Promise<T>,
): Promise<T> {
  try {
    return await op();
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw new BusinessError(
        "Transaction was modified, please reload and try again",
      );
    }
    throw error;
  }
}
```

### Call sites

```ts
await runWithConflictMapping(() => this.transactionRepository.update(updated));
```

`BusinessError` reaches the resolver's `handleResolverError`, which surfaces the message to the client. Snackbar shows the message. User reloads and re-submits.

Create paths (`createTransaction`, `createTransfer`) are unchanged — new rows cannot conflict.

## Migration

File: `backend/src/migrations/YYYYMMDDHHMMSS-add-transaction-version.ts` (timestamp generated at write time).

Mirrors the existing pattern (`20260119201355-add-exclude-from-reports.ts`):

```ts
export async function up(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.TRANSACTIONS_TABLE_NAME;
  if (!tableName) {
    throw new Error("TRANSACTIONS_TABLE_NAME environment variable not set");
  }
  const docClient = DynamoDBDocumentClient.from(client);
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );
    for (const item of scanResult.Items ?? []) {
      try {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { userId: item.userId, id: item.id },
            UpdateExpression: "SET version = :zero",
            ConditionExpression: "attribute_not_exists(version)",
            ExpressionAttributeValues: { ":zero": 0 },
          }),
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConditionalCheckFailedException"
        ) {
          continue;
        }
        throw error;
      }
    }
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
}
```

- Idempotent via `attribute_not_exists(version)` guard.
- Runs via the existing Lambda migration pipeline before the new code is live.
- Because deployment is migration-first, the strict zod schema never sees unmigrated rows.

## Tests

Written per the jest-tests skill conventions (no "should" prefix; `describe` blocks mirror source method order).

### Model (`transaction.test.ts`)

- `createTransactionModel` sets `version: 0`.
- `updateTransactionModel` increments version by 1.
- `archiveTransactionModel` increments version by 1.

### Repository (`dyn-transaction-repository.test.ts`)

- `create` persists `version: 0`.
- `update` on matching version bumps stored version.
- `update` with stale version throws `VersionConflictError` (simulate: insert row, then attempt update with version - 1 stale).
- `update` on missing row throws `RepositoryError("NOT_FOUND")`.
- `updateMany` with one leg stale throws `VersionConflictError`; neither row is written (atomicity).

### Services (`transaction-service.test.ts`, `transfer-service.test.ts`)

- Mocked repo throws `VersionConflictError` → method throws `BusinessError` with the conflict message.
- Mocked repo throws `RepositoryError("NOT_FOUND")` → existing not-found behavior preserved.

### Helper (`with-conflict-mapping.test.ts`)

- `VersionConflictError` in → `BusinessError` out with the exact message.
- Any other error passes through unchanged.

## Risk and mitigation

- **Risk**: a mutation path forgets the version condition → silent lost-update returns.
  **Mitigation**: version handling is centralized in `buildUpdateParams`; every `update` / `updateMany` call path uses it. No per-call version plumbing in service code.

- **Risk**: deploy ordering mistake ships code before migration runs → strict schema rejects pre-migration rows.
  **Mitigation**: existing migration pipeline runs to completion before Lambda swap. If the pipeline fails, deploy aborts.

## Relationship to account balance denormalization

- This work has independent value: closes lost-update and transfer-leg-divergence bugs that exist today.
- It is not a prerequisite for anything currently shipping.
- It becomes essential once balance denormalization lands, because without OCC the same races cause silent balance drift.
