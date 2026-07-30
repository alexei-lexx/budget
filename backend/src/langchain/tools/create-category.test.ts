import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { CategoryType } from "../../models/category";
import { BusinessError } from "../../services/business-error";
import { CategoryService } from "../../services/category-service";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
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

  it("wires input and context userId through to the shared handler, defaulting excludeFromReports", async () => {
    // Arrange
    const created = fakeCategory();
    mockCategoryService.createCategory.mockResolvedValue(created);

    const createTool = createCreateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = { name: "Groceries", type: CategoryType.EXPENSE };

    // Act
    const result = await createTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toMatchObject({ success: true });
    expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
      userId,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      excludeFromReports: false,
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

  it("returns failure when the shared handler catches a BusinessError", async () => {
    // Arrange
    mockCategoryService.createCategory.mockRejectedValue(
      new BusinessError('Category "Groceries" already exists'),
    );

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
      success: false,
      error: 'Category "Groceries" already exists',
    });
  });
});
