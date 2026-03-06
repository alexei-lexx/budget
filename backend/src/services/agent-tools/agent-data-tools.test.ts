import { faker } from "@faker-js/faker";
import { TransactionType } from "../../models/transaction";
import { toDateString } from "../../types/date";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
} from "../../utils/test-utils/factories";
import { AgentDataService, EntityScope } from "../agent-data-service";
import { TransactionService } from "../transaction-service";
import {
  CreateTransactionToolInput,
  MAX_PERIOD_DAYS,
  createCreateTransactionTool,
  createGetAccountsTool,
  createGetCategoriesTool,
  createGetTransactionsTool,
} from "./agent-data-tools";

describe("agent-data-tools", () => {
  let mockAgentDataService: {
    getAccounts: jest.Mock;
    getCategories: jest.Mock;
    getFilteredTransactions: jest.Mock;
  };
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAgentDataService = {
      getAccounts: jest.fn(),
      getCategories: jest.fn(),
      getFilteredTransactions: jest.fn(),
    };
  });

  describe("createGetAccountsTool", () => {
    it("should return tool with correct name", () => {
      const tool = createGetAccountsTool(
        mockAgentDataService as unknown as AgentDataService,
        userId,
      );

      expect(tool.name).toBe("getAccounts");
    });

    it("should return accounts as JSON string", async () => {
      const accounts = [fakeAccount(), fakeAccount()];
      const accountsData = accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        isArchived: account.isArchived,
      }));
      mockAgentDataService.getAccounts.mockResolvedValue(accountsData);

      const tool = createGetAccountsTool(
        mockAgentDataService as unknown as AgentDataService,
        userId,
      );
      const scope = faker.helpers.arrayElement([
        EntityScope.ACTIVE,
        EntityScope.ARCHIVED,
        EntityScope.ALL,
      ]);
      const result = await tool.func({ scope });

      expect(result).toBe(JSON.stringify(accountsData));
      expect(mockAgentDataService.getAccounts).toHaveBeenCalledWith(
        userId,
        scope,
      );
    });
  });

  describe("createGetCategoriesTool", () => {
    it("should return tool with correct name", () => {
      const tool = createGetCategoriesTool(
        mockAgentDataService as unknown as AgentDataService,
        userId,
      );

      expect(tool.name).toBe("getCategories");
    });

    it("should return categories as JSON string", async () => {
      const categories = [fakeCategory(), fakeCategory()];
      const categoriesData = categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        isArchived: cat.isArchived,
      }));
      mockAgentDataService.getCategories.mockResolvedValue(categoriesData);

      const tool = createGetCategoriesTool(
        mockAgentDataService as unknown as AgentDataService,
        userId,
      );
      const scope = faker.helpers.arrayElement([
        EntityScope.ACTIVE,
        EntityScope.ARCHIVED,
        EntityScope.ALL,
      ]);
      const result = await tool.func({ scope });

      expect(result).toBe(JSON.stringify(categoriesData));
      expect(mockAgentDataService.getCategories).toHaveBeenCalledWith(
        userId,
        scope,
      );
    });
  });

  describe("createGetTransactionsTool", () => {
    it("should return tool with correct name", () => {
      const tool = createGetTransactionsTool({
        agentDataService: mockAgentDataService as unknown as AgentDataService,
        userId,
      });

      expect(tool.name).toBe("getTransactions");
    });

    it("should reject when startDate is after endDate", async () => {
      const tool = createGetTransactionsTool({
        agentDataService: mockAgentDataService as unknown as AgentDataService,
        userId,
      });

      const result = await tool.func({
        startDate: "2000-01-20",
        endDate: "2000-01-10",
      });

      expect(
        mockAgentDataService.getFilteredTransactions,
      ).not.toHaveBeenCalled();
      expect(result).toBe(
        JSON.stringify({ error: "startDate must not be after endDate" }),
      );
    });

    it("should reject when date range exceeds max period days", async () => {
      const tool = createGetTransactionsTool({
        agentDataService: mockAgentDataService as unknown as AgentDataService,
        userId,
      });

      const result = await tool.func({
        startDate: "2000-01-01",
        endDate: "2001-01-02",
      });

      expect(
        mockAgentDataService.getFilteredTransactions,
      ).not.toHaveBeenCalled();
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
        agentDataService: mockAgentDataService as unknown as AgentDataService,
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
        agentDataService: mockAgentDataService as unknown as AgentDataService,
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
        agentDataService: mockAgentDataService as unknown as AgentDataService,
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
        agentDataService: mockAgentDataService as unknown as AgentDataService,
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

  describe("createCreateTransactionTool", () => {
    let mockTransactionService: {
      createTransaction: jest.Mock;
    };

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
});
