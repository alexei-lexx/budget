# Migrate User to a Rich Domain Model

## Context

`backend/src/models/user.ts` is an anemic model — a plain `User` interface with no behavior. `backend/src/ports/user-repository.ts` and `DynUserRepository` construct and mutate `User` objects directly (assigning `id`/timestamps, building partial DynamoDB update expressions from raw input).

`backend/src/models/account.ts` (`Account`) already follows the constitution's rich domain entity pattern: readonly properties, private constructor enforcing invariants, `create()`/`fromPersistence()` factories, business methods (`update()`, `archive()`, ...) returning new instances, and a matching `AccountRepository` port that only persists already-constructed entities.

This migrates `User` to the same pattern. Versioning (optimistic locking) is explicitly out of scope — `Account` has it, `User` does not need it.

Two decisions were made with the user before this design:

- **No soft-deletion.** `Account` has `isArchived`; `User` will not. There is no user-deletion feature today, so this is a documented exception to the constitution's soft-deletion rule, not an oversight.
- **Fix the layer violation this migration surfaces.** `graphql/resolvers/shared.ts` and `graphql/resolvers/user-resolvers.ts` currently call `context.userRepository` directly, bypassing `UserService` — a violation of the constitution's Resolver → Service → Repository rule. Making `User.create()` the single place that builds a new entity requires this find-or-create orchestration to live above the repository, so this migration moves it into `UserService` and updates both call sites to go through the service.

## Goal

`User` becomes a rich entity matching `Account`'s shape and conventions. `UserRepository` becomes a thin persistence port that only reads/writes already-constructed entities. `UserService` owns all entity construction and orchestration; the GraphQL layer never touches `userRepository` directly.

## Change

### `models/user.ts`

```ts
import { randomUUID } from "crypto";
import { validateEmail, normalizeEmail } from "../utils/email";
import { ModelError } from "./model-error";

export const MIN_TRANSACTION_PATTERNS_LIMIT = 1;
export const MAX_TRANSACTION_PATTERNS_LIMIT = 10;
export const DEFAULT_TRANSACTION_PATTERNS_LIMIT = 3;

// Plain data shape.
export interface UserData {
  id: string;
  email: string;
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * No isArchived: there is no user-deletion feature today, so soft-deletion
 * is an intentional exception to the constitution's soft-deletion rule.
 */
export class User implements UserData {
  readonly id: string;
  readonly email: string;
  readonly transactionPatternsLimit?: number;
  readonly voiceInputLanguage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  static create(
    input: CreateUserInput,
    { idGenerator = randomUUID }: { idGenerator?: () => string } = {},
  ): User {
    const now = new Date().toISOString();

    const data: UserData = {
      id: idGenerator(),
      email: normalizeEmail(input.email),
      createdAt: now,
      updatedAt: now,
    };

    return new User(data);
  }

  static fromPersistence(data: UserData): User {
    return new User(data);
  }

  toData(): UserData {
    return {
      id: this.id,
      email: this.email,
      transactionPatternsLimit: this.transactionPatternsLimit,
      voiceInputLanguage: this.voiceInputLanguage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  update(input: UpdateUserInput): User {
    const now = new Date().toISOString();

    const data: UserData = {
      ...this.toData(),
      transactionPatternsLimit:
        input.transactionPatternsLimit ?? this.transactionPatternsLimit,
      voiceInputLanguage: input.voiceInputLanguage ?? this.voiceInputLanguage,
      updatedAt: now,
    };

    return new User(data);
  }

  private constructor(data: UserData) {
    User.assertInvariants(data);

    this.id = data.id;
    this.email = data.email;
    this.transactionPatternsLimit = data.transactionPatternsLimit;
    this.voiceInputLanguage = data.voiceInputLanguage;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  private static assertInvariants(data: UserData): void {
    if (!validateEmail(data.email)) {
      throw new ModelError(`Invalid email address: ${data.email}`);
    }

    if (
      data.transactionPatternsLimit !== undefined &&
      (!Number.isInteger(data.transactionPatternsLimit) ||
        data.transactionPatternsLimit < MIN_TRANSACTION_PATTERNS_LIMIT ||
        data.transactionPatternsLimit > MAX_TRANSACTION_PATTERNS_LIMIT)
    ) {
      throw new ModelError(
        `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      );
    }
  }
}

export interface CreateUserInput {
  email: string;
}

export interface UpdateUserInput {
  transactionPatternsLimit?: number;
  voiceInputLanguage?: string;
}
```

`MIN/MAX/DEFAULT_TRANSACTION_PATTERNS_LIMIT` move here from `services/transaction-service.ts` (co-located with the entity that owns the constraint, matching `NAME_MIN_LENGTH`/`NAME_MAX_LENGTH` on `Account`). `transaction-service.ts` imports the three constants from `../models/user` instead of declaring them; its own `validateTransactionPatternsLimit` (a permissive clamp-to-default for an unrelated `limit` query parameter) is unchanged in behavior.

### `ports/user-repository.ts`

```ts
import { User } from "../models/user";

export interface UserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findMany(): Promise<User[]>;
  create(user: Readonly<User>): Promise<void>;
  update(user: Readonly<User>): Promise<void>;
}
```

`CreateUserInput`/`UpdateUserInput` are removed from this file (they now live in `models/user.ts` as inputs to `User.create()`/`.update()`). `ensureUser` is removed — that orchestration moves to `UserService`.

### `repositories/dyn-user-repository.ts`

- `findOneByEmail`, `findOneById`, `findMany`: unchanged except hydration returns `User.fromPersistence(this.hydrate(userSchema, item))`.
- `create(user: Readonly<User>): Promise<void>`: `PutCommand` with `user.toData()`, condition `attribute_not_exists(id)`. No longer builds `id`/timestamps.
- `update(user: Readonly<User>): Promise<void>`: `UpdateCommand` keyed on `id`, condition `attribute_exists(id)`. `transactionPatternsLimit`/`voiceInputLanguage` are optional, so the update expression conditionally `SET`s each when present on the entity and `REMOVE`s it when absent, same logic as today's dynamic builder but driven by the full entity rather than a partial input object.
- `ensureUser` is deleted.

### `repositories/schemas/user.ts`

Unchanged shape; retype as `satisfies z.ZodType<UserData>` instead of `User`.

### `services/user-service.ts`

```ts
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneByEmail(email);
  }

  async ensureUser(email: string): Promise<User> {
    const existing = await this.userRepository.findOneByEmail(email);
    if (existing) return existing;

    const user = User.create({ email });
    await this.userRepository.create(user);
    return user;
  }

  async getSettings(userId: string): Promise<Result<UserSettingsData>> {
    // unchanged
  }

  async updateSettings({
    userId,
    transactionPatternsLimit,
    voiceInputLanguage,
  }: {
    userId: string;
    transactionPatternsLimit?: number;
    voiceInputLanguage?: string;
  }): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      return Failure("User not found");
    }

    try {
      const updated = user.update({ transactionPatternsLimit, voiceInputLanguage });
      await this.userRepository.update(updated);

      return Success({
        transactionPatternsLimit:
          updated.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
        voiceInputLanguage: updated.voiceInputLanguage,
      });
    } catch (error) {
      if (error instanceof ModelError) {
        return Failure(error.message);
      }
      throw error;
    }
  }
}
```

`updateSettings` now reads the user first, then calls `user.update()` so bounds validation lives in the model (thrown as `ModelError`) instead of inline in the service — mirroring `AccountService.updateAccount`. The service still returns `Result`, so external behavior and error messages are unchanged; only the location of the check moves. The former inline range-check block and its bespoke error message are deleted from the service.

### GraphQL layer

- `graphql/resolvers/shared.ts`: `getAuthenticatedUser` calls `context.userService.findOneByEmail(...)` instead of `context.userRepository.findOneByEmail(...)`.
- `graphql/resolvers/user-resolvers.ts`: `ensureAuthenticatedUser` collapses to `context.userService.ensureUser(authUser.email)`, replacing its own find-then-create branching.

No changes to `graphql/context.ts` or `dependencies.ts` — `userService` is already wired into context; only `userRepository` becomes unreachable from the GraphQL layer.

### Test utilities

- `utils/test-utils/models/user-fakes.ts`: `fakeUser` rebuilt via `User.fromPersistence(...)`, matching `fakeAccount`.
- `utils/test-utils/repositories/user-repository-fakes.ts`: `fakeCreateUserInput` unchanged in shape; now feeds `User.create()` in model/service tests instead of the repository directly.
- `utils/test-utils/repositories/user-repository-mocks.ts`: drop `ensureUser` from the mock (removed from the port).
- No `user-service-mocks.ts` — nothing currently mocks `UserService`.

### Tests to rewrite

- `models/user.test.ts` (new): invariants — email format, transactionPatternsLimit bounds — mirroring `models/account.test.ts`.
- `repositories/dyn-user-repository.test.ts`: `create`/`update` tests pass constructed `User` entities; the `ensureUser` describe block is removed (moves to service tests).
- `services/user-service.test.ts`: add `findOneByEmail`/`ensureUser` coverage; `updateSettings` tests mock `findOneById` + `update` (two calls) instead of a single `update(id, input)` call; bounds-violation tests assert the same `Failure` messages as today.

## Non-goals

- No versioning/optimistic locking on `User`.
- No soft-deletion/`isArchived` on `User` — documented exception, no deletion feature exists.
- No change to the GraphQL schema (`type User` already only exposes `email`).
- No change to `transaction-service.ts`'s clamp-to-default behavior for its `limit` query parameter, beyond sourcing its bounds constants from `models/user.ts`.

## Risks

- `updateSettings` now issues a `findOneById` read before the `update` write, where today it goes straight to a keyed update. Same read-before-write shape as `AccountService.updateAccount`; negligible added cost for a settings mutation.
- The `DynUserRepository.update` expression changes from "set only provided fields" to "set present fields, remove absent fields" driven by the full entity. Needs care to preserve the "unset an optional field" case, if that's ever exercised (currently there's no way to unset `voiceInputLanguage`/`transactionPatternsLimit` from a set value — `User.update()`'s `??` fallback means a field, once set, is never nulled out by this API. This matches today's repository behavior, which also never removes a previously-set field.)
