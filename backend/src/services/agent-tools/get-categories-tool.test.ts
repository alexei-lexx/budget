import { faker } from "@faker-js/faker";
import { CategoryType } from "../../models/category";
import { isDateString } from "../../types/date";
import { daysBetween } from "../../utils/date";
import {
  fakeCategory,
  fakeTransaction,
} from "../../utils/test-utils/factories";
import {
  createMockCategoryRepository,
  createMockTransactionRepository,
} from "../../utils/test-utils/mock-repositories";
import { CategoryRepository } from "../ports/category-repository";
import { TransactionRepository } from "../ports/transaction-repository";
import {
  CATEGORY_HISTORY_LOOKBACK_DAYS,
  CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
  EntityScope,
  createGetCategoriesTool,
} from "./get-categories-tool";

describe("createGetCategoriesTool", () => {
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    mockTransactionRepository = createMockTransactionRepository();
  });

  it("should return tool with correct name", () => {
    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });

    expect(tool.name).toBe("getCategories");
  });

  it("should call category repository", async () => {
    mockCategoryRepository.findAllByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    await tool.func({ scope: EntityScope.ALL });

    expect(mockCategoryRepository.findAllByUserId).toHaveBeenCalledWith(userId);
  });

  it("should return all categories when scope is all", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ALL });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].isArchived).toBe(true);
    expect(parsed[1].isArchived).toBe(false);
  });

  it("should return only active categories when scope is active", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ACTIVE });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].isArchived).toBe(false);
  });

  it("should return only archived categories when scope is archived", async () => {
    const mockCategories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ARCHIVED });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].isArchived).toBe(true);
  });

  it("should return categories as JSON string", async () => {
    const mockCategories = [fakeCategory(), fakeCategory()];
    mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ALL });

    expect(typeof result).toBe("string");
    expect(() => JSON.parse(result)).not.toThrow();
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
    mockCategoryRepository.findAllByUserId.mockResolvedValue(mockCategories);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ALL });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      id: mockCategories[0].id,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      isArchived: false,
      recentDescriptions: [],
    });
    expect(parsed[1]).toEqual({
      id: mockCategories[1].id,
      name: "Salary",
      type: CategoryType.INCOME,
      isArchived: true,
      recentDescriptions: [],
    });
    expect(mockCategoryRepository.findAllByUserId).toHaveBeenCalledWith(userId);
  });

  it("should return empty array when user has no categories", async () => {
    mockCategoryRepository.findAllByUserId.mockResolvedValue([]);
    mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

    const tool = createGetCategoriesTool({
      categoryRepository: mockCategoryRepository,
      transactionRepository: mockTransactionRepository,
      userId,
    });
    const result = await tool.func({ scope: EntityScope.ALL });

    expect(result).toBe("[]");
  });

  describe("recentDescriptions", () => {
    it("should return empty array when no transactions exist", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        id: category.id,
        recentDescriptions: [],
      });
    });

    it("should exclude transactions without categoryId", async () => {
      const category = fakeCategory({ isArchived: false });
      const transactionsWithoutCategory = [
        fakeTransaction({
          categoryId: undefined,
          description: "should be ignored",
        }),
        fakeTransaction({ categoryId: undefined, description: "also ignored" }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactionsWithoutCategory,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed[0].recentDescriptions).toEqual([]);
    });

    it("should exclude transactions without description", async () => {
      const category = fakeCategory({ isArchived: false });
      const transactionsWithoutDescription = [
        fakeTransaction({ categoryId: category.id, description: undefined }),
        fakeTransaction({ categoryId: category.id, description: undefined }),
      ];
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactionsWithoutDescription,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed[0].recentDescriptions).toEqual([]);
    });

    it("should exclude transactions with unknown categoryId", async () => {
      const activeCategory = fakeCategory({ isArchived: false });
      const archivedCategory = fakeCategory({ isArchived: true });

      const transactions = [
        fakeTransaction({
          categoryId: activeCategory.id,
          description: "milk and eggs",
        }),
        fakeTransaction({
          categoryId: archivedCategory.id,
          description: "should be filtered out",
        }),
      ];

      mockCategoryRepository.findAllByUserId.mockResolvedValue([
        activeCategory,
        archivedCategory,
      ]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        id: activeCategory.id,
        recentDescriptions: ["milk and eggs"],
      });
    });

    it("should cap recentDescriptions", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);

      const transactions = Array.from(
        { length: CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY + 5 },
        (_, index) =>
          fakeTransaction({
            categoryId: category.id,
            description: `description ${index}`,
          }),
      );
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed[0].recentDescriptions).toHaveLength(
        CATEGORY_HISTORY_MAX_DESCRIPTIONS_PER_CATEGORY,
      );
      expect(parsed[0].recentDescriptions[0]).toEqual("description 0");
      expect(
        parsed[0].recentDescriptions[
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

      mockCategoryRepository.findAllByUserId.mockResolvedValue([
        groceryCategory,
        eatingOutCategory,
      ]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      const groceries = parsed.find(
        (category: { id: string }) => category.id === groceryCategory.id,
      );
      const eatingOut = parsed.find(
        (category: { id: string }) => category.id === eatingOutCategory.id,
      );

      expect(groceries?.recentDescriptions).toEqual(["whole foods", "costco"]);
      expect(eatingOut?.recentDescriptions).toEqual([
        "pizza place",
        "sushi restaurant",
      ]);
    });

    it("should deduplicate repeated descriptions", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);

      const transactions = [
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "ice cream" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
        fakeTransaction({ categoryId: category.id, description: "milk" }),
      ];
      mockTransactionRepository.findActiveByUserId.mockResolvedValue(
        transactions,
      );

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      const result = await tool.func({ scope: EntityScope.ACTIVE });

      const parsed = JSON.parse(result);
      expect(parsed[0].recentDescriptions).toEqual(["ice cream", "milk"]);
      expect(parsed[0].recentDescriptions).toHaveLength(2);
    });

    it("should fetch transactions within the history lookback window", async () => {
      const category = fakeCategory({ isArchived: false });
      mockCategoryRepository.findAllByUserId.mockResolvedValue([category]);
      mockTransactionRepository.findActiveByUserId.mockResolvedValue([]);

      const tool = createGetCategoriesTool({
        categoryRepository: mockCategoryRepository,
        transactionRepository: mockTransactionRepository,
        userId,
      });
      await tool.func({ scope: EntityScope.ACTIVE });

      expect(
        mockTransactionRepository.findActiveByUserId,
      ).toHaveBeenCalledTimes(1);

      const callFilters =
        mockTransactionRepository.findActiveByUserId.mock.calls[0][1];
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
