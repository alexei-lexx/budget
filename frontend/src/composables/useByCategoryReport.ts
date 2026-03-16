import { ref, computed, unref, type Ref } from "vue";
import {
  useGetByCategoryReportQuery,
  type ByCategoryReport,
  type ByCategoryReportCategory,
  type ByCategoryReportCurrencyBreakdown,
  type ByCategoryReportCurrencyTotal,
  type ReportType,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type {
  ByCategoryReport,
  ByCategoryReportCategory,
  ByCategoryReportCurrencyBreakdown,
  ByCategoryReportCurrencyTotal,
};

export function useByCategoryReport() {
  const byCategoryReportError = ref<string | null>(null);

  // Create a reactive function to get by-category report for a given year, month, and type
  const getByCategoryReport = (
    year: Ref<number> | number,
    month: Ref<number> | number,
    type: ReportType,
  ) => {
    const {
      result: byCategoryReportResult,
      loading: byCategoryReportLoading,
      error: byCategoryReportQueryError,
      refetch: refetchByCategoryReport,
    } = useGetByCategoryReportQuery(
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
    const byCategoryReport = computed(() => {
      return byCategoryReportResult.value?.byCategoryReport || null;
    });

    // Watch for query errors
    if (byCategoryReportQueryError.value) {
      console.error("By-category report query failed:", byCategoryReportQueryError.value);
      byCategoryReportError.value =
        byCategoryReportQueryError.value.message || "Failed to fetch by-category report";
    }

    return {
      byCategoryReport,
      byCategoryReportLoading,
      byCategoryReportError: byCategoryReportQueryError,
      refetchByCategoryReport,
    };
  };

  return {
    // Main functions
    getByCategoryReport,

    // Global error state
    byCategoryReportError,
  };
}
