<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- Header Section -->
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <h1 class="text-h4">Monthly Expense Reports</h1>
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
          :disabled="monthlyReportLoading"
          @navigate="handleMonthNavigation"
          class="mb-6"
        />

        <!-- Monthly Report Content -->
        <CategoryBreakdownTable
          :categories="monthlyReport?.categories"
          :currency-totals="monthlyReport?.currencyTotals"
          :loading="monthlyReportLoading"
          :error="reportError"
          :month-year="selectedMonthYearDisplay"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import CategoryBreakdownTable from "@/components/reports/CategoryBreakdownTable.vue";
import MonthNavigation from "@/components/reports/MonthNavigation.vue";
import { useMonthlyReports } from "@/composables/useMonthlyReports";
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

// Get monthly reports composable functions
const { getMonthlyReport } = useMonthlyReports();

// Global error state for better error handling
const globalError = ref<string | null>(null);

// Get monthly report data reactively based on selected month/year
const { monthlyReport, monthlyReportLoading, monthlyReportError } = getMonthlyReport(
  selectedYear,
  selectedMonth,
  "EXPENSE",
);

// Computed error message for consistent display
const reportError = computed(() => {
  return monthlyReportError.value?.message || null;
});

// Watch for errors and show global error alert
watch(monthlyReportError, (error) => {
  if (error) {
    globalError.value = `Failed to load monthly report: ${error.message}`;
    console.error("Monthly report error:", error);
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
