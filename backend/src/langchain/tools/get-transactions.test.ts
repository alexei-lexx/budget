import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../../models/transaction";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { MAX_PERIOD_DAYS, createGetTransactionsTool } from "./get-transactions";

describe("createGetTransactionsTool", () => {
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("should return tool with correct name", () => {
    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    expect(transactionsTool.name).toBe("get_transactions");
  });

  it("should throw when userId in context is not a valid UUID", async () => {
    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await expect(
      transactionsTool.invoke(
        { startDate: "2000-01-01", endDate: "2000-01-31" },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  it("should reject when startDate is after endDate", async () => {
    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await transactionsTool.invoke(
      { startDate: "2000-01-20", endDate: "2000-01-10" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: "startDate must not be after endDate",
    });
  });

  it("should reject when date range exceeds max period days", async () => {
    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await transactionsTool.invoke(
      { startDate: "2000-01-01", endDate: "2001-01-02" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
    });
  });

  it("should filter by date range and return transactions as JSON", async () => {
    const transactions = [fakeTransaction()];
    mockTransactionRepository.findManyByUserId.mockResolvedValue(transactions);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    const result = await transactionsTool.invoke(
      { startDate: "2000-01-01", endDate: "2000-01-31" },
      { context: { userId } },
    );

    expect(result.success).toBe(true);
    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-01"),
        dateBefore: toDateString("2000-01-31"),
      },
    );
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
    mockTransactionRepository.findManyByUserId.mockResolvedValue(transactions);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });
    const result = await transactionsTool.invoke(
      { startDate: "2024-01-01", endDate: "2024-01-31" },
      { context: { userId } },
    );

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

  it("should filter by accountIds", async () => {
    const accountId = faker.string.uuid();
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await transactionsTool.invoke(
      {
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        accountIds: [accountId],
      },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
        accountIds: [accountId],
      },
    );
  });

  it("should filter by categoryIds", async () => {
    const categoryId = faker.string.uuid();
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await transactionsTool.invoke(
      {
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        categoryIds: [categoryId],
      },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
        categoryIds: [categoryId],
      },
    );
  });

  it("should filter by types", async () => {
    const types = [TransactionType.EXPENSE, TransactionType.INCOME];
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await transactionsTool.invoke(
      { startDate: "2000-01-10", endDate: "2000-01-20", types },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
        types,
      },
    );
  });

  it("should filter by accountIds, categoryIds, and types", async () => {
    const accountId = faker.string.uuid();
    const categoryId = faker.string.uuid();
    const types = [TransactionType.EXPENSE, TransactionType.INCOME];
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await transactionsTool.invoke(
      {
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        accountIds: [accountId],
        categoryIds: [categoryId],
        types,
      },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
        categoryIds: [categoryId],
        accountIds: [accountId],
        types,
      },
    );
  });
});
