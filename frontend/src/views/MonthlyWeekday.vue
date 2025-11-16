<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <!-- Header Section -->
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <h1 :class="$vuetify.display.xs ? 'text-h5' : 'text-h4'">
            Monthly Expense Report by Weekday
          </h1>
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
          :disabled="reportLoading"
          @navigate="handleMonthNavigation"
          class="mb-6"
        />

        <!-- Monthly Weekday Report Content -->
        <MonthlyWeekdayReport
          :year="selectedYear"
          :month="selectedMonth"
          :month-year="selectedMonthYearDisplay"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import MonthlyWeekdayReport from "@/components/reports/MonthlyWeekdayReport.vue";
import MonthNavigation from "@/components/reports/MonthNavigation.vue";
import { useMonthlyWeekdayReport } from "@/composables/useMonthlyWeekdayReport";
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

// Global error state for better error handling
const globalError = ref<string | null>(null);

// Get monthly weekday report data reactively based on selected month/year
const { reportLoading, reportError } = useMonthlyWeekdayReport(
  selectedYear,
  selectedMonth,
  "EXPENSE",
);

// Watch for errors and show global error alert
watch(reportError, (error) => {
  if (error) {
    globalError.value = `Failed to load weekday report: ${error.message}`;
    console.error("Weekday report error:", error);
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

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
