# Chat History — Track 2: Session History

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-session conversation history to the Insight service and Telegram bot so users can ask follow-up questions.

**Architecture:** `InsightChatService` owns the in-app session lifecycle (load history → call `InsightService` → save messages). `ProcessTelegramMessageService` owns the Telegram session lifecycle using the same `ChatMessageRepository`. `InsightService` stays stateless — accepts optional `history` and passes it to the agent.

**Tech Stack:** TypeScript, DynamoDB (sort key: `sessionMessageCombinedId = "${sessionId}#${messageId}"`), `ulidx` (ULID generation), Apollo GraphQL, Vue 3 + Apollo composables.

**Prerequisite:** Complete Track 1 (`2026-04-03-chat-history-track1-ask-insight-mutation.md`) first. Track 1 moves `insight` from `Query` to `Mutation.askInsight` using the existing `InsightInput`/`InsightOutput` types. This track picks up from there: renames types to `AskInsight*`, adds `sessionId`, and adds the full history implementation.

---

## File Map

**New files:**
- `backend/src/types/ulid.ts` — `Ulid` branded type + `generateUlid()`
- `backend/src/models/chat-message.ts` — `ChatMessageRole` enum, `ChatMessage` interface
- `backend/src/services/ports/chat-message-repository.ts` — repository port
- `backend/src/repositories/schemas/chat-message.ts` — Zod schema for raw DynamoDB record
- `backend/src/repositories/dyn-chat-message-repository.ts` — DynamoDB implementation
- `backend/src/repositories/dyn-chat-message-repository.test.ts` — repository tests (real DynamoDB Local)
- `backend/src/services/insight-chat-service.ts` — in-app chat orchestrator
- `backend/src/services/insight-chat-service.test.ts` — service tests (mocked repository)
- `backend/src/graphql/resolvers/ask-insight-resolvers.ts` — `Mutation.askInsight` resolver (renamed from `insight-resolvers.ts`)

**Modified files:**
- `backend/.env.test` — add `CHAT_MESSAGES_TABLE_NAME=_test_ChatMessages`
- `backend/src/scripts/table-definitions.ts` — add `ChatMessagesTable` definition
- `backend/src/utils/test-utils/dynamodb-helpers.ts` — add `ChatMessagesTable` to `truncateAllTables`
- `backend/src/utils/test-utils/mock-repositories.ts` — add `createMockChatMessageRepository`
- `backend/src/services/agent-services/insight-service.ts` — add `history?` param
- `backend/src/services/agent-services/insight-service.test.ts` — add history tests
- `backend/src/services/process-telegram-message-service.ts` — add history support
- `backend/src/services/process-telegram-message-service.test.ts` — update tests
- `backend/src/graphql/schema.graphql` — rename `Insight*` types to `AskInsight*`, add `sessionId`
- `backend/src/__generated__/resolvers-types.ts` — regenerated
- `backend/src/graphql/resolvers/index.ts` — update import and add `AskInsightOutput` union resolver
- `backend/src/graphql/context.ts` — replace `insightService` with `insightChatService`
- `backend/src/dependencies.ts` — add `resolveChatMessageRepository`, `resolveInsightChatService`, update `resolveProcessTelegramMessageService`
- `backend/src/server.ts` — replace `insightService` with `insightChatService`
- `infra-cdk/lib/backend-cdk-stack.ts` — add `ChatMessagesTable`, env vars, permissions
- `frontend/src/graphql/mutations.ts` — update `ASK_INSIGHT` to use `AskInsight*` types, add `sessionId`
- `frontend/src/schema.graphql` — regenerated
- `frontend/src/__generated__/vue-apollo.ts` — regenerated
- `frontend/src/composables/useInsight.ts` — add sessionId localStorage persistence

---

## Task 1: Ulid branded type

**Files:**
- Create: `backend/src/types/ulid.ts`

- [ ] **Step 1: Create the file**

```typescript
// backend/src/types/ulid.ts
import { ulid } from "ulidx";

/**
 * Branded string type representing a ULID (Universally Unique Lexicographically Sortable Identifier).
 * ULIDs are chosen specifically for lexicographic sortability — this brand prevents accidentally
 * passing a plain UUID where sort order matters.
 */
export type Ulid = string & { readonly __brand: unique symbol };

/**
 * Generates a new ULID, cast to the Ulid branded type.
 */
export function generateUlid(): Ulid {
  return ulid() as Ulid;
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/types/ulid.ts
git commit -m "add Ulid branded type"
```

---

## Task 2: ChatMessage model

**Files:**
- Create: `backend/src/models/chat-message.ts`

- [ ] **Step 1: Create the model file**

```typescript
// backend/src/models/chat-message.ts
import { Ulid } from "../types/ulid";

export enum ChatMessageRole {
  USER = "USER",
  ASSISTANT = "ASSISTANT",
}

export interface ChatMessage {
  userId: string;
  sessionId: string;
  messageId: Ulid;
  role: ChatMessageRole;
  content: string;
  createdAt: string; // ISO 8601
  expiresAt: number; // Unix timestamp — also serves as DynamoDB TTL attribute
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/models/chat-message.ts
git commit -m "add ChatMessage model"
```

---

## Task 3: ChatMessageRepository port and mock

**Files:**
- Create: `backend/src/services/ports/chat-message-repository.ts`
- Modify: `backend/src/utils/test-utils/mock-repositories.ts`

- [ ] **Step 1: Create the port**

```typescript
// backend/src/services/ports/chat-message-repository.ts
import { ChatMessage, ChatMessageRole } from "../../models/chat-message";
import { Ulid } from "../../types/ulid";

export interface CreateChatMessageInput {
  userId: string;
  sessionId: string;
  messageId: Ulid;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  expiresAt: number;
}

// Soft-deletion exception: messages expire via DynamoDB TTL instead of isArchived.
// They are immutable and short-lived; TTL-based cleanup is the intended lifecycle.
export interface ChatMessageRepository {
  findManyRecentBySessionId(input: {
    userId: string;
    sessionId: string;
    limit: number;
  }): Promise<ChatMessage[]>;

  create(input: CreateChatMessageInput): Promise<ChatMessage>;
}
```

- [ ] **Step 2: Add the mock to `mock-repositories.ts`**

Add at the end of `backend/src/utils/test-utils/mock-repositories.ts`:

```typescript
import { ChatMessageRepository } from "../../services/ports/chat-message-repository";

/**
 * Mock chat message repository for testing
 */
export const createMockChatMessageRepository =
  (): jest.Mocked<ChatMessageRepository> => ({
    findManyRecentBySessionId: jest.fn(),
    create: jest.fn(),
  });
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/ports/chat-message-repository.ts backend/src/utils/test-utils/mock-repositories.ts
git commit -m "add ChatMessageRepository port and mock"
```

---

## Task 4: Test infrastructure for ChatMessagesTable

**Files:**
- Modify: `backend/.env.test`
- Modify: `backend/src/scripts/table-definitions.ts`
- Modify: `backend/src/utils/test-utils/dynamodb-helpers.ts`

- [ ] **Step 1: Add env var to `.env.test`**

Add to `backend/.env.test` (after the existing table name lines):

```
CHAT_MESSAGES_TABLE_NAME=_test_ChatMessages
```

- [ ] **Step 2: Add table definition**

Add to the `tables` array in `backend/src/scripts/table-definitions.ts` (after the `telegramBotsTable` entry):

```typescript
  {
    TableName: process.env.CHAT_MESSAGES_TABLE_NAME,
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "sessionMessageCombinedId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "sessionMessageCombinedId", KeyType: "RANGE" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
```

- [ ] **Step 3: Add to `truncateAllTables`**

In `backend/src/utils/test-utils/dynamodb-helpers.ts`, inside `truncateAllTables`, add the ChatMessages table after the other `userId`-keyed tables:

```typescript
  await truncateTable(client, requireEnv("CHAT_MESSAGES_TABLE_NAME"), {
    partitionKey: "userId",
    sortKey: "sessionMessageCombinedId",
  });
```

- [ ] **Step 4: Create the table in DynamoDB Local**

```bash
cd backend && npm run db:setup
```

Expected: `Created _test_ChatMessages` (or `already exists` if run again).

- [ ] **Step 5: Commit**

```bash
git add backend/.env.test backend/src/scripts/table-definitions.ts backend/src/utils/test-utils/dynamodb-helpers.ts
git commit -m "add ChatMessagesTable to test infrastructure"
```

---

## Task 5: DynChatMessageRepository (TDD)

**Files:**
- Create: `backend/src/repositories/schemas/chat-message.ts`
- Create: `backend/src/repositories/dyn-chat-message-repository.test.ts`
- Create: `backend/src/repositories/dyn-chat-message-repository.ts`

- [ ] **Step 1: Create the Zod schema for the raw DynamoDB record**

The raw record uses `sessionMessageCombinedId` as the sort key instead of separate `sessionId`/`messageId` fields.

```typescript
// backend/src/repositories/schemas/chat-message.ts
import { z } from "zod";
import { ChatMessageRole } from "../../models/chat-message";

// Raw DynamoDB record shape — differs from ChatMessage entity:
// sessionMessageCombinedId is the compound sort key "${sessionId}#${messageId}".
// The repository extracts sessionId and messageId from it after hydration.
export interface ChatMessageRecord {
  userId: string;
  sessionMessageCombinedId: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  expiresAt: number;
}

export const chatMessageRecordSchema = z.object({
  userId: z.string().min(1),
  sessionMessageCombinedId: z.string().min(1),
  role: z.enum(ChatMessageRole),
  content: z.string().min(1),
  createdAt: z.iso.datetime(),
  expiresAt: z.number().int().positive(),
}) satisfies z.ZodType<ChatMessageRecord>;
```

- [ ] **Step 2: Write the failing tests**

```typescript
// backend/src/repositories/dyn-chat-message-repository.test.ts
import { faker } from "@faker-js/faker";
import { ChatMessageRole } from "../models/chat-message";
import { generateUlid } from "../types/ulid";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import { truncateTable } from "../utils/test-utils/dynamodb-helpers";
import { DynChatMessageRepository } from "./dyn-chat-message-repository";

describe("DynChatMessageRepository", () => {
  let repository: DynChatMessageRepository;
  const userId = faker.string.uuid();
  const sessionId = faker.string.uuid();

  beforeAll(() => {
    repository = new DynChatMessageRepository();
  });

  beforeEach(async () => {
    const client = createDynamoDBDocumentClient();
    const tableName = process.env.CHAT_MESSAGES_TABLE_NAME || "";
    await truncateTable(client, tableName, {
      partitionKey: "userId",
      sortKey: "sessionMessageCombinedId",
    });
  });

  describe("create", () => {
    it("should create and return a chat message", async () => {
      const messageId = generateUlid();
      const now = new Date();
      const input = {
        userId,
        sessionId,
        messageId,
        role: ChatMessageRole.USER,
        content: "How much did I spend?",
        createdAt: now.toISOString(),
        expiresAt: Math.floor(now.getTime() / 1000) + 86400,
      };

      const result = await repository.create(input);

      expect(result).toEqual({
        userId,
        sessionId,
        messageId,
        role: ChatMessageRole.USER,
        content: "How much did I spend?",
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      });
    });
  });

  describe("findManyRecentBySessionId", () => {
    it("should return empty array when no messages exist", async () => {
      const result = await repository.findManyRecentBySessionId({
        userId,
        sessionId: faker.string.uuid(),
        limit: 20,
      });

      expect(result).toEqual([]);
    });

    it("should return messages in ascending order", async () => {
      const now = new Date();
      const expiresAt = Math.floor(now.getTime() / 1000) + 86400;

      await repository.create({
        userId,
        sessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "First message",
        createdAt: now.toISOString(),
        expiresAt,
      });

      await new Promise((resolve) => setTimeout(resolve, 5));

      await repository.create({
        userId,
        sessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.ASSISTANT,
        content: "Second message",
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      const result = await repository.findManyRecentBySessionId({
        userId,
        sessionId,
        limit: 20,
      });

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("First message");
      expect(result[1].content).toBe("Second message");
      expect(result[0].sessionId).toBe(sessionId);
      expect(result[0].userId).toBe(userId);
    });

    it("should return only the last N messages when more exist", async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;

      for (let i = 0; i < 5; i++) {
        await repository.create({
          userId,
          sessionId,
          messageId: generateUlid(),
          role: ChatMessageRole.USER,
          content: `Message ${i}`,
          createdAt: new Date().toISOString(),
          expiresAt,
        });
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const result = await repository.findManyRecentBySessionId({
        userId,
        sessionId,
        limit: 3,
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe("Message 2");
      expect(result[1].content).toBe("Message 3");
      expect(result[2].content).toBe("Message 4");
    });

    it("should not return messages from other sessions", async () => {
      const otherSessionId = faker.string.uuid();
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;

      await repository.create({
        userId,
        sessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "My session",
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      await repository.create({
        userId,
        sessionId: otherSessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "Other session",
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      const result = await repository.findManyRecentBySessionId({
        userId,
        sessionId,
        limit: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("My session");
    });

    it("should not return messages from other users", async () => {
      const otherUserId = faker.string.uuid();
      const expiresAt = Math.floor(Date.now() / 1000) + 86400;

      await repository.create({
        userId,
        sessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "My message",
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      await repository.create({
        userId: otherUserId,
        sessionId,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "Other user message",
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      const result = await repository.findManyRecentBySessionId({
        userId,
        sessionId,
        limit: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("My message");
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && npm test -- src/repositories/dyn-chat-message-repository.test.ts
```

Expected: FAIL — `DynChatMessageRepository` does not exist yet.

- [ ] **Step 4: Implement `DynChatMessageRepository`**

```typescript
// backend/src/repositories/dyn-chat-message-repository.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { ChatMessage, ChatMessageRole } from "../models/chat-message";
import {
  ChatMessageRepository,
  CreateChatMessageInput,
} from "../services/ports/chat-message-repository";
import { Ulid } from "../types/ulid";
import { createDynamoDBDocumentClient } from "../utils/dynamo-client";
import {
  ChatMessageRecord,
  chatMessageRecordSchema,
} from "./schemas/chat-message";
import { hydrate } from "./utils/hydrate";
import { RepositoryError } from "../services/ports/repository-error";

export class DynChatMessageRepository implements ChatMessageRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(dynamoClient?: DynamoDBClient) {
    this.client = createDynamoDBDocumentClient(dynamoClient);
    this.tableName = process.env.CHAT_MESSAGES_TABLE_NAME || "";

    if (!this.tableName) {
      throw new RepositoryError(
        "CHAT_MESSAGES_TABLE_NAME environment variable is required",
        "MISSING_TABLE_NAME",
      );
    }
  }

  async findManyRecentBySessionId({
    userId,
    sessionId,
    limit,
  }: {
    userId: string;
    sessionId: string;
    limit: number;
  }): Promise<ChatMessage[]> {
    if (!userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }
    if (!sessionId) {
      throw new RepositoryError("Session ID is required", "INVALID_PARAMETERS");
    }

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression:
          "userId = :userId AND begins_with(sessionMessageCombinedId, :prefix)",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":prefix": `${sessionId}#`,
        },
        ScanIndexForward: false,
        Limit: limit,
      });

      const result = await this.client.send(command);
      const items = result.Items ?? [];

      // Reverse to restore ascending (oldest-first) order after descending scan
      return items
        .reverse()
        .map((item) => this.toEntity(hydrate(chatMessageRecordSchema, item)));
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new RepositoryError(
        "Failed to find recent messages by session",
        "QUERY_FAILED",
        error,
      );
    }
  }

  async create(input: CreateChatMessageInput): Promise<ChatMessage> {
    if (!input.userId) {
      throw new RepositoryError("User ID is required", "INVALID_PARAMETERS");
    }
    if (!input.sessionId) {
      throw new RepositoryError("Session ID is required", "INVALID_PARAMETERS");
    }

    const record: ChatMessageRecord = {
      userId: input.userId,
      sessionMessageCombinedId: `${input.sessionId}#${input.messageId}`,
      role: input.role,
      content: input.content,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    };

    try {
      await this.client.send(
        new PutCommand({ TableName: this.tableName, Item: record }),
      );
    } catch (error) {
      throw new RepositoryError(
        "Failed to create chat message",
        "CREATE_FAILED",
        error,
      );
    }

    return this.toEntity(record);
  }

  private toEntity(record: ChatMessageRecord): ChatMessage {
    const lastHashIndex = record.sessionMessageCombinedId.lastIndexOf("#");
    const sessionId = record.sessionMessageCombinedId.slice(0, lastHashIndex);
    const messageId = record.sessionMessageCombinedId.slice(
      lastHashIndex + 1,
    ) as Ulid;

    return {
      userId: record.userId,
      sessionId,
      messageId,
      role: record.role as ChatMessageRole,
      content: record.content,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && npm test -- src/repositories/dyn-chat-message-repository.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/repositories/schemas/chat-message.ts backend/src/repositories/dyn-chat-message-repository.ts backend/src/repositories/dyn-chat-message-repository.test.ts
git commit -m "add DynChatMessageRepository"
```

---

## Task 6: Update InsightService to accept history (TDD)

**Files:**
- Modify: `backend/src/services/agent-services/insight-service.ts`
- Modify: `backend/src/services/agent-services/insight-service.test.ts`

- [ ] **Step 1: Add a failing test for history passing**

In `backend/src/services/agent-services/insight-service.test.ts`, add a new `describe` block after the existing ones:

```typescript
  describe("history", () => {
    it("should prepend history messages before the user question", async () => {
      mockAgent.call.mockResolvedValue({
        answer: "You spent 100 euro",
        agentTrace: [],
      });

      await service.call(userId, {
        question: "And last month?",
        history: [
          { role: "user", content: "My question: How much did I spend?" },
          { role: "assistant", content: "You spent 200 euro" },
        ],
      });

      expect(mockAgent.call).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: "My question: How much did I spend?" },
            { role: "assistant", content: "You spent 200 euro" },
            { role: "user", content: "My question: And last month?" },
          ],
        }),
      );
    });

    it("should work without history", async () => {
      mockAgent.call.mockResolvedValue({
        answer: "You spent 100 euro",
        agentTrace: [],
      });

      await service.call(userId, { question: "How much did I spend?" });

      expect(mockAgent.call).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: "user", content: "My question: How much did I spend?" },
          ],
        }),
      );
    });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd backend && npm test -- src/services/agent-services/insight-service.test.ts
```

Expected: FAIL — `history` is not a recognised input field.

- [ ] **Step 3: Update `InsightService`**

In `backend/src/services/agent-services/insight-service.ts`, update `InsightInput` and the `call` method.

Change `InsightInput` to:
```typescript
export interface InsightInput {
  question: string;
  history?: AgentMessage[];
}
```

Add `AgentMessage` to the import from `"../ports/agent"`.

Update the messages array in `call()`:

```typescript
    const history = input.history ?? [];
    const response = await this.agent.call({
      messages: [
        ...history,
        { role: "user", content: `My question: ${normalizedQuestion}` },
      ],
      systemPrompt,
      tools,
    });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- src/services/agent-services/insight-service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/agent-services/insight-service.ts backend/src/services/agent-services/insight-service.test.ts
git commit -m "add history support to InsightService"
```

---

## Task 7: InsightChatService (TDD)

**Files:**
- Create: `backend/src/services/insight-chat-service.test.ts`
- Create: `backend/src/services/insight-chat-service.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/services/insight-chat-service.test.ts
import { faker } from "@faker-js/faker";
import { ChatMessageRole } from "../models/chat-message";
import { InsightService } from "./agent-services/insight-service";
import { InsightChatService } from "./insight-chat-service";
import { createMockChatMessageRepository } from "../utils/test-utils/mock-repositories";

const createMockInsightService = (): jest.Mocked<Pick<InsightService, "call">> => ({
  call: jest.fn(),
});

describe("InsightChatService", () => {
  let insightService: jest.Mocked<Pick<InsightService, "call">>;
  let chatMessageRepository: ReturnType<typeof createMockChatMessageRepository>;
  let service: InsightChatService;
  const userId = faker.string.uuid();

  beforeEach(() => {
    insightService = createMockInsightService();
    chatMessageRepository = createMockChatMessageRepository();
    service = new InsightChatService({
      insightService: insightService as unknown as InsightService,
      chatMessageRepository,
    });
    jest.clearAllMocks();
  });

  describe("validation", () => {
    it("should return failure when userId is empty", async () => {
      const result = await service.call("", { question: "Hello?" });

      expect(result).toMatchObject({ success: false, error: { message: "User ID is required" } });
      expect(insightService.call).not.toHaveBeenCalled();
    });

    it("should return failure when question is empty", async () => {
      const result = await service.call(userId, { question: "  " });

      expect(result).toMatchObject({ success: false, error: { message: "Question is required" } });
      expect(insightService.call).not.toHaveBeenCalled();
    });
  });

  describe("session management", () => {
    it("should generate a sessionId when none is provided", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "50 euro", agentTrace: [] },
      });
      chatMessageRepository.create.mockResolvedValue({} as any);

      const result = await service.call(userId, { question: "How much?" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
      }
    });

    it("should use the provided sessionId", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "50 euro", agentTrace: [] },
      });
      chatMessageRepository.create.mockResolvedValue({} as any);

      const result = await service.call(userId, { question: "How much?", sessionId });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionId).toBe(sessionId);
      }
      expect(chatMessageRepository.findManyRecentBySessionId).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId }),
      );
    });

    it("should load history and pass it to InsightService", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([
        {
          userId,
          sessionId,
          messageId: "01ULID" as any,
          role: ChatMessageRole.USER,
          content: "Previous question",
          createdAt: new Date().toISOString(),
          expiresAt: 9999999999,
        },
        {
          userId,
          sessionId,
          messageId: "02ULID" as any,
          role: ChatMessageRole.ASSISTANT,
          content: "Previous answer",
          createdAt: new Date().toISOString(),
          expiresAt: 9999999999,
        },
      ]);
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "New answer", agentTrace: [] },
      });
      chatMessageRepository.create.mockResolvedValue({} as any);

      await service.call(userId, { question: "Follow-up?", sessionId });

      expect(insightService.call).toHaveBeenCalledWith(userId, {
        question: "Follow-up?",
        history: [
          { role: "user", content: "Previous question" },
          { role: "assistant", content: "Previous answer" },
        ],
      });
    });

    it("should save user and assistant messages after successful response", async () => {
      const sessionId = faker.string.uuid();
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      insightService.call.mockResolvedValue({
        success: true,
        data: { answer: "50 euro", agentTrace: [] },
      });
      chatMessageRepository.create.mockResolvedValue({} as any);

      await service.call(userId, { question: "How much?", sessionId });

      expect(chatMessageRepository.create).toHaveBeenCalledTimes(2);
      expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.USER,
          content: "How much?",
        }),
      );
      expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          userId,
          sessionId,
          role: ChatMessageRole.ASSISTANT,
          content: "50 euro",
        }),
      );
    });

    it("should not save messages when InsightService fails", async () => {
      chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
      insightService.call.mockResolvedValue({
        success: false,
        error: { message: "No data", agentTrace: [] },
      });

      const result = await service.call(userId, { question: "How much?" });

      expect(result.success).toBe(false);
      expect(chatMessageRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- src/services/insight-chat-service.test.ts
```

Expected: FAIL — `InsightChatService` does not exist.

- [ ] **Step 3: Implement `InsightChatService`**

```typescript
// backend/src/services/insight-chat-service.ts
import { randomUUID } from "crypto";
import { monotonicFactory } from "ulidx";
import { ChatMessageRole } from "../models/chat-message";
import { Failure, Result, Success } from "../types/result";
import { Ulid } from "../types/ulid";
import { InsightService } from "./agent-services/insight-service";
import { AgentMessage, AgentTraceMessage } from "./ports/agent";
import { ChatMessageRepository } from "./ports/chat-message-repository";

const generateUlid = monotonicFactory();

const HISTORY_LIMIT = parseInt(
  process.env.CHAT_HISTORY_MAX_MESSAGES ?? "20",
  10,
);
const MESSAGE_TTL_SECONDS = parseInt(
  process.env.CHAT_MESSAGE_TTL_SECONDS ?? "86400",
  10,
);

export interface InsightChatInput {
  question: string;
  sessionId?: string;
}

type InsightChatOutput = Result<
  { answer: string; sessionId: string; agentTrace: AgentTraceMessage[] },
  { message: string; agentTrace: AgentTraceMessage[] }
>;

export class InsightChatService {
  private readonly insightService: InsightService;
  private readonly chatMessageRepository: ChatMessageRepository;

  constructor(deps: {
    insightService: InsightService;
    chatMessageRepository: ChatMessageRepository;
  }) {
    this.insightService = deps.insightService;
    this.chatMessageRepository = deps.chatMessageRepository;
  }

  async call(
    userId: string,
    input: InsightChatInput,
  ): Promise<InsightChatOutput> {
    if (!userId) {
      return Failure({ message: "User ID is required", agentTrace: [] });
    }

    const normalizedQuestion = input.question.trim();
    if (!normalizedQuestion) {
      return Failure({ message: "Question is required", agentTrace: [] });
    }

    const sessionId = input.sessionId ?? randomUUID();

    const recentMessages = await this.chatMessageRepository.findManyRecentBySessionId({
      userId,
      sessionId,
      limit: HISTORY_LIMIT,
    });

    const history: AgentMessage[] = recentMessages.map((message) =>
      this.toAgentMessage(message),
    );

    const insightResult = await this.insightService.call(userId, {
      question: normalizedQuestion,
      history,
    });

    if (!insightResult.success) {
      return Failure(insightResult.error);
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = Math.floor(now.getTime() / 1000) + MESSAGE_TTL_SECONDS;

    await this.chatMessageRepository.create({
      userId,
      sessionId,
      messageId: generateUlid() as Ulid,
      role: ChatMessageRole.USER,
      content: normalizedQuestion,
      createdAt,
      expiresAt,
    });

    await this.chatMessageRepository.create({
      userId,
      sessionId,
      messageId: generateUlid() as Ulid,
      role: ChatMessageRole.ASSISTANT,
      content: insightResult.data.answer,
      createdAt,
      expiresAt,
    });

    return Success({
      answer: insightResult.data.answer,
      sessionId,
      agentTrace: insightResult.data.agentTrace,
    });
  }

  private toAgentMessage(message: { role: ChatMessageRole; content: string }): AgentMessage {
    return {
      role: message.role === ChatMessageRole.USER ? "user" : "assistant",
      content: message.content,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- src/services/insight-chat-service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/insight-chat-service.ts backend/src/services/insight-chat-service.test.ts
git commit -m "add InsightChatService"
```

---

## Task 8: Update ProcessTelegramMessageService (TDD)

**Files:**
- Modify: `backend/src/services/process-telegram-message-service.ts`
- Modify: `backend/src/services/process-telegram-message-service.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the entire content of `backend/src/services/process-telegram-message-service.test.ts` with:

```typescript
import { faker } from "@faker-js/faker";
import { ChatMessageRole } from "../models/chat-message";
import { generateUlid } from "../types/ulid";
import { fakeTelegramBot } from "../utils/test-utils/factories";
import { createMockTelegramApiClient } from "../utils/test-utils/mock-providers";
import {
  createMockChatMessageRepository,
  createMockTelegramBotRepository,
} from "../utils/test-utils/mock-repositories";
import { InsightService } from "./agent-services/insight-service";
import { ProcessTelegramMessageService } from "./process-telegram-message-service";

describe("ProcessTelegramMessageService", () => {
  let insightService: jest.Mocked<Pick<InsightService, "call">>;
  let telegramApiClient: ReturnType<typeof createMockTelegramApiClient>;
  let telegramBotRepository: ReturnType<typeof createMockTelegramBotRepository>;
  let chatMessageRepository: ReturnType<typeof createMockChatMessageRepository>;
  let service: ProcessTelegramMessageService;

  const chatId = faker.number.int();
  const userId = faker.string.uuid();

  beforeEach(() => {
    insightService = { call: jest.fn() };
    telegramApiClient = createMockTelegramApiClient();
    telegramBotRepository = createMockTelegramBotRepository();
    chatMessageRepository = createMockChatMessageRepository();

    service = new ProcessTelegramMessageService({
      telegramBotRepository,
      telegramApiClient,
      insightService: insightService as unknown as InsightService,
      chatMessageRepository,
    });

    jest.clearAllMocks();
  });

  it("should do nothing when bot is not found", async () => {
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(null);

    const result = await service.call({
      botId: "some-id",
      userId,
      chatId,
      text: "hello",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).not.toHaveBeenCalled();
  });

  it("should do nothing when connected bot id does not match", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);

    const result = await service.call({
      botId: "stale-id",
      userId,
      chatId,
      text: "hello",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).not.toHaveBeenCalled();
  });

  it("should reply with non-text message notice when text is null", async () => {
    const bot = fakeTelegramBot();
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: true, data: undefined });

    const result = await service.call({ botId: bot.id, userId, chatId, text: null });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "I can only process text messages",
    });
    expect(insightService.call).not.toHaveBeenCalled();
  });

  it("should load history and pass it to InsightService", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: true, data: undefined });
    chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([
      {
        userId,
        sessionId: `${bot.id}#${chatId}`,
        messageId: generateUlid(),
        role: ChatMessageRole.USER,
        content: "Previous question",
        createdAt: new Date().toISOString(),
        expiresAt: 9999999999,
      },
    ]);
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "50 euro", agentTrace: [] },
    });
    chatMessageRepository.create.mockResolvedValue({} as any);

    await service.call({ botId: bot.id, userId, chatId, text: "Follow-up?" });

    expect(chatMessageRepository.findManyRecentBySessionId).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: `${bot.id}#${chatId}` }),
    );
    expect(insightService.call).toHaveBeenCalledWith(userId, {
      question: "Follow-up?",
      history: [{ role: "user", content: "Previous question" }],
    });
  });

  it("should save user and assistant messages after successful response", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: true, data: undefined });
    chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "50 euro", agentTrace: [] },
    });
    chatMessageRepository.create.mockResolvedValue({} as any);

    await service.call({ botId: bot.id, userId, chatId, text: "How much?" });

    expect(chatMessageRepository.create).toHaveBeenCalledTimes(2);
    expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: ChatMessageRole.USER, content: "How much?" }),
    );
    expect(chatMessageRepository.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ role: ChatMessageRole.ASSISTANT, content: "50 euro" }),
    );
  });

  it("should call InsightService and reply with the answer", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: true, data: undefined });
    chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [] },
    });
    chatMessageRepository.create.mockResolvedValue({} as any);

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "How much did I spend?",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "You spent 50 euro",
    });
  });

  it("should reply with error message when InsightService fails", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: true, data: undefined });
    chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
    insightService.call.mockResolvedValue({
      success: false,
      error: { message: "No data available", agentTrace: [] },
    });

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "What is my balance?",
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(telegramApiClient.sendMessage).toHaveBeenCalledWith({
      token: bot.token,
      chatId,
      text: "No data available",
    });
    expect(chatMessageRepository.create).not.toHaveBeenCalled();
  });

  it("should fail when sendMessage fails", async () => {
    const bot = fakeTelegramBot({ userId });
    telegramBotRepository.findOneConnectedByUserId.mockResolvedValue(bot);
    telegramApiClient.sendMessage.mockResolvedValue({ success: false, error: "Telegram API error" });
    chatMessageRepository.findManyRecentBySessionId.mockResolvedValue([]);
    insightService.call.mockResolvedValue({
      success: true,
      data: { answer: "You spent 50 euro", agentTrace: [] },
    });
    chatMessageRepository.create.mockResolvedValue({} as any);

    const result = await service.call({
      botId: bot.id,
      userId,
      chatId,
      text: "How much did I spend?",
    });

    expect(result).toEqual({ success: false, error: "Telegram API error" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- src/services/process-telegram-message-service.test.ts
```

Expected: FAIL — `chatMessageRepository` is not accepted by the constructor.

- [ ] **Step 3: Update `ProcessTelegramMessageService`**

Replace the entire content of `backend/src/services/process-telegram-message-service.ts` with:

```typescript
import { monotonicFactory } from "ulidx";
import { ChatMessageRole } from "../models/chat-message";
import { Failure, Result, Success } from "../types/result";
import { Ulid } from "../types/ulid";
import { InsightService } from "./agent-services/insight-service";
import { AgentMessage } from "./ports/agent";
import { ChatMessageRepository } from "./ports/chat-message-repository";
import { TelegramApiClient } from "./ports/telegram-api-client";
import { TelegramBotRepository } from "./ports/telegram-bot-repository";

const generateUlid = monotonicFactory();

const HISTORY_LIMIT = parseInt(
  process.env.CHAT_HISTORY_MAX_MESSAGES ?? "20",
  10,
);
const MESSAGE_TTL_SECONDS = parseInt(
  process.env.CHAT_MESSAGE_TTL_SECONDS ?? "86400",
  10,
);

export interface ProcessTelegramMessageInput {
  botId: string;
  chatId: number;
  text: string | null;
  userId: string;
}

export class ProcessTelegramMessageService {
  private readonly insightService: InsightService;
  private readonly telegramApiClient: TelegramApiClient;
  private readonly telegramBotRepository: TelegramBotRepository;
  private readonly chatMessageRepository: ChatMessageRepository;

  constructor(deps: {
    insightService: InsightService;
    telegramApiClient: TelegramApiClient;
    telegramBotRepository: TelegramBotRepository;
    chatMessageRepository: ChatMessageRepository;
  }) {
    this.insightService = deps.insightService;
    this.telegramApiClient = deps.telegramApiClient;
    this.telegramBotRepository = deps.telegramBotRepository;
    this.chatMessageRepository = deps.chatMessageRepository;
  }

  async call(input: ProcessTelegramMessageInput): Promise<Result<void>> {
    const { botId, userId, chatId, text } = input;

    const bot =
      await this.telegramBotRepository.findOneConnectedByUserId(userId);

    if (!bot) {
      console.warn(`No connected bot found for user ${userId}`);
      return Success(undefined);
    }

    if (bot.id !== botId) {
      console.warn(
        `Received message for bot ${botId}, but currently connected bot for user ${userId} is ${bot.id}`,
      );
      return Success(undefined);
    }

    if (!text) {
      const result = await this.telegramApiClient.sendMessage({
        token: bot.token,
        chatId,
        text: "I can only process text messages",
      });

      if (!result.success) {
        console.error("Failed to send reply:", result.error);
        return Failure(result.error);
      }

      return Success(undefined);
    }

    const sessionId = `${botId}#${chatId}`;

    const recentMessages =
      await this.chatMessageRepository.findManyRecentBySessionId({
        userId,
        sessionId,
        limit: HISTORY_LIMIT,
      });

    const history: AgentMessage[] = recentMessages.map((message) => ({
      role: message.role === ChatMessageRole.USER ? "user" : "assistant",
      content: message.content,
    }));

    const insightResult = await this.insightService.call(userId, {
      question: text,
      history,
    });

    const replyText = insightResult.success
      ? insightResult.data.answer
      : insightResult.error.message || "Unknown error occurred";

    if (insightResult.success) {
      const now = new Date();
      const createdAt = now.toISOString();
      const expiresAt =
        Math.floor(now.getTime() / 1000) + MESSAGE_TTL_SECONDS;

      await this.chatMessageRepository.create({
        userId,
        sessionId,
        messageId: generateUlid() as Ulid,
        role: ChatMessageRole.USER,
        content: text,
        createdAt,
        expiresAt,
      });

      await this.chatMessageRepository.create({
        userId,
        sessionId,
        messageId: generateUlid() as Ulid,
        role: ChatMessageRole.ASSISTANT,
        content: insightResult.data.answer,
        createdAt,
        expiresAt,
      });
    }

    const result = await this.telegramApiClient.sendMessage({
      token: bot.token,
      chatId,
      text: replyText,
    });

    if (!result.success) {
      console.error("Failed to send reply:", result.error);
      return Failure(result.error);
    }

    return Success(undefined);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- src/services/process-telegram-message-service.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/process-telegram-message-service.ts backend/src/services/process-telegram-message-service.test.ts
git commit -m "add history support to ProcessTelegramMessageService"
```

---

## Task 9: Rename GraphQL types and add sessionId

**Prerequisite:** Track 1 has already added `askInsight(input: InsightInput!): InsightOutput!` to the `Mutation` type. This task renames the types to `AskInsight*` and adds `sessionId`.

**Files:**
- Modify: `backend/src/graphql/schema.graphql`
- Regenerate: `backend/src/__generated__/resolvers-types.ts`

- [ ] **Step 1: Update the mutation field signature**

In `backend/src/graphql/schema.graphql`, in `type Mutation`, replace:
```graphql
  askInsight(input: InsightInput!): InsightOutput!
```
with:
```graphql
  askInsight(input: AskInsightInput!): AskInsightOutput!
```

- [ ] **Step 2: Replace the old Insight types with AskInsight types**

Remove:
```graphql
union InsightOutput = InsightSuccess | InsightFailure

type InsightSuccess {
  answer: String!
  agentTrace: [AgentTraceMessage!]!
}

type InsightFailure {
  message: String!
  agentTrace: [AgentTraceMessage!]!
}
```
```graphql
input InsightInput {
  question: String!
}
```

Add in their place:
```graphql
union AskInsightOutput = AskInsightSuccess | AskInsightFailure

type AskInsightSuccess {
  answer: String!
  sessionId: ID!
  agentTrace: [AgentTraceMessage!]!
}

type AskInsightFailure {
  message: String!
  agentTrace: [AgentTraceMessage!]!
}

input AskInsightInput {
  question: String!
  sessionId: ID
}
```

- [ ] **Step 3: Run backend codegen**

```bash
cd backend && npm run codegen
```

Expected: Generates updated types in `backend/src/__generated__/resolvers-types.ts` with `MutationAskInsightArgs` typed to `AskInsightInput`. No errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/graphql/schema.graphql backend/src/__generated__/resolvers-types.ts
git commit -m "rename Insight types to AskInsight and add sessionId"
```

---

## Task 10: askInsight resolver and wiring

**Prerequisite:** Track 1 has already updated `insight-resolvers.ts` (it handles `Mutation.askInsight` using `context.insightService`) and updated `index.ts`. This task renames the file to `ask-insight-resolvers.ts` and switches the implementation to `InsightChatService`.

**Files:**
- Rename+Modify: `backend/src/graphql/resolvers/insight-resolvers.ts` → `ask-insight-resolvers.ts`
- Modify: `backend/src/graphql/resolvers/index.ts`
- Modify: `backend/src/graphql/context.ts`
- Modify: `backend/src/dependencies.ts`
- Modify: `backend/src/server.ts`

- [ ] **Step 1: Rename `insight-resolvers.ts` and replace its content**

```bash
git mv backend/src/graphql/resolvers/insight-resolvers.ts backend/src/graphql/resolvers/ask-insight-resolvers.ts
```

Then replace the entire content of `backend/src/graphql/resolvers/ask-insight-resolvers.ts`:

```typescript
import { MutationAskInsightArgs } from "../../__generated__/resolvers-types";
import { GraphQLContext } from "../context";
import { getAuthenticatedUser, handleResolverError } from "./shared";

export const askInsightResolvers = {
  Mutation: {
    askInsight: async (
      _parent: unknown,
      args: MutationAskInsightArgs,
      context: GraphQLContext,
    ) => {
      try {
        const user = await getAuthenticatedUser(context);

        const result = await context.insightChatService.call(user.id, {
          question: args.input.question,
          sessionId: args.input.sessionId ?? undefined,
        });

        if (!result.success) {
          return {
            __typename: "AskInsightFailure" as const,
            message: result.error.message,
            agentTrace: result.error.agentTrace,
          };
        }

        return {
          __typename: "AskInsightSuccess" as const,
          answer: result.data.answer,
          sessionId: result.data.sessionId,
          agentTrace: result.data.agentTrace,
        };
      } catch (error) {
        handleResolverError(error, "Failed to process insight message");
      }
    },
  },
};
```

- [ ] **Step 2: Update `resolvers/index.ts`**

Replace:
```typescript
import { insightResolvers } from "./insight-resolvers";
```
with:
```typescript
import { askInsightResolvers } from "./ask-insight-resolvers";
```

Replace `...insightResolvers.Mutation` with `...askInsightResolvers.Mutation` in the `Mutation` spread.

Add `AskInsightOutput` union resolver after `AgentTraceMessage`:

```typescript
  AskInsightOutput: {
    __resolveType(obj: { __typename?: string }) {
      return obj.__typename ?? null;
    },
  },
```

- [ ] **Step 3: Update `GraphQLContext`**

In `backend/src/graphql/context.ts`:

Add import:
```typescript
import { InsightChatService } from "../services/insight-chat-service";
```

Replace:
```typescript
  insightService: InsightService;
```
with:
```typescript
  insightChatService: InsightChatService;
```

Remove the `InsightService` import if it is no longer used in this file.

- [ ] **Step 4: Update `dependencies.ts`**

Add imports:
```typescript
import { DynChatMessageRepository } from "./repositories/dyn-chat-message-repository";
import { InsightChatService } from "./services/insight-chat-service";
import { ChatMessageRepository } from "./services/ports/chat-message-repository";
```

Add after the existing repository resolutions:
```typescript
export const resolveChatMessageRepository =
  createSingleton<ChatMessageRepository>(
    () => new DynChatMessageRepository(),
  );
```

Add after `resolveInsightService`:
```typescript
export const resolveInsightChatService = createSingleton(
  () =>
    new InsightChatService({
      insightService: resolveInsightService(),
      chatMessageRepository: resolveChatMessageRepository(),
    }),
);
```

Update `resolveProcessTelegramMessageService` to inject `chatMessageRepository`:
```typescript
export const resolveProcessTelegramMessageService = createSingleton(
  () =>
    new ProcessTelegramMessageService({
      insightService: resolveInsightService(),
      telegramApiClient: resolveTelegramApiClient(),
      telegramBotRepository: resolveTelegramBotRepository(),
      chatMessageRepository: resolveChatMessageRepository(),
    }),
);
```

- [ ] **Step 5: Update `server.ts`**

Replace the import of `resolveInsightService` with `resolveInsightChatService`:

Remove:
```typescript
  resolveInsightService,
```

Add:
```typescript
  resolveInsightChatService,
```

In `createContext`, replace:
```typescript
    insightService: resolveInsightService(),
```
with:
```typescript
    insightChatService: resolveInsightChatService(),
```

- [ ] **Step 6: Run typecheck**

```bash
cd backend && npm run typecheck
```

Expected: No errors. Fix any type errors before proceeding.

- [ ] **Step 7: Run full test suite**

```bash
cd backend && npm test
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/graphql/resolvers/ask-insight-resolvers.ts backend/src/graphql/resolvers/index.ts backend/src/graphql/context.ts backend/src/dependencies.ts backend/src/server.ts
git commit -m "wire askInsight resolver and InsightChatService into context"
```

---

## Task 11: CDK infrastructure

**Files:**
- Modify: `infra-cdk/lib/backend-cdk-stack.ts`

- [ ] **Step 1: Add `ChatMessagesTable`**

In `backend-cdk-stack.ts`, after the `telegramBotsTable` definition and before `functionConfig`, add:

```typescript
    const chatMessagesTable = new dynamodb.Table(this, "ChatMessagesTable", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: {
        name: "sessionMessageCombinedId",
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: "expiresAt",
      ...commonTableOptions,
    });
```

- [ ] **Step 2: Add env vars to `functionConfig`**

In the `environment` object inside `functionConfig`, add:

```typescript
        CHAT_HISTORY_MAX_MESSAGES: requireIntEnv("CHAT_HISTORY_MAX_MESSAGES").toString(),
        CHAT_MESSAGE_TTL_SECONDS: requireIntEnv("CHAT_MESSAGE_TTL_SECONDS").toString(),
        CHAT_MESSAGES_TABLE_NAME: chatMessagesTable.tableName,
```

- [ ] **Step 3: Grant read/write to Lambda functions**

After the existing `accountsTable.grantReadWriteData(backgroundJobFunction)` line, add:

```typescript
    chatMessagesTable.grantReadWriteData(backgroundJobFunction);
```

After the existing `accountsTable.grantReadWriteData(webFunction)` line, add:

```typescript
    chatMessagesTable.grantReadWriteData(webFunction);
```

- [ ] **Step 4: Run CDK typecheck**

```bash
cd infra-cdk && npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add infra-cdk/lib/backend-cdk-stack.ts
git commit -m "add ChatMessagesTable and env vars to CDK stack"
```

---

## Task 12: Frontend — add sessionId

**Prerequisite:** Track 1 has already added `ASK_INSIGHT` (using `InsightInput`/`InsightOutput` types) and updated `useInsight.ts` to use `useAskInsightMutation`. This task updates the mutation document to use the renamed `AskInsight*` types with `sessionId`, reruns codegen, and adds sessionId persistence to the composable.

**Files:**
- Modify: `frontend/src/graphql/mutations.ts`
- Regenerate: `frontend/src/schema.graphql`, `frontend/src/__generated__/vue-apollo.ts`
- Modify: `frontend/src/composables/useInsight.ts`

- [ ] **Step 1: Update `ASK_INSIGHT` mutation document**

In `frontend/src/graphql/mutations.ts`, replace the existing `ASK_INSIGHT` export:

```typescript
export const ASK_INSIGHT = gql`
  mutation AskInsight($input: AskInsightInput!) {
    askInsight(input: $input) {
      ... on AskInsightSuccess {
        answer
        sessionId
        agentTrace {
          ...AgentTraceFields
        }
      }
      ... on AskInsightFailure {
        message
        agentTrace {
          ...AgentTraceFields
        }
      }
    }
  }
  ${AGENT_TRACE_FRAGMENT}
`;
```

- [ ] **Step 2: Run frontend codegen**

```bash
cd frontend && npm run codegen:sync-schema && npm run codegen
```

Expected: Regenerates `frontend/src/schema.graphql` and `frontend/src/__generated__/vue-apollo.ts` with `useAskInsightMutation` using `AskInsightInput` input type and `AskInsightSuccess`/`AskInsightFailure` result types. No errors.

- [ ] **Step 3: Rewrite `useInsight.ts`**

Replace the entire content of `frontend/src/composables/useInsight.ts` with:

```typescript
import { ref, computed, watch } from "vue";
import { useAskInsightMutation } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const RESULT_STORAGE_KEY = "insight-last-result";
const SESSION_ID_STORAGE_KEY = "insight-session-id";

interface StoredInsightResult {
  answer?: string;
  agentTrace: AgentTraceMessage[];
}

const loadStoredResult = (): StoredInsightResult | null => {
  try {
    const stored = localStorage.getItem(RESULT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveStoredResult = (result: StoredInsightResult): void => {
  try {
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Fallback: agentTrace can be large; try storing without it
    try {
      localStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify({ ...result, agentTrace: [] }),
      );
    } catch (error) {
      console.error("Failed to persist insight result:", error);
    }
  }
};

const loadStoredSessionId = (): string | null => {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch {
    return null;
  }
};

const saveStoredSessionId = (sessionId: string): void => {
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    console.error("Failed to persist insight session ID:", sessionId);
  }
};

export function useInsight() {
  const stored = loadStoredResult();
  const storedAnswer = ref<string | null>(stored?.answer ?? null);
  const storedAgentTrace = ref<AgentTraceMessage[]>(
    stored?.agentTrace ?? [],
  );
  const sessionId = ref<string | null>(loadStoredSessionId());

  const {
    mutate: askInsightMutate,
    loading: insightLoading,
    error: insightMutationError,
    result: mutationResult,
  } = useAskInsightMutation();

  const fetchedAnswer = computed(() => {
    const askInsight = mutationResult.value?.askInsight;
    if (askInsight?.__typename === "AskInsightSuccess") return askInsight.answer;
    return null;
  });

  const fetchedAgentTrace = computed(
    () => mutationResult.value?.askInsight?.agentTrace ?? [],
  );

  const insightError = computed(() => {
    const askInsight = mutationResult.value?.askInsight;
    if (askInsight?.__typename === "AskInsightFailure") return askInsight.message;
    return insightMutationError.value?.message ?? null;
  });

  const insightAnswer = computed(
    () => fetchedAnswer.value ?? storedAnswer.value,
  );

  const insightAgentTrace = computed(() =>
    fetchedAnswer.value !== null
      ? fetchedAgentTrace.value
      : storedAgentTrace.value,
  );

  watch(
    () => mutationResult.value,
    (result) => {
      if (result?.askInsight) {
        const agentTrace = result.askInsight.agentTrace;
        const answer =
          result.askInsight.__typename === "AskInsightSuccess"
            ? result.askInsight.answer
            : undefined;
        const newSessionId =
          result.askInsight.__typename === "AskInsightSuccess"
            ? result.askInsight.sessionId
            : null;

        saveStoredResult({ answer, agentTrace });
        // Keep in sync so the fallback reflects the latest result if mutationResult goes null
        storedAnswer.value = answer ?? null;
        storedAgentTrace.value = agentTrace;

        if (newSessionId) {
          sessionId.value = newSessionId;
          saveStoredSessionId(newSessionId);
        }
      }
    },
  );

  const askQuestion = async (question: string): Promise<void> => {
    await askInsightMutate({
      input: {
        question,
        sessionId: sessionId.value,
      },
    });
  };

  return {
    askQuestion,
    insightAgentTrace,
    insightAnswer,
    insightError,
    insightLoading,
  };
}
```

- [ ] **Step 4: Run frontend typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: No errors. Fix any type issues before proceeding.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/graphql/mutations.ts frontend/src/schema.graphql frontend/src/composables/useInsight.ts frontend/src/__generated__/vue-apollo.ts
git commit -m "update frontend to use AskInsight types with session support"
```

---

## Task 13: Full validation

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && npm test
```

Expected: All tests PASS.

- [ ] **Step 2: Run backend typecheck and lint**

```bash
cd backend && npm run typecheck && npm run format
```

Expected: No errors.

- [ ] **Step 3: Run frontend typecheck and lint**

```bash
cd frontend && npm run typecheck && npm run format
```

Expected: No errors.

- [ ] **Step 4: Run CDK typecheck**

```bash
cd infra-cdk && npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Commit any lint fixes**

If any files were modified by formatting:

```bash
git add -A
git commit -m "fix lint and typecheck issues"
```
