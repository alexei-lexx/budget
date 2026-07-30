import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../models/category";
import { BusinessError } from "../services/business-error";
import { CategoryService } from "../services/category-service";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../utils/test-utils/services/category-service-mocks";
import { handler } from "./update-category";

describe("updateCategory", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();
  let deps: { categoryService: Mocked<CategoryService>; userId: string };

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  // Happy path

  it("updates category and returns updated fields", async () => {
    // Arrange
    const updated = fakeCategory({
      name: "Renamed Category",
      type: CategoryType.INCOME,
      excludeFromReports: true,
      isArchived: false,
    });
    // Persists and returns updated category
    mockCategoryService.updateCategory.mockResolvedValue(updated);

    // Act
    const result = await handler(
      {
        id: updated.id,
        name: "Renamed Category",
        type: CategoryType.INCOME,
        excludeFromReports: true,
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: updated.id,
        name: "Renamed Category",
        type: CategoryType.INCOME,
        excludeFromReports: true,
        isArchived: false,
      },
    });
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      updated.id,
      userId,
      {
        name: "Renamed Category",
        type: CategoryType.INCOME,
        excludeFromReports: true,
      },
    );
  });

  it("passes only supplied fields to service", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    // Persists and returns updated category
    mockCategoryService.updateCategory.mockResolvedValue(fakeCategory());

    // Act
    await handler({ id: categoryId, name: "Renamed Only" }, deps);

    // Assert
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      { name: "Renamed Only" },
    );
  });

  // Dependency failures

  it("returns failure when service throws", async () => {
    // Arrange
    // Category service rejects
    mockCategoryService.updateCategory.mockRejectedValue(
      new BusinessError("Category not found"),
    );

    // Act
    const result = await handler(
      { id: faker.string.uuid(), name: "Renamed Category" },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: "Category not found",
    });
  });
});
