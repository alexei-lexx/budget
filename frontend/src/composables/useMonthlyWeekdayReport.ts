import { computed, unref, type Ref } from "vue";
import {
  useGetMonthlyWeekdayReportQuery,
  type TransactionType,
  type MonthlyWeekdayReport,
  type MonthlyWeekdayReportDay,
  type MonthlyWeekdayReportCurrencyTotal,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type {
  TransactionType,
  MonthlyWeekdayReport,
  MonthlyWeekdayReportDay,
  MonthlyWeekdayReportCurrencyTotal,
};

export function useMonthlyWeekdayReport(
  year: Ref<number> | number,
  month: Ref<number> | number,
  type: TransactionType,
) {
  const {
    result: reportResult,
    loading: reportLoading,
    error: reportQueryError,
    refetch: refetchReport,
  } = useGetMonthlyWeekdayReportQuery(
    () => ({
      year: unref(year),
      month: unref(month),
      type,
    }),
    () => ({
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    }),
  );

  // Computed report data
  const report = computed(() => {
    return reportResult.value?.monthlyWeekdayReport || null;
  });

  return {
    report,
    reportLoading,
    reportError: reportQueryError,
    refetchReport,
  };
}
