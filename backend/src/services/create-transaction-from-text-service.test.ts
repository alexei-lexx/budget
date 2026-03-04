import { faker } from "@faker-js/faker";
import { IAccountRepository } from "../models/account";
import { type Agent, ToolSignature } from "../models/agent";
import { ICategoryRepository } from "../models/category";
import {
  ITransactionRepository,
  Transaction,
  TransactionType,
} from "../models/transaction";
import { toDateString } from "../types/date";
import {
  createMockAccountRepository,
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../utils/test-utils/mock-repositories";
import { AgentDataService } from "./agent-data-service";
import { BusinessError, BusinessErrorCodes } from "./business-error";
import { CreateTransactionFromTextService } from "./create-transaction-from-text-service";
import { TransactionService } from "./transaction-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createMockAgent = (): jest.Mocked<Agent> => ({
  call: jest.fn(),
});

const createMockTransactionService = (): jest.Mocked<
  Pick<TransactionService, "createTransaction" | "getTransactionById">
> => ({
  createTransaction: jest.fn(),
  getTransactionById: jest.fn(),
});

const buildTransaction = (
  overrides: Partial<Transaction> = {},
): Transaction => ({
  id: faker.string.uuid(),
  userId: faker.string.uuid(),
  accountId: faker.string.uuid(),
  type: TransactionType.EXPENSE,
  amount: 45,
  currency: "EUR",
  date: toDateString("2026-03-04"),
  isArchived: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const agentAnswerWithId = (id: string) =>
  JSON.stringify({ transaction: { id } });

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("CreateTransactionFromTextService", () => {
  let service: CreateTransactionFromTextService;
  let userId: string;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;
  let mockAccountRepository: jest.Mocked<IAccountRepository>;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockAgent: jest.Mocked<Agent>;
  let mockTransactionService: jest.Mocked<
    Pick<TransactionService, "createTransaction" | "getTransactionById">
  >;
  let agentDataService: AgentDataService;

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
    mockAccountRepository = createMockAccountRepository();
    mockCategoryRepository = createMockCategoryRepository();
    mockAgent = createMockAgent();
    mockTransactionService = createMockTransactionService();

    agentDataService = new AgentDataService(
      mockAccountRepository,
      mockCategoryRepository,
      mockTransactionRepository,
    );

    service = new CreateTransactionFromTextService(
      agentDataService,
      mockAgent,
      mockTransactionService as unknown as TransactionService,
    );

    userId = faker.string.uuid();

    jest.clearAllMocks();
  });

  // ─── Input validation ───────────────────────────────────────────────────

  describe("validation", () => {
    it("should throw when userId is empty", async () => {
      const promise = service.call("", "spent 45 euro at rewe yesterday");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "User ID is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should throw when text is empty", async () => {
      const promise = service.call(userId, "");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Text is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });

    it("should throw when text is only whitespace", async () => {
      const promise = service.call(userId, "   ");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "Text is required",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockAgent.call).not.toHaveBeenCalled();
    });
  });

  // ─── US1: Expense creation happy path ──────────────────────────────────

  describe("US1 — expense creation happy path", () => {
    it("should return the fetched transaction when agent returns a valid id", async () => {
      // Arrange
      const txId = faker.string.uuid();
      const transaction = buildTransaction({
        id: txId,
        type: TransactionType.EXPENSE,
        amount: 45,
      });

      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(transaction);

      // Act
      const result = await service.call(
        userId,
        "spent 45 euro at rewe yesterday",
      );

      // Assert — correct transaction fetched and returned
      expect(mockTransactionService.getTransactionById).toHaveBeenCalledWith(
        txId,
        userId,
      );
      expect(result).toBe(transaction);
    });

    it("should pass trimmled text as user message to agent", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      // Act
      await service.call(userId, "  20  ");

      // Assert — text trimmed
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.messages[0].content).toBe("20");
    });

    it("should include all required tools in agent call", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      // Act
      await service.call(userId, "spent 45 euro at rewe yesterday");

      // Assert — all four tools present
      const callArgs = mockAgent.call.mock.calls[0][0];
      const toolNames =
        callArgs.tools?.map((t: ToolSignature<unknown>) => t.name) ?? [];
      expect(toolNames).toContain("getAccounts");
      expect(toolNames).toContain("getCategories");
      expect(toolNames).toContain("getTransactions");
      expect(toolNames).toContain("createTransaction");
    });

    it("should include today's date in system prompt", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      // Act
      await service.call(userId, "spent 45 euro at rewe yesterday");

      // Assert — system prompt contains today's date
      const callArgs = mockAgent.call.mock.calls[0][0];
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      expect(callArgs.systemPrompt).toContain(today);
    });

    it("should propagate error when agent call fails", async () => {
      // Arrange
      mockAgent.call.mockRejectedValue(new Error("Bedrock unavailable"));

      // Act & Assert
      await expect(
        service.call(userId, "spent 45 euro at rewe yesterday"),
      ).rejects.toThrow("Bedrock unavailable");
    });

    describe("createTransaction tool", () => {
      it("should call transactionService.createTransaction with the correct fields", async () => {
        // Arrange — call the service and capture tools
        const txId = faker.string.uuid();
        const createdTx = buildTransaction({
          id: txId,
          type: TransactionType.EXPENSE,
          amount: 45,
        });

        mockTransactionService.createTransaction.mockResolvedValue(createdTx);
        mockTransactionService.getTransactionById.mockResolvedValue(createdTx);

        // Save tools before resolving the agent call
        let capturedTools: ToolSignature<unknown>[] = [];
        mockAgent.call.mockImplementation(async (params) => {
          capturedTools = [...(params.tools ?? [])];
          // Invoke the createTransaction tool as if the agent did
          const createTool = capturedTools.find(
            (t) => t.name === "createTransaction",
          );
          await createTool?.func({
            type: TransactionType.EXPENSE,
            amount: 45,
            accountId: "acc-1",
            date: "2026-03-03",
            description: "rewe",
          });
          return { answer: agentAnswerWithId(txId) };
        });

        // Act
        await service.call(userId, "spent 45 euro at rewe yesterday");

        // Assert — tool forwarded correct fields to transactionService
        expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            type: TransactionType.EXPENSE,
            amount: 45,
            accountId: "acc-1",
            date: "2026-03-03",
            description: "rewe",
          }),
          userId,
        );
      });

      it("should return JSON-stringified created transaction from tool", async () => {
        // Arrange
        const txId = faker.string.uuid();
        const createdTx = buildTransaction({
          id: txId,
          type: TransactionType.EXPENSE,
        });

        mockTransactionService.createTransaction.mockResolvedValue(createdTx);
        mockTransactionService.getTransactionById.mockResolvedValue(createdTx);

        let toolOutput = "";
        mockAgent.call.mockImplementation(async (params) => {
          const createTool = (params.tools ?? []).find(
            (t) => t.name === "createTransaction",
          );
          toolOutput = (await createTool?.func({
            type: TransactionType.EXPENSE,
            amount: 45,
            accountId: "acc-1",
            date: "2026-03-04",
          })) as string;
          return { answer: agentAnswerWithId(txId) };
        });

        // Act
        await service.call(userId, "spent 45 euro at rewe");

        // Assert — tool output is JSON-stringified transaction
        const parsed: unknown = JSON.parse(toolOutput);
        expect(parsed).toMatchObject({ id: txId });
      });
    });
  });

  // ─── US2: Income classification ────────────────────────────────────────

  describe("US2 — income scenario", () => {
    it("should pass income keywords context via createTransaction tool with type INCOME", async () => {
      // Arrange
      const txId = faker.string.uuid();
      const incomeTx = buildTransaction({
        id: txId,
        type: TransactionType.INCOME,
        amount: 4500,
      });

      mockTransactionService.createTransaction.mockResolvedValue(incomeTx);
      mockTransactionService.getTransactionById.mockResolvedValue(incomeTx);

      mockAgent.call.mockImplementation(async (params) => {
        const createTool = (params.tools ?? []).find(
          (t) => t.name === "createTransaction",
        );
        // Simulate agent calling tool with INCOME type
        await createTool?.func({
          type: TransactionType.INCOME,
          amount: 4500,
          accountId: "acc-pln",
          date: "2026-03-04",
          description: "salary",
        });
        return { answer: agentAnswerWithId(txId) };
      });

      // Act
      const result = await service.call(userId, "received salary 4500 PLN");

      // Assert
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.INCOME, amount: 4500 }),
        userId,
      );
      expect(result).toBe(incomeTx);
    });

    it("should include INCOME type indicators in system prompt", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      // Act
      await service.call(userId, "received salary 4500 PLN");

      // Assert — system prompt mentions INCOME keywords
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("INCOME");
      expect(callArgs.systemPrompt).toMatch(/salary/i);
      expect(callArgs.systemPrompt).toMatch(/earned?/i);
      expect(callArgs.systemPrompt).toMatch(/received/i);
    });

    it("createTransaction tool should accept INCOME type", async () => {
      // Arrange
      const txId = faker.string.uuid();
      const incomeTx = buildTransaction({
        id: txId,
        type: TransactionType.INCOME,
      });
      mockTransactionService.createTransaction.mockResolvedValue(incomeTx);
      mockTransactionService.getTransactionById.mockResolvedValue(incomeTx);

      mockAgent.call.mockImplementation(async (params) => {
        const createTool = (params.tools ?? []).find(
          (t) => t.name === "createTransaction",
        );
        await createTool?.func({
          type: TransactionType.INCOME,
          amount: 4500,
          accountId: "acc-1",
          date: "2026-03-04",
        });
        return { answer: agentAnswerWithId(txId) };
      });

      // Act & Assert — no error thrown
      await expect(service.call(userId, "earned 4500")).resolves.toBe(incomeTx);
    });
  });

  // ─── US3: Refund scenario ───────────────────────────────────────────────

  describe("US3 — refund scenario", () => {
    it("should allow createTransaction tool to be called with type REFUND", async () => {
      // Arrange
      const txId = faker.string.uuid();
      const refundTx = buildTransaction({
        id: txId,
        type: TransactionType.REFUND,
        amount: 29.99,
      });

      mockTransactionService.createTransaction.mockResolvedValue(refundTx);
      mockTransactionService.getTransactionById.mockResolvedValue(refundTx);

      mockAgent.call.mockImplementation(async (params) => {
        const createTool = (params.tools ?? []).find(
          (t) => t.name === "createTransaction",
        );
        await createTool?.func({
          type: TransactionType.REFUND,
          amount: 29.99,
          accountId: "acc-1",
          date: "2026-03-04",
          description: "zalando",
        });
        return { answer: agentAnswerWithId(txId) };
      });

      // Act
      const result = await service.call(
        userId,
        "got a refund from zalando 29.99",
      );

      // Assert
      expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.REFUND,
          amount: 29.99,
        }),
        userId,
      );
      expect(result).toBe(refundTx);
    });

    it("should include REFUND type indicator in system prompt", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockAgent.call.mockResolvedValue({ answer: agentAnswerWithId(txId) });
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      // Act
      await service.call(userId, "got a refund from zalando 29.99");

      // Assert — system prompt mentions REFUND
      const callArgs = mockAgent.call.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain("REFUND");
      expect(callArgs.systemPrompt).toMatch(/refund/i);
    });
  });

  // ─── US4: Error paths ───────────────────────────────────────────────────

  describe("US4 — error paths", () => {
    it("should throw BusinessError when agent returns plain-text (no JSON)", async () => {
      // Arrange — agent did not call createTransaction, returns explanation
      mockAgent.call.mockResolvedValue({
        answer: "I could not determine the amount from the text.",
      });

      // Act & Assert
      const promise = service.call(userId, "bought something");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        message: "I could not determine the amount from the text.",
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw BusinessError when agent returns JSON without transaction.id", async () => {
      // Arrange — malformed answer (missing id)
      mockAgent.call.mockResolvedValue({
        answer: JSON.stringify({ transaction: {} }),
      });

      // Act & Assert
      const promise = service.call(userId, "bought something");

      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
      expect(mockTransactionService.getTransactionById).not.toHaveBeenCalled();
    });

    it("should throw BusinessError when agent returns empty JSON object", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({ answer: "{}" });

      // Act & Assert
      await expect(service.call(userId, "bought something")).rejects.toThrow(
        BusinessError,
      );
    });

    it("should throw BusinessError when agent returns answer without transaction field", async () => {
      // Arrange
      mockAgent.call.mockResolvedValue({
        answer: JSON.stringify({ error: "Could not determine amount" }),
      });

      // Act & Assert
      await expect(service.call(userId, "bought something")).rejects.toThrow(
        BusinessError,
      );
    });

    it("should throw BusinessError when agent returns empty string answer", async () => {
      // Arrange — empty response
      mockAgent.call.mockResolvedValue({ answer: "" });

      // Act & Assert
      const promise = service.call(userId, "bought something");
      await expect(promise).rejects.toThrow(BusinessError);
      await expect(promise).rejects.toMatchObject({
        code: BusinessErrorCodes.EMPTY_RESPONSE,
      });
    });

    it("should reject createTransaction tool input with non-positive amount", async () => {
      // Arrange
      const txId = faker.string.uuid();
      mockTransactionService.getTransactionById.mockResolvedValue(
        buildTransaction({ id: txId }),
      );

      let toolError: Error | undefined;
      mockAgent.call.mockImplementation(async (params) => {
        const createTool = (params.tools ?? []).find(
          (t) => t.name === "createTransaction",
        );
        try {
          await createTool?.func({
            type: TransactionType.EXPENSE,
            amount: -10, // invalid
            accountId: "acc-1",
            date: "2026-03-04",
          });
        } catch (e) {
          if (e instanceof Error) toolError = e;
        }
        return { answer: agentAnswerWithId(txId) };
      });

      // Act
      await service.call(userId, "something negative");

      // Assert — Zod validation caught non-positive amount
      expect(toolError).toBeDefined();
    });
  });
});
