<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6 flex-column flex-sm-row ga-3 ga-sm-0 justify-sm-space-between"
    >
      <h1 class="text-h5 text-sm-h4">Expense Report</h1>
      <v-btn-toggle v-model="viewMode" mandatory density="compact" color="primary">
        <v-btn value="monthly">Monthly</v-btn>
        <v-btn value="yearly">Yearly</v-btn>
      </v-btn-toggle>
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

    <!-- Month Navigation (monthly mode) -->
    <MonthNavigation
      v-if="viewMode === 'monthly'"
      :year="selectedYear"
      :month="selectedMonth"
      :disabled="byCategoryReportLoading"
      class="mb-6"
      @navigate="handleMonthNavigation"
    />

    <!-- Year Navigation (yearly mode) -->
    <YearNavigation
      v-else
      :year="selectedYear"
      :disabled="byCategoryReportLoading"
      class="mb-6"
      @navigate="handleYearNavigation"
    />

    <!-- Report Content -->
    <CategoryBreakdownTable
      :categories="byCategoryReport?.categories"
      :currency-totals="byCategoryReport?.currencyTotals"
      :loading="byCategoryReportLoading"
      :error="reportError"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import CategoryBreakdownTable from "@/components/reports/CategoryBreakdownTable.vue";
import MonthNavigation from "@/components/reports/MonthNavigation.vue";
import YearNavigation from "@/components/reports/YearNavigation.vue";
import { useByCategoryReport } from "@/composables/useByCategoryReport";
import { isValidYearMonth } from "@/utils/dateValidation";

type ViewMode = "monthly" | "yearly";

// Router for URL parameter management
const route = useRoute();
const router = useRouter();

// Initialize with current date
const now = new Date();
const defaultYear = now.getFullYear();
const defaultMonth = now.getMonth() + 1;

// Reactive state for selected view mode, year and month
const viewMode = ref<ViewMode>("monthly");
const selectedYear = ref<number>(defaultYear);
const selectedMonth = ref<number>(defaultMonth);

// null in yearly mode — signals full-year report to the query
const selectedMonthNullable = computed<number | null>(() =>
  viewMode.value === "monthly" ? selectedMonth.value : null,
);

// Get by-category report composable functions
const { getByCategoryReport } = useByCategoryReport();

// Global error state for better error handling
const globalError = ref<string | null>(null);

// Get report data reactively based on selected view mode, year and month
const { byCategoryReport, byCategoryReportLoading, byCategoryReportError } = getByCategoryReport(
  selectedYear,
  selectedMonthNullable,
  "EXPENSE",
);

// Computed error message for consistent display
const reportError = computed(() => byCategoryReportError.value?.message || null);

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

// Handle year navigation
const handleYearNavigation = ({ year }: { year: number }) => {
  // Clear any existing errors when navigating
  globalError.value = null;

  selectedYear.value = year;

  // Update URL parameters for bookmarkable URLs
  router.replace({ query: { year: year.toString() } });
};

// Update URL when view mode changes
watch(viewMode, (mode) => {
  globalError.value = null;

  if (mode === "yearly") {
    router.replace({ query: { year: selectedYear.value.toString() } });
  } else {
    selectedMonth.value = defaultMonth;

    router.replace({
      query: {
        year: selectedYear.value.toString(),
        month: defaultMonth.toString(),
      },
    });
  }
});

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
      viewMode.value = "monthly";
    } else {
      globalError.value = "Invalid month or year in URL parameters";
    }
  } else if (yearParam) {
    const year = parseInt(yearParam as string);
    if (Number.isInteger(year)) {
      selectedYear.value = year;
      viewMode.value = "yearly";
    } else {
      globalError.value = "Invalid year in URL parameters";
    }
  }
});
</script>
