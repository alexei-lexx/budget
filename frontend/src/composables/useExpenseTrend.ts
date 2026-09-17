import { computed, ref, watch, type Ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError } from "@/utils/graphqlError";
import {
  useGetExpenseTrendQuery,
  type ExpenseTrend,
  type ExpenseTrendPoint,
  type TrendPeriodUnit,
} from "@/__generated__/vue-apollo";

// Re-export types for consumers of this composable
export type { ExpenseTrend, ExpenseTrendPoint, TrendPeriodUnit };

export interface TrendSelection {
  periodUnit: TrendPeriodUnit;
  lookback: number;
  currency: string;
  categoryIds: string[];
  includeUncategorized?: true;
}

/**
 * Fetches the expense trend for an applied selection.
 * The selection is reactive, so committing a new one refetches.
 */
export function useExpenseTrend(selection: Ref<TrendSelection>, today: Ref<string>) {
  const { t } = i18n.global;
  const expenseTrendError = ref<string | null>(null);

  const {
    result: expenseTrendResult,
    loading: expenseTrendLoading,
    error: expenseTrendQueryError,
  } = useGetExpenseTrendQuery(
    () => ({
      input: {
        periodUnit: selection.value.periodUnit,
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

  // Watch for query errors
  watch(expenseTrendQueryError, (error) => {
    if (error) {
      console.error("Expense trend query failed:", error);

      expenseTrendError.value = isInternalServerError(error)
        ? t("trends.errors.loadFailed")
        : error.message;
    }
  });

  const expenseTrend = computed(() => expenseTrendResult.value?.expenseTrend ?? null);

  return {
    // Data
    expenseTrend,

    // Loading states
    expenseTrendLoading,

    // Error state
    expenseTrendError,
  };
}
