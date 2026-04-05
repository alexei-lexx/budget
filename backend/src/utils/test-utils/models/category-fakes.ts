import { faker } from "@faker-js/faker";
import { Category, CategoryType } from "../../../models/category";

export const fakeCategory = (overrides: Partial<Category> = {}): Category => {
  const now = new Date().toISOString();
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    name: faker.commerce.department(),
    type: CategoryType.EXPENSE,
    excludeFromReports: false,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};
