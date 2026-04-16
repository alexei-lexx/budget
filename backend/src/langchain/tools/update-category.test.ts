import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { CategoryType } from "../../models/category";
import { BusinessError } from "../../services/business-error";
import { CategoryService } from "../../services/category-service";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { toCategoryDto } from "./category-dto";
import { createUpdateCategoryTool } from "./update-category";

describe("createUpdateCategoryTool", () => {
  let mockCategoryService: jest.Mocked<CategoryService>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockCategoryService = createMockCategoryService();
  });

  it("should return tool with correct name", () => {
    // Act
    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    // Assert
    expect(updateTool.name).toBe("update_category");
  });

  // Happy path

  it("should update category excludeFromReports", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    const updated = fakeCategory();

    // Updates and returns category
    mockCategoryService.updateCategory.mockResolvedValue(updated);

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: categoryId,
      excludeFromReports: true,
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(updated),
    });

    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      { excludeFromReports: true },
    );
  });

  it("should update category name", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    const updated = fakeCategory();

    // Updates and returns category
    mockCategoryService.updateCategory.mockResolvedValue(updated);

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: categoryId,
      name: "Renamed",
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(updated),
    });

    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      { name: "Renamed" },
    );
  });

  it("should update category type", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    const updated = fakeCategory();

    // Updates and returns category
    mockCategoryService.updateCategory.mockResolvedValue(updated);

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: categoryId,
      type: CategoryType.INCOME,
    };

    // Act
    const result = await updateTool.invoke(input, { context: { userId } });

    // Assert
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(updated),
    });

    expect(mockCategoryService.updateCategory).toHaveBeenCalledWith(
      categoryId,
      userId,
      { type: CategoryType.INCOME },
    );
  });

  it("should update all fields at once", async () => {
    // Arrange
    const categoryId = faker.string.uuid();
    const updated = fakeCategory();

    // Updates and returns category
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
    expect(result).toEqual({
      success: true,
      data: toCategoryDto(updated),
    });

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

  it("should throw when userId in context is not a valid UUID", async () => {
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

  it("should propagate BusinessError from the service unchanged", async () => {
    // Arrange
    const error = new BusinessError('Category "Groceries" already exists');

    mockCategoryService.updateCategory.mockRejectedValue(error);

    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    const input = {
      id: faker.string.uuid(),
      name: "Groceries",
    };

    // Act & Assert
    await expect(
      updateTool.invoke(input, { context: { userId } }),
    ).rejects.toBe(error);
  });
});
