<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Load Failure -->
    <v-alert v-if="trendError" type="error" variant="tonal" class="mb-6">
      <v-alert-title>{{ t("trends.errors.title") }}</v-alert-title>
      <div>{{ trendError }}</div>
    </v-alert>

    <StarredTrendsList
      :starred-trends="starredTrends"
      :categories="expenseCategories"
      @apply="handleApply"
    />

    <v-card class="mb-6" variant="outlined">
      <TrendFilters
        :selection="selection"
        :categories="expenseCategories"
        :loading="expenseTrendLoading"
        @apply="handleApply"
        @clear="handleClear"
      />
    </v-card>

    <v-card variant="outlined">
      <v-card-text>
        <div class="trend-chart">
          <ExpenseTrendChart
            v-if="expenseTrend"
            :trend="expenseTrend"
            :period-unit="selection.periodUnit"
            :currency="selection.currency"
          />
          <div v-else class="d-flex align-center justify-center h-100">
            <v-progress-circular v-if="expenseTrendLoading" indeterminate color="primary" />
          </div>
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import type { TrendPeriodUnit } from "@/__generated__/vue-apollo";
import ExpenseTrendChart from "@/components/reports/ExpenseTrendChart.vue";
import StarredTrendsList from "@/components/reports/StarredTrendsList.vue";
import TrendFilters from "@/components/reports/TrendFilters.vue";
import { useCategories } from "@/composables/useCategories";
import { useCurrencies } from "@/composables/useCurrencies";
import { useExpenseTrend, type TrendSelection } from "@/composables/useExpenseTrend";
import { useStarredTrends } from "@/composables/useStarredTrends";
import { getTodayDateString } from "@/utils/date";

const DEFAULT_PERIOD_UNIT: TrendPeriodUnit = "MONTH";
const DEFAULT_LOOKBACK = 3;

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// Fixed for the lifetime of the page, so the grid never shifts mid-session
const today = ref(getTodayDateString());

const { categories } = useCategories("EXPENSE");
const { defaultCurrency } = useCurrencies();
const { starredTrends } = useStarredTrends();

const expenseCategories = computed(() => categories.value?.categories ?? []);

// Parses one URL parameter, falling back to its default when absent or invalid
function readPeriodUnit(): TrendPeriodUnit {
  return route.query.periodUnit === "WEEK" || route.query.periodUnit === "MONTH"
    ? route.query.periodUnit
    : DEFAULT_PERIOD_UNIT;
}

function readLookback(): number {
  const lookback = Number(route.query.lookback);
  return Number.isInteger(lookback) && lookback >= 1 && lookback <= 12
    ? lookback
    : DEFAULT_LOOKBACK;
}

function readCategoryIds(): string[] {
  const categoryIds = route.query.categories;
  return typeof categoryIds === "string" && categoryIds !== "" ? categoryIds.split(",") : [];
}

// Committed selection: only Apply, Clear and the initial URL read change it
const appliedSelection = ref<TrendSelection>({
  periodUnit: readPeriodUnit(),
  lookback: readLookback(),
  currency: typeof route.query.currency === "string" ? route.query.currency : "",
  categoryIds: readCategoryIds(),
  includeUncategorized: route.query.uncategorized === "1",
});

// The default currency resolves once supported currencies load
const selection = computed<TrendSelection>(() => ({
  ...appliedSelection.value,
  currency: appliedSelection.value.currency || defaultCurrency.value,
}));

const { expenseTrend, expenseTrendLoading, expenseTrendError } = useExpenseTrend(selection, today);

const trendError = computed(() =>
  expenseTrendError.value
    ? t("trends.errors.loadFailed", { message: expenseTrendError.value.message })
    : null,
);

function handleApply(newSelection: TrendSelection) {
  appliedSelection.value = newSelection;

  router.replace({
    query: {
      periodUnit: newSelection.periodUnit,
      lookback: newSelection.lookback.toString(),
      currency: newSelection.currency,
      ...(newSelection.categoryIds.length > 0 && {
        categories: newSelection.categoryIds.join(","),
      }),
      ...(newSelection.includeUncategorized && { uncategorized: "1" }),
    },
  });
}

function handleClear() {
  appliedSelection.value = {
    periodUnit: DEFAULT_PERIOD_UNIT,
    lookback: DEFAULT_LOOKBACK,
    currency: defaultCurrency.value,
    categoryIds: [],
    includeUncategorized: false,
  };

  router.replace({ query: {} });
}
</script>

<style scoped>
.trend-chart {
  height: 320px;
}

@media (min-width: 960px) {
  .trend-chart {
    height: 420px;
  }
}
</style>
