import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { TransactionRepository } from "../../ports/transaction-repository";
import { toDateString } from "../../types/date";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createGetTransactionsTool } from "./get-transactions";

describe("createGetTransactionsTool", () => {
  let mockTransactionRepository: Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("returns tool with correct name", () => {
    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    expect(transactionsTool.name).toBe("get_transactions");
  });

  it("throws when userId in context is not valid UUID", async () => {
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

  it("converts input dates and wires them through to the shared handler", async () => {
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const transactionsTool = createGetTransactionsTool({
      transactionRepository: mockTransactionRepository,
    });

    await transactionsTool.invoke(
      { startDate: "2000-01-10", endDate: "2000-01-20" },
      { context: { userId } },
    );

    expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledWith(
      userId,
      {
        dateAfter: toDateString("2000-01-10"),
        dateBefore: toDateString("2000-01-20"),
      },
    );
  });
});
