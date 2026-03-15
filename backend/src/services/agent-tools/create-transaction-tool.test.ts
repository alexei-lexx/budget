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
  let mockTransactionService: {
    createTransaction: jest.Mock;
  };
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockTransactionService = {
      createTransaction: jest.fn(),
    };
  });

  it("should return tool with correct name", () => {
    const tool = createCreateTransactionTool(
      mockTransactionService as unknown as TransactionService,
      userId,
    );

    expect(tool.name).toBe("createTransaction");
  });

  it("should call createTransaction with correct input and return created transaction as JSON string", async () => {
    const created = fakeTransaction();
    mockTransactionService.createTransaction.mockResolvedValue(created);

    const tool = createCreateTransactionTool(
      mockTransactionService as unknown as TransactionService,
      userId,
    );

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
});
