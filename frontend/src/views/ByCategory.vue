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

const route = useRoute();
const router = useRouter();

const now = new Date();
const defaultYear = now.getFullYear();
const defaultMonth = now.getMonth() + 1;

const selectedYear = ref<number>(defaultYear);
const selectedMonth = ref<number>(defaultMonth);

const selectedMonthYearDisplay = computed(() => {
  return formatMonthYear(selectedYear.value, selectedMonth.value);
});

const { getByCategoryReport } = useByCategoryReport();

const globalError = ref<string | null>(null);

const { byCategoryReport, byCategoryReportLoading, byCategoryReportError } =
  getByCategoryReport(selectedYear, selectedMonth, "EXPENSE");

const reportError = computed(() => {
  return byCategoryReportError.value?.message || null;
});

watch(byCategoryReportError, (error) => {
  if (error) {
    globalError.value = `Failed to load report: ${error.message}`;
    console.error("By-category report error:", error);
  }
});

const clearGlobalError = () => {
  globalError.value = null;
};

const handleMonthNavigation = ({ year, month }: { year: number; month: number }) => {
  globalError.value = null;

  selectedYear.value = year;
  selectedMonth.value = month;

  router.replace({
    query: {
      ...route.query,
      year: year.toString(),
      month: month.toString(),
    },
  });
};

onMounted(() => {
  const yearParam = route.query.year;
  const monthParam = route.query.month;

  if (yearParam && monthParam) {
    const year = parseInt(yearParam as string);
    const month = parseInt(monthParam as string);

    if (isValidYearMonth(year, month)) {
      selectedYear.value = year;
      selectedMonth.value = month;
    } else {
      globalError.value = "Invalid month or year in URL parameters";
    }
  }
});
</script>
