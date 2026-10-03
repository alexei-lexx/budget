import { faker } from "@faker-js/faker";
import { Failure, Success } from "ts-result";
import {
  type Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { toCategoryDto } from "../../langchain/tools/category-dto";
import { CategoryService } from "../../services/category-service";
import { toDateTimeString } from "../../types/date-time-string";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { createMockCategoryService } from "../../utils/test-utils/services/category-service-mocks";
import { deleteCategory } from "./delete-category";
import { GUIDES } from "./guides";

describe("deleteCategory", () => {
  const userId = faker.string.uuid();
  let mockCategoryService: Mocked<CategoryService>;
  let deps: { categoryService: Mocked<CategoryService>; userId: string };
  let validGuideToken: string;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:00:00.000Z"));

    // Guide tokens rotate hourly, so read token after freezing clock
    validGuideToken = GUIDES.basics.token;
    mockCategoryService = createMockCategoryService();
    deps = { categoryService: mockCategoryService, userId };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Happy path

  it("deletes category created within last hour and returns it", async () => {
    // Arrange
    const category = fakeCategory({
      createdAt: toDateTimeString("2000-01-02T09:30:00.000Z"),
    });
    // Finds category among user's active categories
    mockCategoryService.getCategoriesByUser.mockResolvedValue(
      Success([fakeCategory(), category, fakeCategory()]),
    );
    // Archives and returns category
    const archived = category.archive();
    mockCategoryService.deleteCategory.mockResolvedValue(Success(archived));

    // Act
    const result = await deleteCategory(
      { id: category.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeSuccess(toCategoryDto(archived));

    expect(mockCategoryService.getCategoriesByUser).toHaveBeenCalledWith(
      userId,
      { scope: "ACTIVE" },
    );

    expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith(
      category.id,
      userId,
    );
  });

  // Validation failures

  it("fails without valid basics guide token and does not call service", async () => {
    // Act
    const result = await deleteCategory(
      { id: faker.string.uuid(), guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    );
    expect(mockCategoryService.getCategoriesByUser).not.toHaveBeenCalled();
    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });

  it("fails when category is not among user's active categories", async () => {
    // Arrange
    // User has no matching active category
    mockCategoryService.getCategoriesByUser.mockResolvedValue(
      Success([fakeCategory()]),
    );

    // Act
    const result = await deleteCategory(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure("Category not found");
    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });

  it("fails when category was created more than one hour ago", async () => {
    // Arrange
    const category = fakeCategory({
      createdAt: toDateTimeString("2000-01-02T08:00:00.000Z"),
    });
    // Finds user's old category
    mockCategoryService.getCategoriesByUser.mockResolvedValue(
      Success([category]),
    );

    // Act
    const result = await deleteCategory(
      { id: category.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Only categories created within the last 1 hour can be deleted by an agent. Delete older categories in the app.",
    );
    expect(mockCategoryService.deleteCategory).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("fails when service rejects deletion", async () => {
    // Arrange
    const category = fakeCategory();
    // Finds user's recent category
    mockCategoryService.getCategoriesByUser.mockResolvedValue(
      Success([category]),
    );
    // Rejects deletion
    mockCategoryService.deleteCategory.mockResolvedValue(
      Failure("Something went wrong"),
    );

    // Act
    const result = await deleteCategory(
      { id: category.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure("Something went wrong");
  });
});
