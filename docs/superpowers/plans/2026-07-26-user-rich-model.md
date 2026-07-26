# User Rich Domain Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `User` from an anemic interface to a rich domain entity matching `Account`'s conventions, and route the GraphQL layer through `UserService` instead of calling `UserRepository` directly.

**Architecture:** `User` becomes a class with a private constructor, `create()`/`fromPersistence()` factories, and an `update()` method that enforces invariants and returns a new instance — identical shape to `models/account.ts`. `UserRepository` becomes a thin persistence port (`create`/`update` take a constructed `User`, no more building entities inside the repository). `UserService` gains `findOneByEmail` and `ensureUser`, absorbing orchestration that today lives in `DynUserRepository.ensureUser` and inline in the GraphQL resolvers.

**Tech Stack:** TypeScript, Vitest, Zod, AWS SDK v3 (`@aws-sdk/lib-dynamodb`), DynamoDB Local.

## Global Constraints

- No versioning (`version`/optimistic locking) on `User` — explicit non-goal per the spec.
- No soft-deletion (`isArchived`) on `User` — documented exception in the class comment; there is no user-deletion feature today.
- Domain entities: readonly properties, private constructor validates invariants, `create()`/`fromPersistence()` static factories, business methods return new instances, invariant violations throw `ModelError` (`docs/constitution.md` → Backend Domain Entities).
- Repositories only perform data access; entity construction happens in the model/service layers, never the repository (`docs/constitution.md` → Backend Layer Structure).
- GraphQL layer must call services, never repositories directly (`docs/constitution.md` → Backend Layer Structure, Authentication & Authorization).
- Test files co-located next to source, named `[source-file].test.ts`; repository tests use a real DB connection, service tests use mocked repositories (`docs/constitution.md` → Test Strategy).
- After each task: run the changed test file, then the full backend suite (`npm test` from `backend/`), then `npm run typecheck` — fix before moving on (`docs/constitution.md` → Code Quality Validation).

---

## File Map

| File | Change |
|---|---|
| `backend/src/models/user.ts` | Rewrite: anemic interface → rich `User` class |
| `backend/src/models/user.test.ts` | New |
| `backend/src/utils/test-utils/models/user-fakes.ts` | Rewrite: `fakeUser` via `fromPersistence`; add `fakeCreateUserInput` |
| `backend/src/utils/test-utils/repositories/user-repository-fakes.ts` | Delete (superseded by the file above) |
| `backend/src/ports/user-repository.ts` | Rewrite: drop `ensureUser`, `CreateUserInput`, `UpdateUserInput`; `create`/`update` take a `User` |
| `backend/src/repositories/schemas/user.ts` | Retype against `UserData` instead of `User` |
| `backend/src/repositories/dyn-user-repository.ts` | Rewrite: no entity construction, no `ensureUser` |
| `backend/src/repositories/dyn-user-repository.test.ts` | Rewrite to match |
| `backend/src/utils/test-utils/repositories/user-repository-mocks.ts` | Drop `ensureUser` mock |
| `backend/src/services/user-service.ts` | Add `findOneByEmail`, `ensureUser`; `updateSettings` delegates bounds-checking to `User.update()` |
| `backend/src/services/user-service.test.ts` | Rewrite to match |
| `backend/src/services/transaction-service.ts` | Import the three limit constants from `models/user` instead of declaring them |
| `backend/src/services/transaction-service.test.ts` | Update import source for the three constants |
| `backend/src/graphql/resolvers/shared.ts` | `getAuthenticatedUser` calls `context.userService.findOneByEmail` |
| `backend/src/graphql/resolvers/user-resolvers.ts` | `ensureAuthenticatedUser` calls `context.userService.ensureUser` |

---

### Task 1: Rich `User` domain model

**Files:**
- Modify: `backend/src/models/user.ts`
- Modify: `backend/src/utils/test-utils/models/user-fakes.ts`
- Test: `backend/src/models/user.test.ts`

**Interfaces:**
- Produces: `User` class — `static create(input: CreateUserInput, options?: { idGenerator?: () => string }): User`, `static fromPersistence(data: UserData): User`, `toData(): UserData`, `update(input: UpdateUserInput): User`, readonly `id`, `email`, `transactionPatternsLimit?`, `voiceInputLanguage?`, `createdAt`, `updatedAt`.
- Produces: `UserData`, `CreateUserInput { email: string }`, `UpdateUserInput { transactionPatternsLimit?: number; voiceInputLanguage?: string }`.
- Produces: `MIN_TRANSACTION_PATTERNS_LIMIT = 1`, `MAX_TRANSACTION_PATTERNS_LIMIT = 10`, `DEFAULT_TRANSACTION_PATTERNS_LIMIT = 3`.
- Produces: `fakeUser(overrides?: Partial<UserData>): User`, `fakeCreateUserInput(overrides?: Partial<CreateUserInput>): CreateUserInput` (test-utils).
- Consumes: `ModelError` from `./model-error`; `normalizeEmail`, `validateEmail` from `../utils/email`.

- [ ] **Step 1: Write the model test file**

Create `backend/src/models/user.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fakeCreateUserInput,
  fakeUser,
} from "../utils/test-utils/models/user-fakes";
import { ModelError } from "./model-error";
import {
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  User,
} from "./user";

describe("User", () => {
  describe("create", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("builds user with all fields populated", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "user@example.com" }),
        { idGenerator: () => "fixed-uuid" },
      );

      // Assert
      expect(result.toData()).toEqual({
        id: "fixed-uuid",
        email: "user@example.com",
        transactionPatternsLimit: undefined,
        voiceInputLanguage: undefined,
        createdAt: "2000-01-02T10:11:12.000Z",
        updatedAt: "2000-01-02T10:11:12.000Z",
      });
    });

    it("normalizes email to lowercase", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "Test.Email@EXAMPLE.COM" }),
      );

      // Assert
      expect(result.email).toBe("test.email@example.com");
    });

    it("trims whitespace from email", () => {
      // Act
      const result = User.create(
        fakeCreateUserInput({ email: "  user@example.com  " }),
      );

      // Assert
      expect(result.email).toBe("user@example.com");
    });

    it("uses default id generator when options omitted", () => {
      // Act
      const result = User.create(fakeCreateUserInput());

      // Assert
      expect(result.id).toBeDefined();
    });

    // Validation failures

    it("throws on empty email", () => {
      // Act & Assert
      expect(() => User.create(fakeCreateUserInput({ email: "" }))).toThrow(
        ModelError,
      );
    });

    it("throws on malformed email", () => {
      // Act & Assert
      expect(() =>
        User.create(fakeCreateUserInput({ email: "not-an-email" })),
      ).toThrow(ModelError);
    });
  });

  describe("fromPersistence", () => {
    // Happy path

    it("reconstructs instance from data", () => {
      // Arrange
      const data = fakeUser().toData();

      // Act
      const result = User.fromPersistence(data);

      // Assert
      expect(result.toData()).toEqual(data);
    });

    // Validation failures

    it("throws on malformed email", () => {
      // Arrange
      const data = { ...fakeUser().toData(), email: "not-an-email" };

      // Act & Assert
      expect(() => User.fromPersistence(data)).toThrow(ModelError);
    });

    it("throws when transactionPatternsLimit is out of range", () => {
      // Arrange
      const data = {
        ...fakeUser().toData(),
        transactionPatternsLimit: MAX_TRANSACTION_PATTERNS_LIMIT + 1,
      };

      // Act & Assert
      expect(() => User.fromPersistence(data)).toThrow(ModelError);
    });
  });

  describe("toData", () => {
    // Happy path

    it("returns plain object with all data fields", () => {
      // Arrange
      const data = fakeUser().toData();
      const user = User.fromPersistence(data);

      // Act & Assert
      expect(user.toData()).toEqual(data);
    });
  });

  describe("update", () => {
    beforeEach(() => {
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:11:12.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Happy path

    it("sets transactionPatternsLimit", () => {
      // Arrange
      const existing = fakeUser({ transactionPatternsLimit: 3 });

      // Act
      const result = existing.update({ transactionPatternsLimit: 7 });

      // Assert
      expect(result.transactionPatternsLimit).toBe(7);
    });

    it("sets voiceInputLanguage", () => {
      // Arrange
      const existing = fakeUser({ voiceInputLanguage: "en-US" });

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.voiceInputLanguage).toBe("de-DE");
    });

    it("keeps fields when input is empty", () => {
      // Arrange
      const existing = fakeUser({
        transactionPatternsLimit: 5,
        voiceInputLanguage: "pl-PL",
      });

      // Act
      const result = existing.update({});

      // Assert
      expect(result.transactionPatternsLimit).toBe(5);
      expect(result.voiceInputLanguage).toBe("pl-PL");
    });

    it("preserves id, email, createdAt", () => {
      // Arrange
      const existing = fakeUser({
        id: "id-1",
        email: "user@example.com",
        createdAt: "1999-01-01T00:00:00.000Z",
      });

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.id).toBe("id-1");
      expect(result.email).toBe("user@example.com");
      expect(result.createdAt).toBe("1999-01-01T00:00:00.000Z");
    });

    it("sets updatedAt", () => {
      // Arrange
      const existing = fakeUser();

      // Act
      const result = existing.update({ voiceInputLanguage: "de-DE" });

      // Assert
      expect(result.updatedAt).toBe("2000-01-02T10:11:12.000Z");
    });

    // Validation failures

    it("throws when transactionPatternsLimit is below minimum", () => {
      // Act & Assert
      expect(() =>
        fakeUser().update({
          transactionPatternsLimit: MIN_TRANSACTION_PATTERNS_LIMIT - 1,
        }),
      ).toThrow(ModelError);
    });

    it("throws when transactionPatternsLimit is above maximum", () => {
      // Act & Assert
      expect(() =>
        fakeUser().update({
          transactionPatternsLimit: MAX_TRANSACTION_PATTERNS_LIMIT + 1,
        }),
      ).toThrow(ModelError);
    });

    it("throws when transactionPatternsLimit is not an integer", () => {
      // Act & Assert
      expect(() =>
        fakeUser().update({ transactionPatternsLimit: 2.5 }),
      ).toThrow(ModelError);
    });
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npm test -- src/models/user.test.ts` (from `backend/`)
Expected: FAIL — `User.create`/`fromPersistence`/`update` don't exist yet, and `fakeUser`/`fakeCreateUserInput` don't match the new signatures.

- [ ] **Step 3: Rewrite `backend/src/models/user.ts`**

```ts
import { randomUUID } from "crypto";
import { normalizeEmail, validateEmail } from "../utils/email";
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

- [ ] **Step 4: Rewrite `backend/src/utils/test-utils/models/user-fakes.ts`**

```ts
import { faker } from "@faker-js/faker";
import { CreateUserInput, User, UserData } from "../../../models/user";

export const fakeUser = (overrides: Partial<UserData> = {}): User => {
  const now = new Date().toISOString();
  return User.fromPersistence({
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};

export const fakeCreateUserInput = (
  overrides: Partial<CreateUserInput> = {},
): CreateUserInput => {
  return {
    email: faker.internet.email().toLowerCase(),
    ...overrides,
  };
};
```

- [ ] **Step 5: Delete the superseded fixture file**

```bash
rm backend/src/utils/test-utils/repositories/user-repository-fakes.ts
```

(`fakeCreateUserInput` now lives in `user-fakes.ts`, matching `fakeCreateAccountInput`'s location in `account-fakes.ts`. Its only consumer, `dyn-user-repository.test.ts`, is rewritten in Task 2.)

- [ ] **Step 6: Run the test file to verify it passes**

Run: `npm test -- src/models/user.test.ts` (from `backend/`)
Expected: PASS, all cases green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/user.ts backend/src/models/user.test.ts backend/src/utils/test-utils/models/user-fakes.ts
git rm backend/src/utils/test-utils/repositories/user-repository-fakes.ts
git commit -m "migrate User to rich domain model"
```

---

### Task 2: `UserRepository` port and `DynUserRepository` adapter

**Files:**
- Modify: `backend/src/ports/user-repository.ts`
- Modify: `backend/src/repositories/schemas/user.ts`
- Modify: `backend/src/repositories/dyn-user-repository.ts`
- Modify: `backend/src/utils/test-utils/repositories/user-repository-mocks.ts`
- Test: `backend/src/repositories/dyn-user-repository.test.ts`

**Interfaces:**
- Consumes: `User`, `UserData` from `../models/user` (Task 1).
- Produces: `UserRepository { findOneByEmail, findOneById, findMany, create(user: Readonly<User>): Promise<void>, update(user: Readonly<User>): Promise<void> }`.
- Produces: `createMockUserRepository(): Mocked<UserRepository>` (test-utils), used by Task 3.

- [ ] **Step 1: Rewrite the repository test file**

Replace `backend/src/repositories/dyn-user-repository.test.ts` in full:

```ts
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../models/user";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { requireEnv } from "../utils/require-env";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import {
  fakeCreateUserInput,
  fakeUser,
} from "../utils/test-utils/models/user-fakes";
import { DynUserRepository } from "./dyn-user-repository";

describe("DynUserRepository", () => {
  let repository: DynUserRepository;

  const tableName = requireEnv("USERS_TABLE_NAME");
  const client = createDynamoDBDocumentClient();

  beforeAll(async () => {
    repository = new DynUserRepository(tableName, client);
  });

  beforeEach(async () => {
    await truncateTable(client, tableName, {
      partitionKey: "id",
    });
  });

  describe("findOneByEmail", () => {
    // Happy path

    it("returns user by exact email match", async () => {
      // Arrange
      const user = User.create(
        fakeCreateUserInput({ email: "user@example.com" }),
      );
      await repository.create(user);

      // Act
      const result = await repository.findOneByEmail("user@example.com");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("returns matching user when multiple users exist", async () => {
      // Arrange
      const target = User.create(
        fakeCreateUserInput({ email: "user1@example.com" }),
      );
      await repository.create(target);
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user2@example.com" })),
      );
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user3@example.com" })),
      );

      // Act
      const result = await repository.findOneByEmail("user1@example.com");

      // Assert
      expect(result?.id).toBe(target.id);
      expect(result?.email).toBe("user1@example.com");
    });

    it("matches email case-insensitively", async () => {
      // Arrange
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user@example.com" })),
      );

      // Act
      const result = await repository.findOneByEmail("USER@EXAMPLE.COM");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("trims whitespace from email", async () => {
      // Arrange
      await repository.create(
        User.create(fakeCreateUserInput({ email: "user@example.com" })),
      );

      // Act
      const result = await repository.findOneByEmail("  user@example.com  ");

      // Assert
      expect(result?.email).toBe("user@example.com");
    });

    it("returns null when email not found", async () => {
      // Act
      const result = await repository.findOneByEmail("nonexistent@example.com");

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when email is whitespace-only", async () => {
      // Act & Assert
      await expect(repository.findOneByEmail("   ")).rejects.toThrow(
        "Failed to find user by email",
      );
    });

    // Dependency failures

    it("throws when multiple users share same email", async () => {
      // Arrange
      await repository.create(
        User.create(fakeCreateUserInput({ email: "dupe@example.com" })),
      );
      await repository.create(
        User.create(fakeCreateUserInput({ email: "dupe@example.com" })),
      );

      // Act & Assert
      await expect(
        repository.findOneByEmail("dupe@example.com"),
      ).rejects.toThrow(
        "Data integrity error: Multiple users found for email dupe@example.com",
      );
    });
  });

  describe("findOneById", () => {
    // Happy path

    it("returns user by id", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Act
      const result = await repository.findOneById(user.id);

      // Assert
      expect(result?.toData()).toEqual(user.toData());
    });

    it("returns null when id not found", async () => {
      // Act
      const result = await repository.findOneById("nonexistent-id");

      // Assert
      expect(result).toBeNull();
    });

    // Validation failures

    it("throws when id is empty", async () => {
      // Act & Assert
      await expect(repository.findOneById("")).rejects.toMatchObject({
        message: "User ID is required",
        code: "INVALID_PARAMETERS",
      });
    });
  });

  describe("findMany", () => {
    // Happy path

    it("returns empty array when no users exist", async () => {
      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toEqual([]);
    });

    it("returns all created users", async () => {
      // Arrange
      const users = [
        User.create(fakeCreateUserInput()),
        User.create(fakeCreateUserInput()),
        User.create(fakeCreateUserInput()),
      ];
      await Promise.all(users.map((user) => repository.create(user)));

      // Act
      const result = await repository.findMany();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map((user) => user.id).sort()).toEqual(
        users.map((user) => user.id).sort(),
      );
    });
  });

  describe("create", () => {
    // Happy path

    it("persists user", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());

      // Act
      const result = await repository.create(user);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(result).toBeUndefined();
      expect(stored?.toData()).toEqual(user.toData());
    });

    // Dependency failures

    it("rejects duplicate id", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Act & Assert
      await expect(repository.create(user)).rejects.toThrow(
        "Failed to create user",
      );
    });
  });

  describe("update", () => {
    // Happy path

    it("updates voice input language", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({ voiceInputLanguage: "pl-PL" });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.voiceInputLanguage).toBe("pl-PL");
      expect(stored?.id).toBe(user.id);
      expect(stored?.email).toBe(user.email);
    });

    it("updates transaction patterns limit", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({ transactionPatternsLimit: 5 });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.transactionPatternsLimit).toBe(5);
    });

    it("updates multiple fields in one call", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);
      const updated = user.update({
        voiceInputLanguage: "de-DE",
        transactionPatternsLimit: 7,
      });

      // Act
      await repository.update(updated);
      const stored = await repository.findOneById(user.id);

      // Assert
      expect(stored?.voiceInputLanguage).toBe("de-DE");
      expect(stored?.transactionPatternsLimit).toBe(7);
    });

    // Dependency failures

    it("throws when user not found", async () => {
      // Arrange
      const user = fakeUser();

      // Act & Assert
      await expect(repository.update(user)).rejects.toMatchObject({
        message: "User not found",
        code: "NOT_FOUND",
      });
    });
  });

  describe("hydration - data corruption detection", () => {
    it("throws when stored record is missing required field", async () => {
      // Arrange
      const user = User.create(fakeCreateUserInput());
      await repository.create(user);

      // Corrupt record by removing createdAt to trigger hydration failure
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { id: user.id },
          UpdateExpression: "REMOVE createdAt",
        }),
      );

      // Act & Assert
      await expect(repository.findMany()).rejects.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npm test -- src/repositories/dyn-user-repository.test.ts` (from `backend/`)
Expected: FAIL — `repository.create`/`repository.update` still have the old signatures, `ensureUser` calls no longer exist in this file so those specific compile errors won't appear, but type errors on `create`/`update` call signatures will.

- [ ] **Step 3: Rewrite `backend/src/ports/user-repository.ts`**

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

- [ ] **Step 4: Retype `backend/src/repositories/schemas/user.ts`**

```ts
import { z } from "zod";
import type { UserData } from "../../models/user";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email().lowercase(),
  transactionPatternsLimit: z.number().optional(),
  voiceInputLanguage: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<UserData>;
```

- [ ] **Step 5: Rewrite `backend/src/repositories/dyn-user-repository.ts`**

```ts
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { User } from "../models/user";
import { RepositoryError } from "../ports/repository-error";
import { UserRepository } from "../ports/user-repository";
import { normalizeEmail } from "../utils/email";
import { DynBaseRepository } from "./dyn-base-repository";
import { userSchema } from "./schemas/user";

export class DynUserRepository
  extends DynBaseRepository
  implements UserRepository
{
  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const normalizedEmail = normalizeEmail(email);

      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": normalizedEmail,
        },
      });

      const result = await this.client.send(command);

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      if (result.Items.length > 1) {
        throw new RepositoryError(
          `Data integrity error: Multiple users found for email ${normalizedEmail}`,
          "QUERY_FAILED",
        );
      }

      return User.fromPersistence(this.hydrate(userSchema, result.Items[0]));
    } catch (error) {
      console.error("Error finding user by email:", error);
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        "Failed to find user by email",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async findOneById(id: string): Promise<User | null> {
    if (!id) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: { id },
      });

      const result = await this.client.send(command);

      if (!result.Item) {
        return null;
      }

      return User.fromPersistence(this.hydrate(userSchema, result.Item));
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw new RepositoryError(
        "Failed to find user by ID",
        "GET_FAILED",
        error,
      );
    }
  }

  async findMany(): Promise<User[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await this.client.send(command);

      if (!result.Items) {
        return [];
      }

      return result.Items.map((item) =>
        User.fromPersistence(this.hydrate(userSchema, item)),
      );
    } catch (error) {
      console.error("Error finding all users:", error);
      throw new RepositoryError("Failed to find users", "QUERY_FAILED", error);
    }
  }

  async create(user: Readonly<User>): Promise<void> {
    const data = user.toData();

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: data,
        ConditionExpression: "attribute_not_exists(id)",
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new RepositoryError(
        "Failed to create user",
        "CREATE_FAILED",
        error,
      );
    }
  }

  async update(user: Readonly<User>): Promise<void> {
    const setParts = ["updatedAt = :updatedAt"];
    const removeParts: string[] = [];
    const expressionAttributeValues: Record<string, string | number> = {
      ":updatedAt": user.updatedAt,
    };

    if (user.transactionPatternsLimit !== undefined) {
      setParts.push("transactionPatternsLimit = :transactionPatternsLimit");
      expressionAttributeValues[":transactionPatternsLimit"] =
        user.transactionPatternsLimit;
    } else {
      removeParts.push("transactionPatternsLimit");
    }

    if (user.voiceInputLanguage !== undefined) {
      setParts.push("voiceInputLanguage = :voiceInputLanguage");
      expressionAttributeValues[":voiceInputLanguage"] =
        user.voiceInputLanguage;
    } else {
      removeParts.push("voiceInputLanguage");
    }

    const updateExpression = [
      `SET ${setParts.join(", ")}`,
      removeParts.length > 0 ? `REMOVE ${removeParts.join(", ")}` : undefined,
    ]
      .filter((part): part is string => part !== undefined)
      .join(" ");

    try {
      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: { id: user.id },
        UpdateExpression: updateExpression,
        ConditionExpression: "attribute_exists(id)",
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.client.send(command);
    } catch (error) {
      console.error("Error updating user:", error);

      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new RepositoryError("User not found", "NOT_FOUND");
      }

      throw new RepositoryError(
        "Failed to update user",
        "UPDATE_FAILED",
        error,
      );
    }
  }
}
```

- [ ] **Step 6: Update `backend/src/utils/test-utils/repositories/user-repository-mocks.ts`**

```ts
import { type Mocked, vi } from "vitest";
import { UserRepository } from "../../../ports/user-repository";

export const createMockUserRepository = (): Mocked<UserRepository> => ({
  findOneByEmail: vi.fn(),
  findOneById: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
});
```

- [ ] **Step 7: Run the test file to verify it passes**

Run: `npm test -- src/repositories/dyn-user-repository.test.ts` (from `backend/`)
Expected: PASS, all cases green. (Requires DynamoDB Local running — see `backend/.env.test` / `npm run test:db:setup`.)

- [ ] **Step 8: Commit**

```bash
git add backend/src/ports/user-repository.ts backend/src/repositories/schemas/user.ts backend/src/repositories/dyn-user-repository.ts backend/src/repositories/dyn-user-repository.test.ts backend/src/utils/test-utils/repositories/user-repository-mocks.ts
git commit -m "make UserRepository a thin persistence port"
```

---

### Task 3: `UserService` — `ensureUser`, `findOneByEmail`, model-backed `updateSettings`

**Files:**
- Modify: `backend/src/services/user-service.ts`
- Test: `backend/src/services/user-service.test.ts`

**Interfaces:**
- Consumes: `User`, `DEFAULT_TRANSACTION_PATTERNS_LIMIT` from `../models/user`; `ModelError` from `../models/model-error`; `UserRepository` from `../ports/user-repository` (Task 2); `createMockUserRepository`, `fakeUser` from test-utils (Tasks 1–2).
- Produces: `UserService.findOneByEmail(email: string): Promise<User | null>`, `UserService.ensureUser(email: string): Promise<User>` — both consumed by Task 5 (GraphQL resolvers).
- `UserService.getSettings`/`updateSettings` signatures are unchanged from today.

- [ ] **Step 1: Rewrite the service test file**

Replace `backend/src/services/user-service.test.ts` in full:

```ts
import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "../models/user";
import { UserRepository } from "../ports/user-repository";
import { fakeUser } from "../utils/test-utils/models/user-fakes";
import { createMockUserRepository } from "../utils/test-utils/repositories/user-repository-mocks";
import { UserService } from "./user-service";

describe("UserService", () => {
  let service: UserService;
  let mockUserRepository: Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    service = new UserService(mockUserRepository);
  });

  describe("findOneByEmail", () => {
    // Happy path

    it("returns user when found", async () => {
      // Arrange
      const user = fakeUser({ email: "user@example.com" });
      mockUserRepository.findOneByEmail.mockResolvedValue(user);

      // Act
      const result = await service.findOneByEmail("user@example.com");

      // Assert
      expect(result).toBe(user);
      expect(mockUserRepository.findOneByEmail).toHaveBeenCalledWith(
        "user@example.com",
      );
    });

    it("returns null when not found", async () => {
      // Arrange
      mockUserRepository.findOneByEmail.mockResolvedValue(null);

      // Act
      const result = await service.findOneByEmail("nonexistent@example.com");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getSettings", () => {
    // Happy path

    it("returns settings for existing user", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({
        id: userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "pl-PL",
      });
      mockUserRepository.findOneById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: 5,
          voiceInputLanguage: "pl-PL",
        },
      });
      expect(mockUserRepository.findOneById).toHaveBeenCalledWith(userId);
    });

    it("returns defaults when no settings are saved", async () => {
      // Arrange
      const userId = faker.string.uuid();
      const user = fakeUser({ id: userId });
      mockUserRepository.findOneById.mockResolvedValue(user);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toStrictEqual({
        success: true,
        data: {
          transactionPatternsLimit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          voiceInputLanguage: undefined,
        },
      });
    });

    // Validation failures

    it("returns failure when userId is empty", async () => {
      // Act
      const result = await service.getSettings("");

      // Assert
      expect(result).toEqual({ success: false, error: "User ID is required" });
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
    });

    it("returns failure when user is not found", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.getSettings(userId);

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
    });
  });

  describe("ensureUser", () => {
    // Happy path

    it("returns existing user when email exists", async () => {
      // Arrange
      const user = fakeUser({ email: "user@example.com" });
      mockUserRepository.findOneByEmail.mockResolvedValue(user);

      // Act
      const result = await service.ensureUser("user@example.com");

      // Assert
      expect(result).toBe(user);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("creates user when email does not exist", async () => {
      // Arrange
      mockUserRepository.findOneByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.ensureUser("new@example.com");

      // Assert
      expect(result.email).toBe("new@example.com");
      expect(mockUserRepository.create).toHaveBeenCalledWith(result);
    });
  });

  describe("updateSettings", () => {
    // Happy path

    it("updates voiceInputLanguage", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(fakeUser({ id: userId }));
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.updateSettings({
        userId,
        voiceInputLanguage: "de-DE",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: DEFAULT_TRANSACTION_PATTERNS_LIMIT,
          voiceInputLanguage: "de-DE",
        },
      });
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ voiceInputLanguage: "de-DE" }),
      );
    });

    it("updates transactionPatternsLimit", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(fakeUser({ id: userId }));
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.updateSettings({
        userId,
        transactionPatternsLimit: 7,
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: { transactionPatternsLimit: 7, voiceInputLanguage: undefined },
      });
    });

    it("updates both fields at once", async () => {
      // Arrange
      const userId = faker.string.uuid();
      mockUserRepository.findOneById.mockResolvedValue(fakeUser({ id: userId }));
      mockUserRepository.update.mockResolvedValue(undefined);

      // Act
      const result = await service.updateSettings({
        userId,
        transactionPatternsLimit: 5,
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          transactionPatternsLimit: 5,
          voiceInputLanguage: "en-US",
        },
      });
    });

    // Validation failures

    it("returns failure when userId is empty", async () => {
      // Act
      const result = await service.updateSettings({
        userId: "",
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({ success: false, error: "User ID is required" });
      expect(mockUserRepository.findOneById).not.toHaveBeenCalled();
    });

    it("returns failure when user is not found", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(null);

      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        voiceInputLanguage: "en-US",
      });

      // Assert
      expect(result).toEqual({ success: false, error: "User not found" });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is below minimum", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(fakeUser());

      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MIN_TRANSACTION_PATTERNS_LIMIT - 1,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is above maximum", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(fakeUser());

      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: MAX_TRANSACTION_PATTERNS_LIMIT + 1,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });

    it("returns failure when transactionPatternsLimit is not an integer", async () => {
      // Arrange
      mockUserRepository.findOneById.mockResolvedValue(fakeUser());

      // Act
      const result = await service.updateSettings({
        userId: faker.string.uuid(),
        transactionPatternsLimit: 2.5,
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error: `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      });
      expect(mockUserRepository.update).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npm test -- src/services/user-service.test.ts` (from `backend/`)
Expected: FAIL — `findOneByEmail`/`ensureUser` don't exist on `UserService` yet, and `updateSettings` still calls `userRepository.update(userId, input)` instead of reading first.

- [ ] **Step 3: Rewrite `backend/src/services/user-service.ts`**

```ts
import { ModelError } from "../models/model-error";
import { DEFAULT_TRANSACTION_PATTERNS_LIMIT, User } from "../models/user";
import { UserRepository } from "../ports/user-repository";
import { Failure, Result, Success } from "../types/result";

export interface UserSettingsData {
  transactionPatternsLimit: number;
  voiceInputLanguage?: string;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneByEmail(email);
  }

  async getSettings(userId: string): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    return Success({
      transactionPatternsLimit:
        user.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
      voiceInputLanguage: user.voiceInputLanguage,
    });
  }

  async ensureUser(email: string): Promise<User> {
    const existing = await this.userRepository.findOneByEmail(email);

    if (existing) {
      return existing;
    }

    const user = User.create({ email });
    await this.userRepository.create(user);
    return user;
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
      const updated = user.update({
        transactionPatternsLimit,
        voiceInputLanguage,
      });

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

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npm test -- src/services/user-service.test.ts` (from `backend/`)
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/user-service.ts backend/src/services/user-service.test.ts
git commit -m "add ensureUser/findOneByEmail to UserService"
```

---

### Task 4: Relocate transaction-patterns-limit constants

**Files:**
- Modify: `backend/src/services/transaction-service.ts`
- Modify: `backend/src/services/transaction-service.test.ts`

**Interfaces:**
- Consumes: `MIN_TRANSACTION_PATTERNS_LIMIT`, `MAX_TRANSACTION_PATTERNS_LIMIT`, `DEFAULT_TRANSACTION_PATTERNS_LIMIT` from `../models/user` (Task 1).
- No changes to `TransactionService`'s public behavior — `validateTransactionPatternsLimit`'s clamp-to-default logic is untouched, only where its bounds come from changes.

- [ ] **Step 1: Update imports and remove the duplicated constants in `transaction-service.ts`**

Replace the top of `backend/src/services/transaction-service.ts` (current lines 1–35):

```ts
import { Account } from "../models/account";
import { Category, CategoryType } from "../models/category";
import {
  NonTransferTransactionType,
  Transaction,
  TransactionPattern,
  TransactionPatternType,
  TransactionType,
} from "../models/transaction";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "../models/user";
import { AccountRepository } from "../ports/account-repository";
import { AtomicWriter } from "../ports/atomic-writer";
import { CategoryRepository } from "../ports/category-repository";
import {
  TransactionConnection,
  TransactionFilterInput,
  TransactionRepository,
} from "../ports/transaction-repository";
import { DateString } from "../types/date";
import {
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
  PaginationInput,
} from "../types/pagination";
import { BusinessError } from "./business-error";
import { handleVersionConflict } from "./utils/handle-version-conflict";

export const MIN_SEARCH_TEXT_LENGTH = 2;

export const DEFAULT_DESCRIPTION_SUGGESTIONS_LIMIT = 5;
export const MIN_DESCRIPTION_SUGGESTIONS_LIMIT = 1;
export const MAX_DESCRIPTION_SUGGESTIONS_LIMIT = 10;
```

(The three `export const *_TRANSACTION_PATTERNS_LIMIT` declarations are removed; everything else — including the rest of the file, `validateTransactionPatternsLimit`'s body — is unchanged, since those constants are now imported.)

- [ ] **Step 2: Update the test import in `transaction-service.test.ts`**

Replace lines 5 and 24–33 of `backend/src/services/transaction-service.test.ts`:

Old:
```ts
import { TransactionPatternType, TransactionType } from "../models/transaction";
```
```ts
import { BusinessError } from "./business-error";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_SEARCH_TEXT_LENGTH,
  MIN_TRANSACTION_PATTERNS_LIMIT,
  TransactionService,
  TransactionServiceImpl,
} from "./transaction-service";
```

New:
```ts
import { TransactionPatternType, TransactionType } from "../models/transaction";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "../models/user";
```
```ts
import { BusinessError } from "./business-error";
import {
  DESCRIPTION_SUGGESTIONS_SAMPLE_SIZE,
  MIN_SEARCH_TEXT_LENGTH,
  TransactionService,
  TransactionServiceImpl,
} from "./transaction-service";
```

(Keep the rest of the import block — `../ports/*`, `../types/*`, `../utils/test-utils/*` — exactly where it is; only the two blocks shown move.)

- [ ] **Step 3: Run the test file to verify it still passes**

Run: `npm test -- src/services/transaction-service.test.ts` (from `backend/`)
Expected: PASS — this is a pure import relocation, no behavior changed.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/transaction-service.ts backend/src/services/transaction-service.test.ts
git commit -m "source transaction-patterns-limit bounds from User model"
```

---

### Task 5: Route GraphQL resolvers through `UserService`

**Files:**
- Modify: `backend/src/graphql/resolvers/shared.ts`
- Modify: `backend/src/graphql/resolvers/user-resolvers.ts`

**Interfaces:**
- Consumes: `UserService.findOneByEmail`, `UserService.ensureUser` (Task 3). `context.userService` is already present on `GraphQLContext` (`backend/src/graphql/context.ts:22`) — no context changes needed.

- [ ] **Step 1: Update `getAuthenticatedUser` in `shared.ts`**

In `backend/src/graphql/resolvers/shared.ts`, inside `getAuthenticatedUser` (current lines 23–44), replace:

```ts
    const user = await context.userRepository.findOneByEmail(authUser.email);
```

with:

```ts
    const user = await context.userService.findOneByEmail(authUser.email);
```

No other lines in this function change.

- [ ] **Step 2: Update `ensureAuthenticatedUser` in `user-resolvers.ts`**

In `backend/src/graphql/resolvers/user-resolvers.ts`, replace the whole function (current lines 14–35):

Old:
```ts
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    // Email is already normalized and available in auth context
    const email = authUser.email;

    // Check if user already exists
    const existingUser = await context.userRepository.findOneByEmail(email);

    if (existingUser) {
      console.log("[RESOLVER] User already exists");
      return existingUser;
    }

    const user = await context.userRepository.ensureUser(email);
    return user;
  } catch (error) {
    console.error("Error ensuring user:", error);
    throw new GraphQLError("Failed to authenticate user");
  }
}
```

New:
```ts
async function ensureAuthenticatedUser(context: GraphQLContext): Promise<User> {
  const authUser = requireAuthentication(context);

  try {
    return await context.userService.ensureUser(authUser.email);
  } catch (error) {
    console.error("Error ensuring user:", error);
    throw new GraphQLError("Failed to authenticate user");
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck` (from `backend/`)
Expected: no errors. This confirms no other file still references the removed `UserRepository.ensureUser` or constructs a plain `User` object literal.

- [ ] **Step 4: Commit**

```bash
git add backend/src/graphql/resolvers/shared.ts backend/src/graphql/resolvers/user-resolvers.ts
git commit -m "route GraphQL user resolvers through UserService"
```

---

### Task 6: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run: `npm test` (from `backend/`)
Expected: all suites pass, including `models/user.test.ts`, `repositories/dyn-user-repository.test.ts`, `services/user-service.test.ts`, `services/transaction-service.test.ts`, and every pre-existing suite (no regressions from the `UserRepository`/`UserService` signature changes).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` (from `backend/`)
Expected: no errors.

- [ ] **Step 3: Lint and format**

Run: `npm run format` (from `backend/`)
Expected: no errors after auto-fix; review any changed formatting before committing.

- [ ] **Step 4: Commit any formatting fixes, if present**

```bash
git add -A
git commit -m "fix lint/format issues from User rich model migration"
```

(Skip this step if `npm run format` made no changes.)
