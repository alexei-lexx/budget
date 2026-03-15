import { faker } from "@faker-js/faker";
import { fakeTransaction } from "../../utils/test-utils/factories";
import { createMockAgentDataService } from "../../utils/test-utils/mock-services";
import { type IAgentDataService } from "../agent-data-service";
import {
  MAX_PERIOD_DAYS,
  createGetTransactionsTool,
} from "./get-transactions-tool";

describe("createGetTransactionsTool", () => {
  let mockAgentDataService: jest.Mocked<IAgentDataService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAgentDataService = createMockAgentDataService();
  });

  it("should return tool with correct name", () => {
    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    expect(tool.name).toBe("getTransactions");
  });

  it("should reject when startDate is after endDate", async () => {
    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-20",
      endDate: "2000-01-10",
    });

    expect(mockAgentDataService.getFilteredTransactions).not.toHaveBeenCalled();
    expect(result).toBe(
      JSON.stringify({ error: "startDate must not be after endDate" }),
    );
  });

  it("should reject when date range exceeds max period days", async () => {
    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-01",
      endDate: "2001-01-02",
    });

    expect(mockAgentDataService.getFilteredTransactions).not.toHaveBeenCalled();
    expect(result).toBe(
      JSON.stringify({
        error: `Date range must not exceed ${MAX_PERIOD_DAYS} days`,
      }),
    );
  });

  it("should filter by date range and return transactions", async () => {
    const transactions = [fakeTransaction()];
    const transactionsData = transactions.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.date,
      description: transaction.description,
      transferId: transaction.transferId,
    }));
    mockAgentDataService.getFilteredTransactions.mockResolvedValue(
      transactionsData,
    );

    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    const result = await tool.func({
      startDate: "2000-01-01",
      endDate: "2000-01-31",
    });

    expect(result).toBe(JSON.stringify(transactionsData));
    expect(mockAgentDataService.getFilteredTransactions).toHaveBeenCalledWith(
      userId,
      "2000-01-01",
      "2000-01-31",
      undefined,
      undefined,
    );
  });

  it("should filter by accountId", async () => {
    const accountId = faker.string.uuid();
    mockAgentDataService.getFilteredTransactions.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      accountId,
    });

    expect(mockAgentDataService.getFilteredTransactions).toHaveBeenCalledWith(
      userId,
      "2000-01-10",
      "2000-01-20",
      undefined,
      accountId,
    );
  });

  it("should filter by categoryId", async () => {
    const categoryId = faker.string.uuid();
    mockAgentDataService.getFilteredTransactions.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      categoryId,
    });

    expect(mockAgentDataService.getFilteredTransactions).toHaveBeenCalledWith(
      userId,
      "2000-01-10",
      "2000-01-20",
      categoryId,
      undefined,
    );
  });

  it("should filter by both accountId and categoryId", async () => {
    const accountId = faker.string.uuid();
    const categoryId = faker.string.uuid();
    mockAgentDataService.getFilteredTransactions.mockResolvedValue([]);

    const tool = createGetTransactionsTool({
      agentDataService: mockAgentDataService,
      userId,
    });

    await tool.func({
      startDate: "2000-01-10",
      endDate: "2000-01-20",
      accountId,
      categoryId,
    });

    expect(mockAgentDataService.getFilteredTransactions).toHaveBeenCalledWith(
      userId,
      "2000-01-10",
      "2000-01-20",
      categoryId,
      accountId,
    );
  });
});
