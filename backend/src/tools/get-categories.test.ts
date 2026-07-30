import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../services/category-service";
import { EntityScope } from "../types/entity-scope";
import { fakeCategory } from "../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../utils/test-utils/services/category-service-mocks";
import { handler } from "./get-categories";

describe("getCategories", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();
  let deps: { categoryService: Mocked<CategoryService>; userId: string };

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  // Happy path

  it("scopes lookup to given userId and scope", async () => {
    // Arrange
    mockCategoryService.getCategoriesByUser.mockResolvedValue([]);

    // Act
    await handler({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(mockCategoryService.getCategoriesByUser).toHaveBeenCalledWith(
      userId,
      { scope: EntityScope.ALL },
    );
  });

  it("returns category details", async () => {
    // Arrange
    const category = fakeCategory({
      name: "Groceries",
      excludeFromReports: false,
      isArchived: false,
    });
    mockCategoryService.getCategoriesByUser.mockResolvedValue([category]);

    // Act
    const result = await handler({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: category.id,
          name: "Groceries",
          type: category.type,
          excludeFromReports: false,
          isArchived: false,
        },
      ],
    });
  });
});
