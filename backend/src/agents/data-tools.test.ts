import { faker } from "@faker-js/faker";
import {
  fakeAccount,
  fakeCategory,
  fakeTransaction,
} from "../utils/test-utils/factories";
import { AgentDataService } from "./agent-data-service";
import {
  createGetAccountsTool,
  createGetCategoriesTool,
  createGetTransactionsTool,
} from "./data-tools";

describe("data-tools", () => {
  let mockAiDataService: {
    getAllAccounts: jest.Mock;
    getAllCategories: jest.Mock;
    getFilteredTransactions: jest.Mock;
  };
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAiDataService = {
      getAllAccounts: jest.fn(),
      getAllCategories: jest.fn(),
      getFilteredTransactions: jest.fn(),
    };
  });

  describe("createGetAccountsTool", () => {
    it("should return tool with correct name", () => {
      const tool = createGetAccountsTool(
        mockAiDataService as unknown as AgentDataService,
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
      mockAiDataService.getAllAccounts.mockResolvedValue(accountsData);

      const tool = createGetAccountsTool(
        mockAiDataService as unknown as AgentDataService,
        userId,
      );
      const result = await tool.func({});

      expect(mockAiDataService.getAllAccounts).toHaveBeenCalledWith(userId);
      expect(result).toBe(JSON.stringify(accountsData));
    });
  });

  describe("createGetCategoriesTool", () => {
    it("should return tool with correct name", () => {
      const tool = createGetCategoriesTool(
        mockAiDataService as unknown as AgentDataService,
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
      mockAiDataService.getAllCategories.mockResolvedValue(categoriesData);

      const tool = createGetCategoriesTool(
        mockAiDataService as unknown as AgentDataService,
        userId,
      );
      const result = await tool.func({});

      expect(mockAiDataService.getAllCategories).toHaveBeenCalledWith(userId);
      expect(result).toBe(JSON.stringify(categoriesData));
    });
  });

  describe("createGetTransactionsTool", () => {
    const allowedDateRange = {
      startDate: "2000-01-01",
      endDate: "2000-01-31",
    };

    it("should return tool with correct name", () => {
      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      expect(tool.name).toBe("getTransactions");
    });

    it("should accept dates within allowed range", async () => {
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
      mockAiDataService.getFilteredTransactions.mockResolvedValue(
        transactionsData,
      );

      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      const result = await tool.func({
        startDate: "2000-01-10",
        endDate: "2000-01-20",
      });

      expect(mockAiDataService.getFilteredTransactions).toHaveBeenCalledWith(
        userId,
        { startDate: "2000-01-10", endDate: "2000-01-20" },
        undefined,
        undefined,
      );
      expect(result).toBe(JSON.stringify(transactionsData));
    });

    it("should reject startDate before allowed range", async () => {
      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      const result = await tool.func({
        startDate: "1999-12-31",
        endDate: "2000-01-15",
      });

      expect(mockAiDataService.getFilteredTransactions).not.toHaveBeenCalled();
      expect(result).toBe(
        JSON.stringify({
          error: "Date range must be within 2000-01-01 to 2000-01-31",
        }),
      );
    });

    it("should reject endDate after allowed range", async () => {
      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      const result = await tool.func({
        startDate: "2000-01-15",
        endDate: "2000-02-01",
      });

      expect(mockAiDataService.getFilteredTransactions).not.toHaveBeenCalled();
      expect(result).toBe(
        JSON.stringify({
          error: "Date range must be within 2000-01-01 to 2000-01-31",
        }),
      );
    });

    it("should reject when startDate is after endDate", async () => {
      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      const result = await tool.func({
        startDate: "2000-01-20",
        endDate: "2000-01-10",
      });

      expect(mockAiDataService.getFilteredTransactions).not.toHaveBeenCalled();
      expect(result).toBe(
        JSON.stringify({
          error: "startDate must not be after endDate",
        }),
      );
    });

    it("should accept dates at boundary of allowed range (inclusive)", async () => {
      mockAiDataService.getFilteredTransactions.mockResolvedValue([]);

      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      const result = await tool.func({
        startDate: "2000-01-01",
        endDate: "2000-01-31",
      });

      expect(mockAiDataService.getFilteredTransactions).toHaveBeenCalledWith(
        userId,
        { startDate: "2000-01-01", endDate: "2000-01-31" },
        undefined,
        undefined,
      );
      expect(result).toBe(JSON.stringify([]));
    });

    it("should filter by accountId", async () => {
      const accountId = faker.string.uuid();
      mockAiDataService.getFilteredTransactions.mockResolvedValue([]);

      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      await tool.func({
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        accountId,
      });

      expect(mockAiDataService.getFilteredTransactions).toHaveBeenCalledWith(
        userId,
        { startDate: "2000-01-10", endDate: "2000-01-20" },
        undefined,
        accountId,
      );
    });

    it("should filter by categoryId", async () => {
      const categoryId = faker.string.uuid();
      mockAiDataService.getFilteredTransactions.mockResolvedValue([]);

      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      await tool.func({
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        categoryId,
      });

      expect(mockAiDataService.getFilteredTransactions).toHaveBeenCalledWith(
        userId,
        { startDate: "2000-01-10", endDate: "2000-01-20" },
        categoryId,
        undefined,
      );
    });

    it("should filter by both accountId and categoryId", async () => {
      const accountId = faker.string.uuid();
      const categoryId = faker.string.uuid();
      mockAiDataService.getFilteredTransactions.mockResolvedValue([]);

      const tool = createGetTransactionsTool({
        aiDataService: mockAiDataService as unknown as AgentDataService,
        userId,
        dateRange: allowedDateRange,
      });

      await tool.func({
        startDate: "2000-01-10",
        endDate: "2000-01-20",
        accountId,
        categoryId,
      });

      expect(mockAiDataService.getFilteredTransactions).toHaveBeenCalledWith(
        userId,
        { startDate: "2000-01-10", endDate: "2000-01-20" },
        categoryId,
        accountId,
      );
    });
  });
});
