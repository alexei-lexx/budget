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

  it("returns tool with correct name", () => {
    // Act
    const updateTool = createUpdateCategoryTool({
      categoryService: mockCategoryService,
    });

    // Assert
    expect(updateTool.name).toBe("update_category");
  });

  // Happy path

  it("updates category excludeFromReports", async () => {
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
      excludeFromReports: faker.datatype.boolean(),
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
      { excludeFromReports: input.excludeFromReports },
    );
  });

  it("updates category name", async () => {
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

  it("updates category type", async () => {
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

  it("updates all fields at once", async () => {
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

  it("propagates BusinessError from the service unchanged", async () => {
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
