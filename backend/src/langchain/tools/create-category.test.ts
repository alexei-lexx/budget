import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CategoryType } from "../../models/category";
import { BusinessError } from "../../services/business-error";
import { CategoryService } from "../../services/category-service";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { toCategoryDto } from "./category-dto";
import { createCreateCategoryTool } from "./create-category";

describe("createCreateCategoryTool", () => {
  let mockCategoryService: jest.Mocked<CategoryService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
  });

  it("returns tool with correct name", () => {
    // Act
    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    // Assert
    expect(createTool.name).toBe("create_category");
  });

  // Happy path

  it("creates category and returns it", async () => {
    // Arrange
    const created = fakeCategory();

    // Persists and returns new category
    mockCategoryService.createCategory.mockResolvedValue(created);

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Groceries",
      type: CategoryType.EXPENSE,
    };

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(created),
    });

    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      userId,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      excludeFromReports: false,
    });
  });

  it("passes excludeFromReports true to service", async () => {
    // Arrange
    const created = fakeCategory();

    // Persists and returns new category
    mockCategoryService.createCategory.mockResolvedValue(created);

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Internal Transfers",
      type: CategoryType.EXPENSE,
      excludeFromReports: true,
    };

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(created),
    });

    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      userId,
      name: "Internal Transfers",
      type: CategoryType.EXPENSE,
      excludeFromReports: true,
    });
  });

  // Validation failures

  it("throws when userId in context is not valid UUID", async () => {
    // Arrange
    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Groceries",
      type: CategoryType.EXPENSE,
    };

    // Act & Assert
    await expect(
      createTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();

    expect(mockCategoryService.createCategory).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("propagates BusinessError from service unchanged", async () => {
    // Arrange
    const error = new BusinessError('Category "Groceries" already exists');

    mockCategoryService.createCategory.mockRejectedValue(error);

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Groceries",
      type: CategoryType.EXPENSE,
    };

    // Act & Assert
    await expect(
      createTool.invoke(input, { context: { userId } }),
    ).rejects.toBe(error);
  });
});
