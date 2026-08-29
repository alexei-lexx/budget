import { faker } from "@faker-js/faker";
import {
  CreateTrendPresetInput,
  LOOKBACK_MAX,
  LOOKBACK_MIN,
  TrendPreset,
  TrendPresetData,
} from "../../../models/trend-preset";
import { toDateTimeString } from "../../../types/date-time-string";

export const fakeTrendPreset = (
  overrides: Partial<TrendPresetData> = {},
): TrendPreset => {
  return TrendPreset.fromPersistence({
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    periodUnit: faker.helpers.arrayElement(["MONTH", "WEEK"]),
    lookback: faker.number.int({ min: LOOKBACK_MIN, max: LOOKBACK_MAX }),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    categoryIds: [],
    includeUncategorized: faker.datatype.boolean(),
    createdAt: toDateTimeString(new Date().toISOString()),
    ...overrides,
  });
};

export const fakeCreateTrendPresetInput = (
  overrides: Partial<CreateTrendPresetInput> = {},
): CreateTrendPresetInput => {
  return {
    userId: faker.string.uuid(),
    periodUnit: faker.helpers.arrayElement(["MONTH", "WEEK"]),
    lookback: faker.number.int({ min: LOOKBACK_MIN, max: LOOKBACK_MAX }),
    currency: faker.helpers.arrayElement(["EUR", "USD"]),
    categoryIds: [],
    includeUncategorized: faker.datatype.boolean(),
    ...overrides,
  };
};
