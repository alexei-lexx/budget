import { faker } from "@faker-js/faker";
import { CategoryType } from "../../../models/category";
import { CreateCategoryInput } from "../../../ports/category-repository";

export const fakeCreateCategoryInput = (
  overrides: Partial<CreateCategoryInput> = {},
): CreateCategoryInput => {
  return {
    userId: faker.string.uuid(),
    name: `${faker.commerce.department()}-${faker.string.uuid()}`, // Ensure uniqueness
    type: CategoryType.EXPENSE,
    excludeFromReports: false,
    ...overrides,
  };
};
