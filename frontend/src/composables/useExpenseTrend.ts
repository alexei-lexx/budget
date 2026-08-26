import { computed, type Ref } from "vue";
import {
  useGetExpenseTrendQuery,
  type ExpenseTrend,
  type ExpenseTrendPoint,
  type TrendPeriod,
} from "@/__generated__/vue-apollo";

// Re-export types for consumers of this composable
export type { ExpenseTrend, ExpenseTrendPoint, TrendPeriod };

export interface TrendSelection {
  period: TrendPeriod;
  lookback: number;
  currency: string;
  categoryIds: string[];
  includeUncategorized: boolean;
}

/**
 * Fetches the expense trend for an applied selection.
 * The selection is reactive, so committing a new one refetches.
 */
export function useExpenseTrend(selection: Ref<TrendSelection>, today: Ref<string>) {
  const {
    result: expenseTrendResult,
    loading: expenseTrendLoading,
    error: expenseTrendError,
  } = useGetExpenseTrendQuery(
    () => ({
      input: {
        period: selection.value.period,
        lookback: selection.value.lookback,
        currency: selection.value.currency,
        today: today.value,
        categoryIds: selection.value.categoryIds,
        includeUncategorized: selection.value.includeUncategorized,
      },
    }),
    () => ({
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
      // Currency is empty until supported currencies arrive
      enabled: selection.value.currency !== "",
    }),
  );

  const expenseTrend = computed(() => expenseTrendResult.value?.expenseTrend ?? null);

  return {
    expenseTrend,
    expenseTrendLoading,
    expenseTrendError,
  };
}
