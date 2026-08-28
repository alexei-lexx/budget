<template>
  <Chart type="bar" :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Chart } from "vue-chartjs";
import { useI18n } from "vue-i18n";
import { useTheme } from "vuetify";
import type { ExpenseTrend, TrendPeriodUnit } from "@/composables/useExpenseTrend";
import { formatCurrency } from "@/utils/currency";

ChartJS.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

interface Props {
  trend: ExpenseTrend;
  periodUnit: TrendPeriodUnit;
  currency: string;
}

const props = defineProps<Props>();

const { t, locale } = useI18n();
const theme = useTheme();

const colors = computed(() => theme.current.value.colors);

function parsePeriodStart(periodStart: string): Date {
  return new Date(`${periodStart}T00:00:00`);
}

function formatDayAndMonth(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

// Weekly bars carry a day, monthly bars only a month. The year lives in the
// tooltip instead, so a 12-period lookback repeats a month name on the axis.
const labels = computed(() =>
  props.trend.points.map((point) => {
    const date = parsePeriodStart(point.periodStart);
    return props.periodUnit === "MONTH"
      ? date.toLocaleDateString(locale.value, { month: "short" })
      : formatDayAndMonth(date, locale.value);
  }),
);

// A month names itself and its year; a week spells out its whole range, running
// period included, since the range describes the period and not the elapsed part
const tooltipTitles = computed(() =>
  props.trend.points.map((point) => {
    const start = parsePeriodStart(point.periodStart);
    if (props.periodUnit === "MONTH") {
      return start.toLocaleDateString(locale.value, { month: "long", year: "numeric" });
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDayAndMonth(start, locale.value)} - ${formatDayAndMonth(end, locale.value)}`;
  }),
);

const chartData = computed<ChartData>(() => {
  const amounts = props.trend.points.map((point) => point.amount);

  return {
    labels: labels.value,
    datasets: [
      {
        label: t("trends.chart.expenses"),
        data: amounts,
        // The running period is coloured apart from the completed ones
        backgroundColor: props.trend.points.map((point) =>
          point.isCurrent ? colors.value.secondary : colors.value.primary,
        ),
        order: 2,
      },
      {
        type: "line" as const,
        label: t("trends.chart.pastMedian"),
        data: amounts.map(() => props.trend.pastMedian),
        borderColor: colors.value.info,
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        order: 1,
      },
      {
        type: "line" as const,
        label: t("trends.chart.pastMedianAtSamePoint", {
          days: props.trend.elapsedDays,
        }),
        data: amounts.map(() => props.trend.pastMedianAtSamePoint),
        borderColor: colors.value.warning,
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        order: 1,
      },
    ],
  };
});

const chartOptions = computed<ChartOptions>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "index",
  },
  plugins: {
    legend: {
      position: "bottom",
    },
    tooltip: {
      callbacks: {
        title: ([item]) => (item ? (tooltipTitles.value[item.dataIndex] ?? "") : ""),
        label: (context) =>
          `${context.dataset.label}: ${formatCurrency(context.parsed.y ?? 0, props.currency)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => formatCurrency(Number(value), props.currency),
      },
    },
  },
}));
</script>
