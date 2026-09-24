import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../../services/category-service";
import { Failure, Success } from "../../types/result";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { toCategoryDto } from "./category-dto";
import { createCreateCategoryTool } from "./create-category";

describe("createCreateCategoryTool", () => {
  let mockCategoryService: Mocked<CategoryService>;
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
    mockCategoryService.createCategory.mockResolvedValue(Success(created));

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Groceries",
      type: "EXPENSE",
    } as const;

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
      type: "EXPENSE",
      excludeFromReports: false,
    });
  });

  it("passes excludeFromReports true to service", async () => {
    // Arrange
    const created = fakeCategory();

    // Persists and returns new category
    mockCategoryService.createCategory.mockResolvedValue(Success(created));

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Internal Transfers",
      type: "EXPENSE",
      excludeFromReports: true,
    } as const;

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
      type: "EXPENSE",
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
      type: "EXPENSE",
    } as const;

    // Act & Assert
    await expect(
      createTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();

    expect(mockCategoryService.createCategory).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("fails with service error unchanged", async () => {
    // Arrange
    // Category name already exists
    mockCategoryService.createCategory.mockResolvedValue(
      Failure('Category "Groceries" already exists'),
    );

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      name: "Groceries",
      type: "EXPENSE",
    } as const;

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Category "Groceries" already exists',
    });
  });
});
