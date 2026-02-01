import { v4 as uuidv4 } from "uuid";
import { fakeTransaction } from "../__tests__/utils/factories";
import { createMockTransactionRepository } from "../__tests__/utils/mock-repositories";
import { ReportType } from "../models/report";
import { ITransactionRepository, TransactionType } from "../models/transaction";
import { YEAR_RANGE_OFFSET } from "../types/validation";
import { BusinessErrorCodes } from "./business-error";
import { CategoryTopTransactionsService } from "./category-top-transactions-service";

describe("CategoryTopTransactionsService", () => {
  let categoryTopTransactionsService: CategoryTopTransactionsService;
  let mockTransactionRepository: jest.Mocked<ITransactionRepository>;

  const userId = uuidv4();

  beforeEach(() => {
    mockTransactionRepository = createMockTransactionRepository();

    categoryTopTransactionsService = new CategoryTopTransactionsService(
      mockTransactionRepository,
    );
  });

  describe("call", () => {
    it("should return empty result when no transactions exist", async () => {
      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions: [],
        totalCount: 0,
      });

      const result = await categoryTopTransactionsService.call(
        userId,
        2000,
        1,
        undefined,
        ReportType.EXPENSE,
        5,
      );

      expect(result).toEqual({
        transactions: [],
        totalCount: 0,
      });
    });

    it("should return transactions sorted by amount", async () => {
      const categoryId = uuidv4();
      const transactions = [
        fakeTransaction({
          categoryId,
          currency: "USD",
          amount: 100,
          type: TransactionType.EXPENSE,
        }),
        fakeTransaction({
          categoryId,
          currency: "USD",
          amount: 200,
          type: TransactionType.EXPENSE,
        }),
        fakeTransaction({
          categoryId,
          currency: "USD",
          amount: 50,
          type: TransactionType.EXPENSE,
        }),
      ];

      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions,
        totalCount: 3,
      });

      const result = await categoryTopTransactionsService.call(
        userId,
        2000,
        1,
        categoryId,
        ReportType.EXPENSE,
        5,
      );

      expect(result.transactions).toHaveLength(3);
      expect(result.totalCount).toBe(3);
    });

    it("should use default limit of 5 when not provided", async () => {
      const categoryId = uuidv4();
      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions: [],
        totalCount: 0,
      });

      await categoryTopTransactionsService.call(
        userId,
        2000,
        1,
        categoryId,
        ReportType.EXPENSE,
      );

      expect(
        mockTransactionRepository.findTopByCategoryAndMonth,
      ).toHaveBeenCalledWith(
        userId,
        2000,
        1,
        categoryId,
        [TransactionType.EXPENSE, TransactionType.REFUND],
        5,
      );
    });

    it("should fetch EXPENSE and REFUND transactions for EXPENSE report type", async () => {
      const categoryId = uuidv4();
      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions: [],
        totalCount: 0,
      });

      await categoryTopTransactionsService.call(
        userId,
        2000,
        1,
        categoryId,
        ReportType.EXPENSE,
        5,
      );

      expect(
        mockTransactionRepository.findTopByCategoryAndMonth,
      ).toHaveBeenCalledWith(
        userId,
        2000,
        1,
        categoryId,
        [TransactionType.EXPENSE, TransactionType.REFUND],
        5,
      );
    });

    it("should fetch INCOME transactions for INCOME report type", async () => {
      const categoryId = uuidv4();
      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions: [],
        totalCount: 0,
      });

      await categoryTopTransactionsService.call(
        userId,
        2000,
        1,
        categoryId,
        ReportType.INCOME,
        5,
      );

      expect(
        mockTransactionRepository.findTopByCategoryAndMonth,
      ).toHaveBeenCalledWith(
        userId,
        2000,
        1,
        categoryId,
        [TransactionType.INCOME],
        5,
      );
    });

    it("should reject invalid year", async () => {
      const currentYear = new Date().getFullYear();
      const invalidYear = currentYear + YEAR_RANGE_OFFSET + 1;

      await expect(
        categoryTopTransactionsService.call(
          userId,
          invalidYear,
          1,
          undefined,
          ReportType.EXPENSE,
          5,
        ),
      ).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should reject invalid month", async () => {
      await expect(
        categoryTopTransactionsService.call(
          userId,
          2000,
          13,
          undefined,
          ReportType.EXPENSE,
          5,
        ),
      ).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });

    it("should reject invalid limit", async () => {
      mockTransactionRepository.findTopByCategoryAndMonth.mockResolvedValue({
        transactions: [],
        totalCount: 0,
      });

      await expect(
        categoryTopTransactionsService.call(
          userId,
          2000,
          1,
          undefined,
          ReportType.EXPENSE,
          0,
        ),
      ).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });

      await expect(
        categoryTopTransactionsService.call(
          userId,
          2000,
          1,
          undefined,
          ReportType.EXPENSE,
          101,
        ),
      ).rejects.toMatchObject({
        code: BusinessErrorCodes.INVALID_PARAMETERS,
      });
    });
  });
});
