import { ref, computed } from "vue";
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
  const useMonthlyReport = (year: number, month: number, type: TransactionType) => {
    const {
      result: monthlyReportResult,
      loading: monthlyReportLoading,
      error: monthlyReportQueryError,
      refetch: refetchMonthlyReport,
    } = useGetMonthlyReportQuery(
      () => ({
        year,
        month,
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

  // Helper function to get current month expense report
  const useCurrentMonthExpenseReport = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    return useMonthlyReport(currentYear, currentMonth, "EXPENSE");
  };

  // Helper function to format currency amount
  const formatCurrencyAmount = (amount: number, currency: string): string => {
    const currencySymbols: Record<string, string> = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "C$",
      AUD: "A$",
    };

    const symbol = currencySymbols[currency] || currency;
    const formattedAmount = amount.toFixed(2);

    // For currencies like USD, EUR, show symbol before amount
    if (["USD", "EUR", "GBP", "CAD", "AUD"].includes(currency)) {
      return `${symbol}${formattedAmount}`;
    }

    // For others like JPY, show after
    return `${formattedAmount} ${symbol}`;
  };

  // Helper function to get month name
  const getMonthName = (month: number): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || "";
  };

  // Helper function to format month year display
  const formatMonthYear = (year: number, month: number): string => {
    return `${getMonthName(month)} ${year}`;
  };

  return {
    // Main functions
    useMonthlyReport,
    useCurrentMonthExpenseReport,

    // Helper functions
    formatCurrencyAmount,
    getMonthName,
    formatMonthYear,

    // Global error state
    monthlyReportError,
  };
}
