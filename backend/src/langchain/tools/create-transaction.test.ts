import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionType } from "../../models/transaction";
import { TransactionService } from "../../services/transaction-service";
import { toDateString } from "../../types/date";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import {
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

  it("should return tool with correct name", () => {
    const createTool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    expect(createTool.name).toBe("createTransaction");
  });

  it("should call createTransaction with correct input and return created transaction", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const createTool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    const input: CreateTransactionInput = {
      accountId: faker.string.uuid(),
      amount: 123.45,
      categoryId: faker.string.uuid(),
      date: toDateString("2000-01-15"),
      description: "Some description",
      type: TransactionType.EXPENSE,
    };

    const result = await createTool.invoke(input);

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

  it("should return failure when creation limit is reached", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const createTool = createCreateTransactionTool({
      maxCreations: 1,
      transactionService: mockTransactionService,
      userId,
    });

    const input: CreateTransactionInput = {
      accountId: faker.string.uuid(),
      amount: 10,
      date: toDateString("2000-01-15"),
      type: TransactionType.EXPENSE,
    };

    await createTool.invoke(input);
    const result = await createTool.invoke(input);

    expect(result).toEqual({
      success: false,
      error: "Error: transaction creation limit reached (1 transactions)",
    });
    expect(mockTransactionService.createTransaction).toHaveBeenCalledTimes(1);
  });
});
