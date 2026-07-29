import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../../models/category";
import { TransactionRepository } from "../../ports/transaction-repository";
import { CategoryService } from "../../services/category-service";
import { isDateString } from "../../types/date";
import { EntityScope } from "../../types/entity-scope";
import { daysBetween } from "../../utils/date";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { fakeTransaction } from "../../utils/test-utils/models/transaction-fakes";
import { createMockTransactionRepository } from "../../utils/test-utils/repositories/transaction-repository-mocks";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import {
  CATEGORY_HISTORY_LOOKBACK_DAYS,
  CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY,
  createGetCategoriesTool,
} from "./get-categories";

describe("createGetCategoriesTool", () => {
  let mockCategoryService: Mocked<CategoryService>;
  let mockTransactionRepository: Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    mockTransactionRepository = createMockTransactionRepository();
  });

  // Happy path

  it("returns tool with correct name", () => {
    // Act
    const categoriesTool = createGetCategoriesTool({
      categoryService: mockCategoryService,
      transactionRepository: mockTransactionRepository,
    });

    // Assert
    expect(categoriesTool.name).toBe("get_categories");
  });

  it("calls category service with user id and scope", async () => {
    // Arrange
    // Service returns no categories
    mockCategoryService.getCategoriesByUser.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryService: mockCategoryService,
      transactionRepository: mockTransactionRepository,
    });

    // Act
    await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    // Assert
    expect(mockCategoryService.getCategoriesByUser).toHaveBeenCalledWith(
      userId,
      { scope: EntityScope.ALL },
    );
  });

  it("returns required fields only", async () => {
    // Arrange
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
    // Service returns two fully populated categories
    mockCategoryService.getCategoriesByUser.mockResolvedValue(mockCategories);
    // No transactions to enrich keywords
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryService: mockCategoryService,
      transactionRepository: mockTransactionRepository,
    });

    // Act
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          excludeFromReports: mockCategories[0].excludeFromReports,
          id: mockCategories[0].id,
          name: "Groceries",
          type: CategoryType.EXPENSE,
          isArchived: false,
          keywords: [],
        },
        {
          excludeFromReports: mockCategories[1].excludeFromReports,
          id: mockCategories[1].id,
          name: "Salary",
          type: CategoryType.INCOME,
          isArchived: true,
          keywords: [],
        },
      ],
    });
  });

  it("returns empty array when user has no categories", async () => {
    // Arrange
    // Service returns no categories
    mockCategoryService.getCategoriesByUser.mockResolvedValue([]);
    // No transactions exist either
    mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

    const categoriesTool = createGetCategoriesTool({
      categoryService: mockCategoryService,
      transactionRepository: mockTransactionRepository,
    });

    // Act
    const result = await categoriesTool.invoke(
      { scope: EntityScope.ALL },
      { context: { userId } },
    );

    // Assert
    expect(result).toEqual({ success: true, data: [] });
  });

  // Validation failures

  it("throws when userId in context is not valid UUID", async () => {
    // Arrange
    const categoriesTool = createGetCategoriesTool({
      categoryService: mockCategoryService,
      transactionRepository: mockTransactionRepository,
    });

    // Act & Assert
    await expect(
      categoriesTool.invoke(
        { scope: EntityScope.ALL },
        { context: { userId: "not-a-uuid" } },
      ),
    ).rejects.toThrow();
  });

  describe("when extracting keywords", () => {
    // Happy path

    it("returns empty keywords when no transactions exist", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);
      // No transactions to enrich keywords
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            keywords: [],
          }),
        ],
      });
    });

    it("excludes transactions without categoryId", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);
      // Transactions lack categoryId so cannot contribute keywords
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({
          categoryId: undefined,
          description: "should be ignored",
        }),
        fakeTransaction({ categoryId: undefined, description: "also ignored" }),
      ]);

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            keywords: [],
          }),
        ],
      });
    });

    it("excludes transactions without description", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);
      // Transactions lack description so cannot contribute keywords
      mockTransactionRepository.findManyByUserId.mockResolvedValue([
        fakeTransaction({ categoryId: category.id, description: undefined }),
        fakeTransaction({ categoryId: category.id, description: undefined }),
      ]);

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            keywords: [],
          }),
        ],
      });
    });

    it("excludes transactions with unknown categoryId", async () => {
      // Arrange
      const activeCategory = fakeCategory({ isArchived: false });
      const archivedCategory = fakeCategory({ isArchived: true });

      // Service returns one active category (already scope-filtered)
      mockCategoryService.getCategoriesByUser.mockResolvedValue([
        activeCategory,
      ]);
      // Transaction tied to archived category should not enrich active scope result
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
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: activeCategory.id,
            keywords: ["milk and eggs"],
          }),
        ],
      });
    });

    it("caps keywords per category", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);

      const transactions = Array.from(
        { length: CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY + 5 },
        (_, index) =>
          fakeTransaction({
            categoryId: category.id,
            description: `description ${index}`,
          }),
      );
      // Transactions exceed maximum keyword cap
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      if (!result.success) throw new Error("Expected success"); // Type guard

      expect(result.data[0].keywords).toHaveLength(
        CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY,
      );
      expect(result.data[0].keywords[0]).toEqual("description 0");
      expect(
        result.data[0].keywords[CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY - 1],
      ).toEqual(
        `description ${CATEGORY_HISTORY_MAX_KEYWORDS_PER_CATEGORY - 1}`,
      );
    });

    it("groups multiple keywords by categoryId", async () => {
      // Arrange
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

      // Service returns two active categories
      mockCategoryService.getCategoriesByUser.mockResolvedValue([
        groceryCategory,
        eatingOutCategory,
      ]);
      // Transactions interleave between both categories
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: groceryCategory.id,
            keywords: ["whole foods", "costco"],
          }),
          expect.objectContaining({
            id: eatingOutCategory.id,
            keywords: ["pizza place", "sushi restaurant"],
          }),
        ]),
      });
    });

    it("deduplicates repeated keywords", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);

      const transactions = [
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
      ];
      // Transactions repeat same descriptions
      mockTransactionRepository.findManyByUserId.mockResolvedValue(
        transactions,
      );

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      const result = await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
      expect(result).toEqual({
        success: true,
        data: [
          expect.objectContaining({
            id: category.id,
            keywords: ["ice cream", "milk"],
          }),
        ],
      });
    });

    it("fetches transactions within history lookback window", async () => {
      // Arrange
      const category = fakeCategory({ isArchived: false });
      // Service returns single active category
      mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);
      // No transactions to enrich keywords
      mockTransactionRepository.findManyByUserId.mockResolvedValue([]);

      const categoriesTool = createGetCategoriesTool({
        categoryService: mockCategoryService,
        transactionRepository: mockTransactionRepository,
      });

      // Act
      await categoriesTool.invoke(
        { scope: EntityScope.ACTIVE },
        { context: { userId } },
      );

      // Assert
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
