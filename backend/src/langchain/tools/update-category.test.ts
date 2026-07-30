import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../../models/category";
import { BusinessError } from "../../services/business-error";
import { CategoryService } from "../../services/category-service";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { createUpdateCategoryTool } from "./update-category";

describe("createUpdateCategoryTool", () => {
  let mockCategoryService: Mocked<CategoryService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
  });

  it("returns tool with correct name", () => {
    // Act
    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    // Assert
    expect(updateTool.name).toBe("update_category");
  });

  it("wires input and context userId through to the shared handler", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    const updated = fakeCategory();

    mockCategoryService.updateCategory.mockResolvedValue(updated);

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: categoryId,
      name: "Renamed",
      type: CategoryType.INCOME,
      excludeFromReports: true,
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toMatchObject({ success: true });
    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      {
        excludeFromReports: true,
        name: "Renamed",
        type: CategoryType.INCOME,
      },
    );
  });

  // Validation failures

  it("throws when userId in context is not a valid UUID", async () => {
    // Arrange
    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: faker.string.uuid(),
      name: "Renamed",
    };

    // Act & Assert
    await expect(
      updateTool.invoke(input, { context: { userId: "not-a-uuid" } }),
    ).rejects.toThrow();

    expect(mockCategoryService.updateCategory).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("returns failure when the shared handler catches a BusinessError", async () => {
    // Arrange
    mockCategoryService.updateCategory.mockRejectedValue(
      new BusinessError('Category "Groceries" already exists'),
    );

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: faker.string.uuid(),
      name: "Groceries",
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: false,
      error: 'Category "Groceries" already exists',
    });
  });
});
