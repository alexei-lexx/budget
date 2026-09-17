import { ref, computed, watch, unref, type Ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError } from "@/utils/graphqlError";
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
  const { t } = i18n.global;

  // Create a reactive function to get by-category report for a given year, month, and type
  const getByCategoryReport = (
    year: Ref<number> | number,
    month: Ref<number | null> | number | null,
    type: ReportType,
  ) => {
    const byCategoryReportError = ref<string | null>(null);

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
    watch(byCategoryReportQueryError, (error) => {
      if (error) {
        console.error("By-category report query failed:", error);

        byCategoryReportError.value = isInternalServerError(error)
          ? t("reports.errors.fetchFailed")
          : error.message;
      }
    });

    return {
      byCategoryReport,
      byCategoryReportLoading,
      byCategoryReportError,
      refetchByCategoryReport,
    };
  };

  return {
    // Main functions
    getByCategoryReport,
  };
}
