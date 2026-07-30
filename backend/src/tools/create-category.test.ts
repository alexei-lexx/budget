import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../models/category";
import { BusinessError } from "../services/business-error";
import { CategoryService } from "../services/category-service";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../utils/test-utils/services/category-service-mocks";
import { createCategory } from "./create-category";

describe("createCategory", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();
  let deps: { categoryService: Mocked<CategoryService>; userId: string };

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  // Happy path

  it("creates category and returns created fields", async () => {
    // Arrange
    const created = fakeCategory({
      name: "Groceries",
      type: CategoryType.EXPENSE,
      excludeFromReports: true,
      isArchived: false,
    });
    // Persists and returns new category
    mockCategoryService.createCategory.mockResolvedValue(created);

    // Act
    const result = await createCategory(
      {
        name: "Groceries",
        type: CategoryType.EXPENSE,
        excludeFromReports: true,
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: created.id,
        name: "Groceries",
        type: CategoryType.EXPENSE,
        excludeFromReports: true,
        isArchived: false,
      },
    });
    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      userId,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      excludeFromReports: true,
    });
  });

  it("defaults excludeFromReports to false when omitted", async () => {
    // Arrange
    const created = fakeCategory({ excludeFromReports: false });
    // Persists and returns new category
    mockCategoryService.createCategory.mockResolvedValue(created);

    // Act
    await createCategory({ name: "Salary", type: CategoryType.INCOME }, deps);

    // Assert
    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      userId,
      name: "Salary",
      type: CategoryType.INCOME,
      excludeFromReports: false,
    });
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    // Category service rejects
    mockCategoryService.createCategory.mockRejectedValue(
      new BusinessError('Category "Salary" already exists'),
    );

    // Act
    const result = await createCategory(
      { name: "Salary", type: CategoryType.INCOME },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Category "Salary" already exists',
    });
  });
});
