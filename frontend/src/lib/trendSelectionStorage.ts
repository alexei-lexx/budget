import { appStorage } from "./appStorage";
import type { TrendPeriodUnit, TrendSelection } from "@/composables/useExpenseTrend";

const STORAGE_KEY = "trendSelection";

const DEFAULT_PERIOD_UNIT: TrendPeriodUnit = "MONTH";
const DEFAULT_LOOKBACK = 3;

// Mirrors the per-field fallback behavior used for URL query parameters in Trends.vue
function readPeriodUnit(value: unknown): TrendPeriodUnit {
  return value === "WEEK" || value === "MONTH" ? value : DEFAULT_PERIOD_UNIT;
}

function readLookback(value: unknown): number {
  const lookback = Number(value);
  return Number.isInteger(lookback) && lookback >= 1 && lookback <= 12
    ? lookback
    : DEFAULT_LOOKBACK;
}

function readCategoryIds(value: unknown): string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string") ? value : [];
}

function readCurrency(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readIncludeUncategorized(value: unknown): true | undefined {
  return value === true ? true : undefined;
}

export const trendSelectionStorage = {
  read(): TrendSelection | undefined {
    const raw = appStorage.getItem(STORAGE_KEY);
    if (raw === null) return undefined;

    let stored: unknown;
    try {
      stored = JSON.parse(raw);
    } catch {
      return undefined;
    }

    if (typeof stored !== "object" || stored === null) return undefined;

    return {
      periodUnit: readPeriodUnit("periodUnit" in stored ? stored.periodUnit : undefined),
      lookback: readLookback("lookback" in stored ? stored.lookback : undefined),
      currency: readCurrency("currency" in stored ? stored.currency : undefined),
      categoryIds: readCategoryIds("categoryIds" in stored ? stored.categoryIds : undefined),
      includeUncategorized: readIncludeUncategorized(
        "includeUncategorized" in stored ? stored.includeUncategorized : undefined,
      ),
    };
  },

  write(selection: TrendSelection): void {
    appStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  },
};
