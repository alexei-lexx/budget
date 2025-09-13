import { ref, computed, unref, type Ref } from "vue";
import {
  useGetMonthlyReportQuery,
  type TransactionType,
  type MonthlyReport,
  type MonthlyReportCategory,
  type MonthlyReportCurrencyBreakdown,
  type MonthlyReportCurrencyTotal,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type {
  TransactionType,
  MonthlyReport,
  MonthlyReportCategory,
  MonthlyReportCurrencyBreakdown,
  MonthlyReportCurrencyTotal,
};

export function useMonthlyReports() {
  const monthlyReportError = ref<string | null>(null);

  // Create a reactive function to get monthly report for a given year, month, and type
  const getMonthlyReport = (
    year: Ref<number> | number,
    month: Ref<number> | number,
    type: TransactionType,
  ) => {
    const {
      result: monthlyReportResult,
      loading: monthlyReportLoading,
      error: monthlyReportQueryError,
      refetch: refetchMonthlyReport,
    } = useGetMonthlyReportQuery(
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
    const monthlyReport = computed(() => {
      return monthlyReportResult.value?.monthlyReport || null;
    });

    // Watch for query errors
    if (monthlyReportQueryError.value) {
      console.error("Monthly report query failed:", monthlyReportQueryError.value);
      monthlyReportError.value =
        monthlyReportQueryError.value.message || "Failed to fetch monthly report";
    }

    return {
      monthlyReport,
      monthlyReportLoading,
      monthlyReportError: monthlyReportQueryError,
      refetchMonthlyReport,
    };
  };

  return {
    // Main functions
    getMonthlyReport,

    // Global error state
    monthlyReportError,
  };
}
