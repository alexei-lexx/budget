<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6 flex-column flex-sm-row ga-3 ga-sm-0 justify-sm-space-between"
    >
      <h1 class="text-h5 text-sm-h4">Expense Report</h1>
    </div>

    <!-- Global Error Alert -->
    <v-alert
      v-if="globalError"
      type="error"
      variant="tonal"
      class="mb-6"
      closable
      @click:close="clearGlobalError"
    >
      <v-alert-title>Report Error</v-alert-title>
      <div>{{ globalError }}</div>
    </v-alert>

    <!-- Month Navigation -->
    <MonthNavigation
      :year="selectedYear"
      :month="selectedMonth"
      :disabled="byCategoryReportLoading"
      @navigate="handleMonthNavigation"
      class="mb-6"
    />

    <!-- Report Content -->
    <CategoryBreakdownTable
      :categories="byCategoryReport?.categories"
      :currency-totals="byCategoryReport?.currencyTotals"
      :loading="byCategoryReportLoading"
      :error="reportError"
      :month-year="selectedMonthYearDisplay"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import CategoryBreakdownTable from "@/components/reports/CategoryBreakdownTable.vue";
import MonthNavigation from "@/components/reports/MonthNavigation.vue";
import { useByCategoryReport } from "@/composables/useByCategoryReport";
import { isValidYearMonth } from "@/utils/dateValidation";
import { formatMonthYear } from "@/utils/date";

// Router for URL parameter management
const route = useRoute();
const router = useRouter();

// Initialize with current date
const now = new Date();
const defaultYear = now.getFullYear();
const defaultMonth = now.getMonth() + 1;

// Reactive state for selected month and year
const selectedYear = ref<number>(defaultYear);
const selectedMonth = ref<number>(defaultMonth);

// Computed display string
const selectedMonthYearDisplay = computed(() => {
  return formatMonthYear(selectedYear.value, selectedMonth.value);
});

// Get by-category report composable functions
const { getByCategoryReport } = useByCategoryReport();

// Global error state for better error handling
const globalError = ref<string | null>(null);

// Get report data reactively based on selected month/year
const { byCategoryReport, byCategoryReportLoading, byCategoryReportError } = getByCategoryReport(
  selectedYear,
  selectedMonth,
  "EXPENSE",
);

// Computed error message for consistent display
const reportError = computed(() => {
  return byCategoryReportError.value?.message || null;
});

// Watch for errors and show global error alert
watch(byCategoryReportError, (error) => {
  if (error) {
    globalError.value = `Failed to load report: ${error.message}`;
    console.error("By-category report error:", error);
  }
});

// Clear global error
const clearGlobalError = () => {
  globalError.value = null;
};

// Handle month navigation
const handleMonthNavigation = ({ year, month }: { year: number; month: number }) => {
  // Clear any existing errors when navigating
  globalError.value = null;

  selectedYear.value = year;
  selectedMonth.value = month;

  // Update URL parameters for bookmarkable URLs
  router.replace({
    query: {
      ...route.query,
      year: year.toString(),
      month: month.toString(),
    },
  });
};

// Initialize from URL parameters on mount
onMounted(() => {
  const yearParam = route.query.year;
  const monthParam = route.query.month;

  if (yearParam && monthParam) {
    const year = parseInt(yearParam as string);
    const month = parseInt(monthParam as string);

    // Validate parameters
    if (isValidYearMonth(year, month)) {
      selectedYear.value = year;
      selectedMonth.value = month;
    } else {
      globalError.value = "Invalid month or year in URL parameters";
    }
  }
});
</script>
