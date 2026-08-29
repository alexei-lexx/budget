import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../../services/category-service";
import { EntityScope } from "../../types/entity-scope";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { getCategories } from "./get-categories";
import { GUIDES } from "./guides";

describe("getCategories", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();
  let deps: { categoryService: Mocked<CategoryService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  // Happy path

  it("scopes lookup to given userId and scope", async () => {
    // Arrange
    mockCategoryService.getCategoriesByUser.mockResolvedValue([]);

    // Act
    await getCategories(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

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
    const result = await getCategories(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

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

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await getCategories(
      { scope: EntityScope.ALL, guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockCategoryService.getCategoriesByUser).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await getCategories(
      { scope: EntityScope.ALL, guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("propagates error when service throws", async () => {
    // Arrange
    const errorMessage = faker.lorem.sentence();
    mockCategoryService.getCategoriesByUser.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = getCategories(
      { scope: EntityScope.ALL, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
