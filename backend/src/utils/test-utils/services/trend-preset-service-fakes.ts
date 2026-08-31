import { faker } from "@faker-js/faker";
import { LOOKBACK_MAX, LOOKBACK_MIN } from "../../../models/trend-preset";
import { CreateTrendPresetServiceInput } from "../../../services/trend-preset-service";

export const fakeCreateTrendPresetServiceInput = (
  overrides: Partial<CreateTrendPresetServiceInput> = {},
): CreateTrendPresetServiceInput => {
  return {
    periodUnit: faker.helpers.arrayElement(["MONTH", "WEEK"]),
    lookback: faker.number.int({ min: LOOKBACK_MIN, max: LOOKBACK_MAX }),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    categoryIds: [],
    includeUncategorized: faker.helpers.arrayElement([true, undefined]),
    ...overrides,
  };
};
