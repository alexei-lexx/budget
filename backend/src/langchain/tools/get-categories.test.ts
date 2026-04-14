import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CategoryType } from "../../models/category";
import { CategoryRepository } from "../../ports/category-repository";
import { TransactionRepository } from "../../ports/transaction-repository";
import { isDateString } from "../../types/date";
import { daysBetween } from "../../utils/date";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { EntityScope } from "./get-accounts";
import {
  CATEGORY_HISTORY_LOOKBACK_DAYS,
  CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
  createGetCategoriesTool,
} from "./get-categories";

describe("createGetCategoriesTool", () => {
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("should return tool with correct name", () => {
    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });

    expect(categoriesTool.name).toBe("get_categories");
  });

  it("should throw an error when userId is missing from context", async () => {
    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });

    await expect(
      categoriesTool.invoke(
        { scope: EntityScope.ALL },
        { context: { userId: "" } },
      ),
    ).rejects.toThrow("Invalid tool context: missing userId");
  });

  it("should call category repository", async () => {
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    expect(
      mockCategoryRepository.findManyWithArchivedByUserId,
    ).toHaveBeenCalledWith(userId);
  });

  it("should return all categories when scope is all", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockCategories,
    );
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({ isArchived: true }),
        expect.objectContaining({ isArchived: false }),
      ],
    });
  });

  it("should return only active categories when scope is active", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockCategories,
    );
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ACTIVE },
      { context: { userId } },
    );

    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: false })],
    });
  });

  it("should return only archived categories when scope is archived", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockCategories,
    );
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ARCHIVED },
      { context: { userId } },
    );

    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: true })],
    });
  });

  it("should return required fields only", async () => {
    const mockCategories = [
      fakeCategory({
        userId,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        isArchived: false,
      }),
      fakeCategory({
        userId,
        name: "Salary",
        type: CategoryType.INCOME,
        isArchived: true,
      }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      mockCategories,
    );
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: mockCategories[0].id,
          name: "Groceries",
          type: CategoryType.EXPENSE,
          isArchived: false,
          recentDescriptions: [],
        },
        {
          id: mockCategories[1].id,
          name: "Salary",
          type: CategoryType.INCOME,
          isArchived: true,
          recentDescriptions: [],
        },
      ],
    });
  });

  it("should return empty array when user has no categories", async () => {
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
    });
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    expect(result).toEqual({ success: true, data: [] });
  });

  describe("recentDescriptions", () => {
    it("should return empty array when no transactions exist", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            recentDescriptions: [],
          }),
        ],
      });
    });

    it("should exclude transactions without categoryId", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          categoryId: undefined,
          description: "should be ignored",
        }),
        fakeTransaction({ categoryId: undefined, description: "also ignored" }),
      ]);

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            recentDescriptions: [],
          }),
        ],
      });
    });

    it("should exclude transactions without description", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({ categoryId: category.id, description: undefined }),
        fakeTransaction({ categoryId: category.id, description: undefined }),
      ]);

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            recentDescriptions: [],
          }),
        ],
      });
    });

    it("should exclude transactions with unknown categoryId", async () => {
      const activeCategory = fakeCategory({ isArchived: false });
      const archivedCategory = fakeCategory({ isArchived: true });

      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        activeCategory,
        archivedCategory,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          categoryId: activeCategory.id,
          description: "milk and eggs",
        }),
        fakeTransaction({
          categoryId: archivedCategory.id,
          description: "should be filtered out",
        }),
      ]);

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: activeCategory.id,
            recentDescriptions: ["milk and eggs"],
          }),
        ],
      });
    });

    it("should cap recentDescriptions", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);

      const transactions = Array.from(
        { length: CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY + 5 },
        (_, index) =>
          fakeTransaction({
            categoryId: category.id,
            description: `description ${index}`,
          }),
      );
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      if (!result.success) throw new Error("Expected success"); // Type guard

      expect(result.data[0].recentDescriptions).toHaveLength(
        CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
      );
      expect(result.data[0].recentDescriptions[0]).toEqual("description 0");
      expect(
        result.data[0].recentDescriptions[
          CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY - 1
        ],
      ).toEqual(
        `description ${CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY - 1}`,
      );
    });

    it("should group multiple descriptions by categoryId", async () => {
      const groceryCategory = fakeCategory({ isArchived: false });
      const eatingOutCategory = fakeCategory({ isArchived: false });

      const transactions = [
        fakeTransaction({
          categoryId: groceryCategory.id,
          description: "whole foods",
        }),
        fakeTransaction({
          categoryId: eatingOutCategory.id,
          description: "pizza place",
        }),
        fakeTransaction({
          categoryId: groceryCategory.id,
          description: "costco",
        }),
        fakeTransaction({
          categoryId: eatingOutCategory.id,
          description: "sushi restaurant",
        }),
      ];

      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        groceryCategory,
        eatingOutCategory,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: groceryCategory.id,
            recentDescriptions: ["whole foods", "costco"],
          }),
          expect.objectContaining({
            id: eatingOutCategory.id,
            recentDescriptions: ["pizza place", "sushi restaurant"],
          }),
        ]),
      });
    });

    it("should deduplicate repeated descriptions", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);

      const transactions = [
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
      ];
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            recentDescriptions: ["ice cream", "milk"],
          }),
        ],
      });
    });

    it("should fetch transactions within the history lookback window", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
        category,
      ]);
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      const categoriesTool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
      });
      await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      expect(mockTransactionRepository.findManyByUserId).toHaveBeenCalledTimes(
        1,
      );

      const callFilters =
        mockTransactionRepository.findManyByUserId.mock.calls[0][1];
      const dateAfterArg = callFilters?.dateAfter;
      const dateBeforeArg = callFilters?.dateBefore;

      expect(dateAfterArg && isDateString(dateAfterArg)).toBe(true);
      expect(dateBeforeArg && isDateString(dateBeforeArg)).toBe(true);

      const dateAfter = new Date(dateAfterArg || "");
      const dateBefore = new Date(dateBeforeArg || "");
      const daysDiff = daysBetween(dateAfter, dateBefore);

      expect(daysDiff).toBeGreaterThanOrEqual(
        CATEGORY_HISTORY_LOOKBACK_DAYS - 1,
      );
      expect(daysDiff).toBeLessThanOrEqual(CATEGORY_HISTORY_LOOKBACK_DAYS);
    });
  });
});
