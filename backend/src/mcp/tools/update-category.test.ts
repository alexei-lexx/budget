import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryService } from "../../services/category-service";
import { Failure, Success } from "../../types/result";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { GUIDES } from "./guides";
import { updateCategory } from "./update-category";

describe("updateCategory", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();
  let deps: { categoryService: Mocked<CategoryService>; userId: string };

  const validGuideToken = GUIDES.basics.token;

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  // Happy path

  it("updates category and returns updated fields", async () => {
    // Arrange
    const updated = fakeCategory({
      name: "Renamed Category",
      type: "INCOME",
      excludeFromReports: true,
      isArchived: false,
    });
    // Persists and returns updated category
    mockCategoryService.updateCategory.mockResolvedValue(Success(updated));

    // Act
    const result = await updateCategory(
      {
        id: updated.id,
        name: "Renamed Category",
        type: "INCOME",
        excludeFromReports: true,
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: true,
      data: {
        id: updated.id,
        name: "Renamed Category",
        type: "INCOME",
        excludeFromReports: true,
        isArchived: false,
      },
    });
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      updated.id,
      userId,
      {
        name: "Renamed Category",
        type: "INCOME",
        excludeFromReports: true,
      },
    );
  });

  it("passes only supplied fields to service", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    // Persists and returns updated category
    mockCategoryService.updateCategory.mockResolvedValue(
      Success(fakeCategory()),
    );

    // Act
    await updateCategory(
      { id: categoryId, name: "Renamed Only", guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      { name: "Renamed Only" },
    );
  });

  // Validation failures

  it("rejects without valid basics guide token and does not call service", async () => {
    // Act
    const result = await updateCategory(
      { id: faker.string.uuid(), name: "Renamed Only", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
    expect(mockCategoryService.updateCategory).not.toHaveBeenCalled();
  });

  it("does not disclose valid guide token in rejection message", async () => {
    // Act
    const result = await updateCategory(
      { id: faker.string.uuid(), name: "Renamed Only", guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(validGuideToken),
    });
  });

  // Dependency failures

  it("fails with service error unchanged", async () => {
    // Arrange
    // Category name already exists
    mockCategoryService.updateCategory.mockResolvedValue(
      Failure('Category "Groceries" already exists'),
    );

    // Act
    const result = await updateCategory(
      {
        id: faker.string.uuid(),
        name: "Groceries",
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Category "Groceries" already exists',
    });
  });

  it("propagates error when service throws", async () => {
    // Arrange
    // Category service rejects
    const errorMessage = faker.lorem.sentence();
    mockCategoryService.updateCategory.mockRejectedValue(
      new Error(errorMessage),
    );

    // Act
    const promise = updateCategory(
      {
        id: faker.string.uuid(),
        name: "Renamed Category",
        guideTokens: [validGuideToken],
      },
      deps,
    );

    // Assert
    await expect(promise).rejects.toThrow(errorMessage);
  });
});
