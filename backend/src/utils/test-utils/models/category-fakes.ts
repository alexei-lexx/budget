import { faker } from "@faker-js/faker";
import {
  Category,
  CategoryData,
  CategoryType,
  CreateCategoryInput,
} from "../../../models/category";
import { toDateTimeString } from "../../../types/date-time-string";

export const fakeCategory = (
  overrides: Partial<CategoryData> = {},
): Category => {
  const now = toDateTimeString(new Date().toISOString());
  return Category.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.commerce.department(),
    type: CategoryType.EXPENSE,
    excludeFromReports: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
};

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
