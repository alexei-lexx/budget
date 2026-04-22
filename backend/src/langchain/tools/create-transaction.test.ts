import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../../models/transaction";
import { TransactionService } from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import {
  CREATE_TRANSACTION_TOOL_NAME,
  CreateTransactionInput,
  createCreateTransactionTool,
} from "./create-transaction";

describe("createCreateTransactionTool", () => {
  let mockTransactionService: jest.Mocked<TransactionService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionService = {
      createTransaction: jest.fn(),
    } as unknown as jest.Mocked<TransactionService>;
  });

  it("returns tool with correct name", () => {
    const createTool = createCreateTransactionTool({
      transactionService: mockTransactionService,
    });

    expect(createTool.name).toBe(CREATE_TRANSACTION_TOOL_NAME);
  });

  it("throws when userId in context is not a valid UUID", async () => {
    const createTool = createCreateTransactionTool({
      transactionService: mockTransactionService,
    });

    const input: CreateTransactionInput = {
      accountId: faker.string.uuid(),
      amount: 10,
      date: toDateString("2000-01-15"),
      type: TransactionType.EXPENSE,
    };

    await expect(
      createTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();
  });

  it("calls createTransaction with correct input and returns created transaction", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const createTool = createCreateTransactionTool({
      transactionService: mockTransactionService,
    });

    const input: CreateTransactionInput = {
      accountId: faker.string.uuid(),
      amount: 123.45,
      categoryId: faker.string.uuid(),
      date: toDateString("2000-01-15"),
      description: "Some description",
      type: TransactionType.EXPENSE,
    };

    const result = await createTool.invoke(input, { context: { userId } });

    expect(mockTransactionService.createTransaction).toHaveBeenCalledWith(
      input,
      userId,
    );
    expect(result).toEqual({
      success: true,
      data: {
        id: created.id,
        accountId: created.accountId,
        amount: created.amount,
        categoryId: created.categoryId,
        currency: created.currency,
        date: created.date,
        description: created.description,
        type: created.type,
      },
    });
  });
});
