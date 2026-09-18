<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <TrendPresetsList
      :trend-presets="trendPresets"
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
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { TrendPeriodUnit } from "@/__generated__/vue-apollo";
import ExpenseTrendChart from "@/components/reports/ExpenseTrendChart.vue";
import TrendFilters from "@/components/reports/TrendFilters.vue";
import TrendPresetsList from "@/components/reports/TrendPresetsList.vue";
import { useCategories } from "@/composables/useCategories";
import { useCurrencies } from "@/composables/useCurrencies";
import { useExpenseTrend, type TrendSelection } from "@/composables/useExpenseTrend";
import { useSnackbar } from "@/composables/useSnackbar";
import { useTrendPresets } from "@/composables/useTrendPresets";
import { trendSelectionStorage } from "@/lib/trendSelectionStorage";
import { getTodayDateString } from "@/utils/date";

const DEFAULT_PERIOD_UNIT: TrendPeriodUnit = "MONTH";
const DEFAULT_LOOKBACK = 3;

const route = useRoute();
const router = useRouter();
const { showErrorSnackbar } = useSnackbar();

// Fixed for the lifetime of the page, so the grid never shifts mid-session
const today = ref(getTodayDateString());

const { categories } = useCategories("EXPENSE");
const { defaultCurrency, errorMessage: currenciesErrorMessage } = useCurrencies();
const { trendPresets, trendPresetsError } = useTrendPresets();

watch(trendPresetsError, (error) => {
  if (error) showErrorSnackbar(error);
});

watch(currenciesErrorMessage, (error) => {
  if (error) showErrorSnackbar(error);
});

const expenseCategories = computed(() => categories.value?.categories ?? []);

function buildDefaultSelection(): TrendSelection {
  return {
    periodUnit: DEFAULT_PERIOD_UNIT,
    lookback: DEFAULT_LOOKBACK,
    currency: defaultCurrency.value,
    categoryIds: [],
    includeUncategorized: undefined,
  };
}

function hasSelectionInUrlQuery(): boolean {
  return (
    route.query.periodUnit !== undefined ||
    route.query.lookback !== undefined ||
    route.query.currency !== undefined ||
    route.query.categories !== undefined ||
    route.query.uncategorized !== undefined
  );
}

// Falls back to defaults when a URL parameter is absent or invalid
function readSelectionFromUrlQuery(): TrendSelection {
  const periodUnit =
    route.query.periodUnit === "WEEK" || route.query.periodUnit === "MONTH"
      ? route.query.periodUnit
      : DEFAULT_PERIOD_UNIT;

  const lookbackNumber = Number(route.query.lookback);
  const lookback =
    Number.isInteger(lookbackNumber) && lookbackNumber >= 1 && lookbackNumber <= 12
      ? lookbackNumber
      : DEFAULT_LOOKBACK;

  const currency = typeof route.query.currency === "string" ? route.query.currency : "";

  const categoryIds =
    typeof route.query.categories === "string" && route.query.categories !== ""
      ? route.query.categories.split(",")
      : [];

  const includeUncategorized = route.query.uncategorized === "1" || undefined;

  return {
    periodUnit,
    lookback,
    currency,
    categoryIds,
    includeUncategorized,
  };
}

function buildUrlQueryFromSelection(selection: TrendSelection) {
  return {
    periodUnit: selection.periodUnit,
    lookback: selection.lookback.toString(),
    currency: selection.currency,
    ...(selection.categoryIds.length > 0 && {
      categories: selection.categoryIds.join(","),
    }),
    ...(selection.includeUncategorized && { uncategorized: "1" }),
  };
}

const storedSelection = trendSelectionStorage.read();

// If there is no selection in the URL and a stored selection exists,
// sync the stored selection to the URL
if (!hasSelectionInUrlQuery() && storedSelection) {
  router.replace({ query: buildUrlQueryFromSelection(storedSelection) });
}

// The currently active selection.
// It changes only when the user clicks Apply or Clear, or on the initial load.
// Seed order: the URL, then the stored selection, then the hardcoded defaults.
const initialAppliedSelection = hasSelectionInUrlQuery()
  ? readSelectionFromUrlQuery()
  : (storedSelection ?? buildDefaultSelection());
const appliedSelection = ref<TrendSelection>(initialAppliedSelection);

// The default currency resolves once supported currencies load
const selection = computed<TrendSelection>(() => ({
  ...appliedSelection.value,
  currency: appliedSelection.value.currency || defaultCurrency.value,
}));

const { expenseTrend, expenseTrendLoading, expenseTrendError } = useExpenseTrend(selection, today);

watch(expenseTrendError, (error) => {
  if (error) showErrorSnackbar(error);
});

function handleApply(newSelection: TrendSelection) {
  appliedSelection.value = newSelection;
  trendSelectionStorage.write(newSelection);

  router.replace({ query: buildUrlQueryFromSelection(newSelection) });
}

function handleClear() {
  const defaultSelection = buildDefaultSelection();
  appliedSelection.value = defaultSelection;
  trendSelectionStorage.write(defaultSelection);

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
