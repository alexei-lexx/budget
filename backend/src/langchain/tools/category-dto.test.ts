import { describe, expect, it } from "@jest/globals";
import { CategoryType } from "../../models/category";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { toCategoryDto } from "./category-dto";

describe("toCategoryDto", () => {
  // Happy path

  it("should map the exposed fields from the category", () => {
    // Arrange
    const category = fakeCategory({
      name: "Groceries",
      type: CategoryType.EXPENSE,
      isArchived: false,
    });

    // Act
    const dto = toCategoryDto(category);

    // Assert
    expect(dto).toEqual({
      id: category.id,
      name: "Groceries",
      type: CategoryType.EXPENSE,
      isArchived: false,
    });
  });
});
