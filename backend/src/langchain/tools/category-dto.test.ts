import { describe, expect, it } from "@jest/globals";
import { fakeCategory } from "../../utils/test-utils/models/category-fakes";
import { toCategoryDto } from "./category-dto";

describe("toCategoryDto", () => {
  // Happy path

  it("should map the exposed fields from the category", () => {
    // Arrange
    const category = fakeCategory();

    // Act
    const dto = toCategoryDto(category);

    // Assert
    expect(dto).toEqual({
      excludeFromReports: category.excludeFromReports,
      id: category.id,
      name: category.name,
      type: category.type,
      isArchived: category.isArchived,
    });
  });
});
