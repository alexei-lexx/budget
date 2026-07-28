import { faker } from "@faker-js/faker";
import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { EntityScope } from "../../langchain/tools/get-accounts";
import { CategoryRepository } from "../../ports/category-repository";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryRepository } from "../../utils/test-utils/repositories/category-repository-mocks";
import { getCategories } from "./get-categories";

describe("getCategories", () => {
  let mockCategoryRepository: Mocked<CategoryRepository>;
  const userId = faker.string.uuid();
  let deps: {
    categoryRepository: Mocked<CategoryRepository>;
    userId: string;
  };

  beforeEach(() => {
    mockCategoryRepository = createMockCategoryRepository();
    deps = { categoryRepository: mockCategoryRepository, userId };
  });

  // Happy path

  it("scopes lookup to given userId", async () => {
    // Arrange
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([]);

    // Act
    await getCategories({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(
      mockCategoryRepository.findManyWithArchivedByUserId,
    ).toHaveBeenCalledWith(userId);
  });

  it("returns category details", async () => {
    // Arrange
    const category = fakeCategory({
      name: "Groceries",
      excludeFromReports: false,
      isArchived: false,
    });
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue([
      category,
    ]);

    // Act
    const result = await getCategories({ scope: EntityScope.ALL }, deps);

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

  it("returns both active and archived categories when scope is all", async () => {
    // Arrange
    const categories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      categories,
    );

    // Act
    const result = await getCategories({ scope: EntityScope.ALL }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        expect.objectContaining({ isArchived: true }),
        expect.objectContaining({ isArchived: false }),
      ],
    });
  });

  it("returns only active categories when scope is active", async () => {
    // Arrange
    const categories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      categories,
    );

    // Act
    const result = await getCategories({ scope: EntityScope.ACTIVE }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: false })],
    });
  });

  it("returns only archived categories when scope is archived", async () => {
    // Arrange
    const categories = [
      fakeCategory({ isArchived: true }),
      fakeCategory({ isArchived: false }),
    ];
    mockCategoryRepository.findManyWithArchivedByUserId.mockResolvedValue(
      categories,
    );

    // Act
    const result = await getCategories({ scope: EntityScope.ARCHIVED }, deps);

    // Assert
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ isArchived: true })],
    });
  });
});
