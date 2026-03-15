import { faker } from "@faker-js/faker";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/factories";
import { TransactionService } from "../transaction-service";
import {
  CreateTransactionToolInput,
  createCreateTransactionTool,
} from "./create-transaction-tool";

describe("createCreateTransactionTool", () => {
  let mockTransactionService: jest.Mocked<TransactionService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionService = {
      createTransaction: jest.fn(),
    } as unknown as jest.Mocked<TransactionService>;
  });

  it("should return tool with correct name", () => {
    const tool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    expect(tool.name).toBe("createTransaction");
  });

  it("should call createTransaction with correct input and return created transaction as JSON string", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const tool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    const input: CreateTransactionToolInput = {
      accountId: faker.string.uuid(),
      amount: 123.45,
      categoryId: faker.string.uuid(),
      date: toDateString("2000-01-15"),
      description: "Some description",
      type: TransactionType.EXPENSE,
    };

    const result = await tool.func(input);

    expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
      input,
      userId,
    );

    expect(result).toEqual(
      JSON.stringify({
        accountId: created.accountId,
        amount: created.amount,
        categoryId: created.categoryId,
        currency: created.currency,
        date: created.date,
        description: created.description,
        id: created.id,
        type: created.type,
      }),
    );
  });

  it("should return error string when maxCreations limit is already reached", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const tool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    const input: CreateTransactionToolInput = {
      accountId: faker.string.uuid(),
      amount: 50,
      date: toDateString("2000-01-15"),
      type: TransactionType.EXPENSE,
    };

    const result1 = await tool.func(input);
    expect(result1).not.toMatch(/error/i);

    const result2 = await tool.func(input);
    expect(result2).toMatch(/error/i);

    expect(mockTransactionService.createTransaction).toHaveBeenCalledTimes(1);
  });

  it("should not count a failed attempt toward the limit", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction
      .mockRejectedValueOnce(new Error("service error"))
      .mockResolvedValueOnce(created);

    const tool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    const input: CreateTransactionToolInput = {
      accountId: faker.string.uuid(),
      amount: 50,
      date: toDateString("2000-01-15"),
      type: TransactionType.EXPENSE,
    };

    await expect(tool.func(input)).rejects.toThrow("service error");
    const result = await tool.func(input);

    expect(result).toEqual(
      JSON.stringify({
        accountId: created.accountId,
        amount: created.amount,
        categoryId: created.categoryId,
        currency: created.currency,
        date: created.date,
        description: created.description,
        id: created.id,
        type: created.type,
      }),
    );
  });

  it("should allow up to maxCreations successful calls and reject the next", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const tool = createCreateTransactionTool({
      transactionService:
        mockTransactionService as unknown as TransactionService,
      userId,
      maxCreations: 2,
    });

    const input: CreateTransactionToolInput = {
      accountId: faker.string.uuid(),
      amount: 50,
      date: toDateString("2000-01-15"),
      type: TransactionType.EXPENSE,
    };

    await tool.func(input);
    await tool.func(input);
    const result = await tool.func(input);

    expect(result).toMatch(/error/i);
    expect(mockTransactionService.createTransaction).toHaveBeenCalledTimes(2);
  });
});
