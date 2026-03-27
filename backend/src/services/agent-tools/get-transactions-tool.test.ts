import { faker } from "@faker-js/faker";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/factories";
import { createMockTransactionRepository } from "../../utils/test-utils/mock-repositories";
import { TransactionRepository } from "../ports/transaction-repository";
import {
  MAX_PERIOD_DAYS,
  createGetTransactionsTool,
} from "./get-transactions-tool";

describe("createGetTransactionsTool", () => {
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("should return tool with correct name", () => {
    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    expect(tool.name).toBe("getTransactions");
  });

  it("should reject when startDate is after endDate", async () => {
    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-20",
      endDate: "2000-01-10",
    });

    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "startDate must not be after endDate",
    });
  });

  it("should reject when date range exceeds max period days", async () => {
    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-01",
      endDate: "2001-01-02",
    });

    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
    });
  });

  it("should filter by date range and return transactions as JSON", async () => {
    const transactions = [fakeTransaction()];
    mockTransactionRepository.findManyActiveByUserId.mockResolvedValue(
      transactions,
    );

    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-01",
      endDate: "2000-01-31",
    });

    expect(result.success).toBe(true);
    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).toHaveBeenCalledWith(userId, {
      dateAfter: "2000-01-01",
      dateBefore: "2000-01-31",
    });
  });

  it("should return required fields only", async () => {
    const transactions = [
      fakeTransaction({
        id: "transaction1",
        accountId: "account1",
        categoryId: "category1",
        type: TransactionType.EXPENSE,
        amount: 50,
        currency: "USD",
        date: toDateString("2024-01-15"),
        description: "Grocery shopping",
      }),
      fakeTransaction({
        id: "transaction2",
        accountId: "account2",
        categoryId: "category2",
        type: TransactionType.INCOME,
        amount: 1000,
        currency: "USD",
        date: toDateString("2024-01-20"),
        description: "Salary",
      }),
    ];
    mockTransactionRepository.findManyActiveByUserId.mockResolvedValue(
      transactions,
    );

    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    });

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: "transaction1",
          accountId: "account1",
          categoryId: "category1",
          type: TransactionType.EXPENSE,
          amount: 50,
          currency: "USD",
          date: toDateString("2024-01-15"),
          description: "Grocery shopping",
          transferId: undefined,
        },
        {
          id: "transaction2",
          accountId: "account2",
          categoryId: "category2",
          type: TransactionType.INCOME,
          amount: 1000,
          currency: "USD",
          date: toDateString("2024-01-20"),
          description: "Salary",
          transferId: undefined,
        },
      ],
    });
  });

  it("should filter by accountId", async () => {
    const accountId = faker.string.uuid();
    mockTransactionRepository.findManyActiveByUserId.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      accountId,
    });

    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).toHaveBeenCalledWith(userId, {
      dateAfter: "2000-01-10",
      dateBefore: "2000-01-20",
      accountIds: [accountId],
    });
  });

  it("should filter by categoryId", async () => {
    const categoryId = faker.string.uuid();
    mockTransactionRepository.findManyActiveByUserId.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      categoryId,
    });

    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).toHaveBeenCalledWith(userId, {
      dateAfter: "2000-01-10",
      dateBefore: "2000-01-20",
      categoryIds: [categoryId],
    });
  });

  it("should filter by both accountId and categoryId", async () => {
    const accountId = faker.string.uuid();
    const categoryId = faker.string.uuid();
    mockTransactionRepository.findManyActiveByUserId.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      accountId,
      categoryId,
    });

    expect(
      mockTransactionRepository.findManyActiveByUserId,
    ).toHaveBeenCalledWith(userId, {
      dateAfter: "2000-01-10",
      dateBefore: "2000-01-20",
      categoryIds: [categoryId],
      accountIds: [accountId],
    });
  });
});
