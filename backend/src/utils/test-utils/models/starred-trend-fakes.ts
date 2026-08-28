import { faker } from "@faker-js/faker";
import {
  CreateStarredTrendInput,
  StarredTrend,
  StarredTrendData,
} from "../../../models/starred-trend";
import { toDateTimeString } from "../../../types/date-time-string";

export const fakeStarredTrend = (
  overrides: Partial<StarredTrendData> = {},
): StarredTrend => {
  return StarredTrend.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    periodUnit: faker.helpers.arrayElement(["MONTH", "WEEK"]),
    lookback: faker.number.int({ min: 1, max: 12 }),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    categoryIds: [],
    includeUncategorized: false,
    createdAt: toDateTimeString(new Date().toISOString()),
    ...overrides,
  });
};

export const fakeCreateStarredTrendInput = (
  overrides: Partial<CreateStarredTrendInput> = {},
): CreateStarredTrendInput => {
  return {
    userId: faker.string.uuid(),
    periodUnit: faker.helpers.arrayElement(["MONTH", "WEEK"]),
    lookback: faker.number.int({ min: 1, max: 12 }),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    categoryIds: [],
    includeUncategorized: false,
    ...overrides,
  };
};
