<template>
  <v-card class="monthly-weekday-report" elevation="2">
    <v-card-text>
      <!-- Currency Selector + Outlier Filter -->
      <v-row
        v-if="
          availableCurrencies.length > 0 || (displayReport && displayReport.weekdays.length > 0)
        "
        class="mb-4"
      >
        <v-col v-if="availableCurrencies.length > 0" cols="12" xd="6" md="4">
          <v-select
            id="currency-select"
            v-model="defaultCurrency"
            :items="currencyOptions"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="compact"
          />
        </v-col>
        <v-col v-if="displayReport && displayReport.weekdays.length > 0" cols="12" xd="6" md="auto">
          <v-checkbox
            v-model="excludeOutliers"
            label="Exclude unusual expenses"
            density="compact"
          />
        </v-col>
      </v-row>

      <div v-if="loading && !displayReport" class="d-flex justify-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <div v-else-if="error && !displayReport" class="text-center pa-4">
        <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
        <div class="text-h6 text-error mb-2">Failed to load weekday report</div>
        <div class="text-body-1 text-medium-emphasis">{{ error }}</div>
      </div>

      <v-empty-state
        v-else-if="!displayReport || displayReport.weekdays.length === 0"
        icon="mdi-file-document-outline"
        title="No transactions found"
        text="There are no expense transactions for this month."
      />

      <div v-else>
        <!-- Chart Canvas -->
        <div class="chart-container mb-4" :class="{ loading }">
          <canvas
            ref="chartCanvas"
            id="weekday-chart"
            aria-label="Monthly expense breakdown by weekday"
          />
        </div>

        <!-- Legend -->
        <div class="d-flex justify-center ga-4 mb-4 flex-wrap">
          <div class="d-flex align-center ga-2">
            <div style="width: 20px; height: 20px; background-color: #1976d2"></div>
            <span>Total</span>
          </div>
          <div class="d-flex align-center ga-2">
            <div style="width: 20px; height: 20px; background-color: #64b5f6"></div>
            <span>Average</span>
          </div>
        </div>

        <!-- Accessibility announcement for month changes -->
        <div aria-live="polite" aria-atomic="true" class="sr-only">
          Weekday expense report loaded for {{ monthYear }}
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type TooltipItem,
  type ChartOptions,
} from "chart.js";
import { useGetMonthlyWeekdayReportQuery } from "@/__generated__/vue-apollo";
import type { MonthlyWeekdayReportDay } from "@/__generated__/graphql-types";
import { formatCurrency } from "@/utils/currency";

// Register Chart.js components
ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// Chart instance and canvas ref
let chartInstance: ChartJS | null = null;
const chartCanvas = ref<HTMLCanvasElement | null>(null);

// Props
interface Props {
  year: number;
  month: number;
  monthYear?: string;
}

const props = withDefaults(defineProps<Props>(), {
  monthYear: "",
});

// Outlier filtering state
const excludeOutliers = ref(false);

// Query hook for fetching weekday report
const {
  result: reportResult,
  loading,
  error: queryError,
} = useGetMonthlyWeekdayReportQuery(
  () => ({
    year: props.year,
    month: props.month,
    type: "EXPENSE",
    excludeOutliers: excludeOutliers.value,
  }),
  {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  },
);

// Reactive state
const report = computed(() => reportResult.value?.monthlyWeekdayReport || null);
const error = computed(() => queryError.value?.message || null);

// Keep last valid report visible during refetch
const displayReport = ref<typeof report.value>(null);
watch(
  report,
  (newReport) => {
    if (newReport) displayReport.value = newReport;
  },
  { immediate: true },
);

// Currency selector state
const defaultCurrency = ref<string | null>(null);

// Available currencies from report
const availableCurrencies = computed(() => {
  if (!displayReport.value) return [];
  return displayReport.value.currencyTotals.map((ct) => ct.currency).sort();
});

// Currency options for select dropdown
const currencyOptions = computed(() => {
  return [
    { label: "All Currencies (Combined)", value: null },
    ...availableCurrencies.value.map((currency) => ({
      label: currency,
      value: currency,
    })),
  ];
});

// Initialize default currency when report loads
watch(
  () => report.value,
  (newReport) => {
    if (newReport && !defaultCurrency.value) {
      // If only one currency, select it; otherwise select "All"
      if (newReport.currencyTotals.length === 1) {
        defaultCurrency.value = newReport.currencyTotals[0]?.currency ?? null;
      } else {
        defaultCurrency.value = null;
      }
    }
  },
);

// Weekday labels (Mon-Sun)
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Weekday order for matching labels with data
const getWeekdayLabel = (weekday: string): string => {
  const labelMap: Record<string, string> = {
    MON: "Mon",
    TUE: "Tue",
    WED: "Wed",
    THU: "Thu",
    FRI: "Fri",
    SAT: "Sat",
    SUN: "Sun",
    // Also handle if they come in different formats
    Mon: "Mon",
    Tue: "Tue",
    Wed: "Wed",
    Thu: "Thu",
    Fri: "Fri",
    Sat: "Sat",
    Sun: "Sun",
  };
  return labelMap[weekday] || weekday;
};

// Build chart data from report
const buildChartData = () => {
  if (!displayReport.value) {
    return {
      labels: weekdayLabels,
      datasets: [],
    };
  }

  const selectedCurrency = defaultCurrency.value;
  const weekdayData: Record<string, { total: number; average: number }> = {};

  // Initialize all weekdays
  weekdayLabels.forEach((label) => {
    weekdayData[label] = { total: 0, average: 0 };
  });

  // Fill in data
  displayReport.value.weekdays.forEach((weekday: MonthlyWeekdayReportDay) => {
    const label = getWeekdayLabel(weekday.weekday);

    if (selectedCurrency) {
      // Single currency selected
      const breakdown = weekday.currencyBreakdowns.find((cb) => cb.currency === selectedCurrency);
      if (breakdown) {
        weekdayData[label] = {
          total: breakdown.totalAmount,
          average: breakdown.averageAmount,
        };
      }
    } else {
      // All currencies - aggregate all breakdowns
      const total = weekday.currencyBreakdowns.reduce((sum, cb) => sum + cb.totalAmount, 0);
      const average = weekday.currencyBreakdowns.reduce((sum, cb) => sum + cb.averageAmount, 0);
      weekdayData[label] = { total, average };
    }
  });

  const totalDataset = weekdayLabels.map((label) => weekdayData[label]?.total ?? 0);
  const averageDataset = weekdayLabels.map((label) => weekdayData[label]?.average ?? 0);

  return {
    labels: weekdayLabels,
    datasets: [
      {
        label: "Total",
        data: totalDataset,
        backgroundColor: "#1976D2",
        borderColor: "#1976D2",
        borderWidth: 1,
      },
      {
        label: "Average",
        data: averageDataset,
        backgroundColor: "#64B5F6",
        borderColor: "#64B5F6",
        borderWidth: 1,
      },
    ],
  };
};

// Update chart when data changes
const updateChart = () => {
  if (!chartCanvas.value) {
    return;
  }

  const data = buildChartData();

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0,0,0,0.7)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: "#ddd",
        borderWidth: 1,
        padding: 8,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<"bar">[]) => {
            return context[0]?.label || "";
          },
          label: (context: TooltipItem<"bar">) => {
            const selectedCurrency = defaultCurrency.value;

            // Find the weekday data for this x-axis value
            const weekday = displayReport.value?.weekdays.find(
              (w: MonthlyWeekdayReportDay) => getWeekdayLabel(w.weekday) === context.label,
            );
            const breakdown = weekday?.currencyBreakdowns.find(
              (cb) => !selectedCurrency || cb.currency === selectedCurrency,
            );

            // Get both Total and Average values from datasets
            const totalDataset = context.chart.data.datasets[0];
            const totalData = totalDataset?.data as number[];
            const totalValue = totalData?.[context.dataIndex] || 0;

            const averageDataset = context.chart.data.datasets[1];
            const averageData = averageDataset?.data as number[];
            const average = averageData?.[context.dataIndex] || 0;

            const percentage = breakdown?.percentage || 0;

            // Return array of strings for multiple lines
            const lines = [
              `Total: ${formatCurrency(totalValue, selectedCurrency || "")} (${percentage}%)`,
              `Average: ${formatCurrency(average, selectedCurrency || "")}`,
            ];

            // Add outlier info if present
            if (breakdown?.outlierCount && breakdown?.outlierTotalAmount) {
              lines.push(
                `Outliers: ${breakdown.outlierCount} (${formatCurrency(breakdown.outlierTotalAmount, selectedCurrency || "")})`,
              );
            }

            return lines;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: string | number) {
            return formatCurrency(value as number, defaultCurrency.value || "");
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Update existing chart in place (avoids page jump)
  if (chartInstance && data.datasets[0] && data.datasets[1]) {
    const dataset0 = chartInstance.data.datasets[0];
    const dataset1 = chartInstance.data.datasets[1];
    if (dataset0 && dataset1) {
      chartInstance.data.labels = data.labels;
      dataset0.data = data.datasets[0].data;
      dataset1.data = data.datasets[1].data;
      chartInstance.update("none");
      return;
    }
  }

  // Create new chart only on first render
  const ctx = chartCanvas.value.getContext("2d");
  if (ctx) {
    chartInstance = new ChartJS(ctx, {
      type: "bar",
      data: data,
      options: options,
    });
  }
};

// Watch for data changes and update chart
watch([() => displayReport.value, () => defaultCurrency.value], async () => {
  if (displayReport.value && displayReport.value.weekdays.length > 0) {
    await nextTick();
    updateChart();
  }
});

// Create chart on mount when canvas is available
onMounted(async () => {
  await nextTick();
  if (displayReport.value && displayReport.value.weekdays.length > 0) {
    updateChart();
  }
});

// Cleanup on unmount
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.monthly-weekday-report {
  width: 100%;
}

.chart-container {
  position: relative;
  height: 400px;
  width: 100%;
  transition: opacity 0.2s ease;
}

.chart-container.loading {
  opacity: 0.6;
  pointer-events: none;
}

canvas {
  width: 100% !important;
  height: 100% !important;
}

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
