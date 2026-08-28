<template>
  <div class="pa-3 pa-sm-4">
    <v-row dense>
      <!-- Category Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="draftCategoryIds"
          :items="categoryOptions"
          item-title="name"
          item-value="id"
          :label="t('trends.filters.categories')"
          multiple
          chips
          closable-chips
          :disabled="loading"
          variant="outlined"
          density="compact"
        />
        <v-checkbox
          v-model="draftIncludeUncategorized"
          :label="t('trends.filters.includeUncategorized')"
          :disabled="loading"
          density="compact"
          class="mt-1"
        />
      </v-col>

      <!-- Currency Filter -->
      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="draftCurrency"
          :items="supportedCurrencies"
          :label="t('trends.filters.currency')"
          :disabled="loading"
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Period Type -->
      <v-col cols="12" sm="5">
        <v-label class="d-block mb-1">{{ t("trends.filters.period") }}</v-label>
        <v-btn-toggle v-model="draftPeriodUnit" mandatory density="compact" color="primary" divided>
          <v-btn value="WEEK">{{ t("trends.filters.week") }}</v-btn>
          <v-btn value="MONTH">{{ t("trends.filters.month") }}</v-btn>
        </v-btn-toggle>
      </v-col>

      <!-- Lookback -->
      <v-col cols="12" sm="7">
        <v-label class="d-block mb-1">{{ t("trends.filters.lookback") }}</v-label>
        <div class="d-flex align-center ga-2">
          <v-btn-toggle v-model="draftLookback" mandatory density="compact" color="primary" divided>
            <v-btn v-for="option in LOOKBACK_OPTIONS" :key="option" :value="option">
              {{ option }}
            </v-btn>
          </v-btn-toggle>
          <v-select
            v-model="draftLookback"
            :items="LOOKBACK_SELECT_OPTIONS"
            :disabled="loading"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 88px"
          />
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" class="d-flex align-center">
        <v-btn variant="outlined" :disabled="loading" @click="handleClear">
          {{ t("common.buttons.clear") }}
        </v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          class="mr-2"
          :aria-label="matchingStarredTrend ? t('trends.filters.unstar') : t('trends.filters.star')"
          :disabled="loading || starLoading || unstarLoading"
          @click="handleToggleStar"
        >
          <v-icon :color="matchingStarredTrend ? 'amber-darken-2' : undefined">
            {{ matchingStarredTrend ? "mdi-star" : "mdi-star-outline" }}
          </v-icon>
        </v-btn>
        <v-btn color="primary" :disabled="loading" @click="handleApply">
          {{ t("common.buttons.apply") }}
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { Category, TrendPeriodUnit } from "@/__generated__/vue-apollo";
import { useCurrencies } from "@/composables/useCurrencies";
import type { TrendSelection } from "@/composables/useExpenseTrend";
import { useStarredTrends } from "@/composables/useStarredTrends";

const LOOKBACK_OPTIONS = [3, 6, 12];
const LOOKBACK_SELECT_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

interface Props {
  selection: TrendSelection;
  categories: Category[];
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [selection: TrendSelection];
  clear: [];
}>();

const { t } = useI18n();
const { supportedCurrencies } = useCurrencies();
const {
  matchingStarredTrend: findMatchingStarredTrend,
  star,
  unstar,
  starLoading,
  unstarLoading,
} = useStarredTrends();

// Reflects the applied selection, not the unsaved draft
const matchingStarredTrend = computed(() => findMatchingStarredTrend(props.selection));

// Draft state: edits stay local until Apply
const draftPeriodUnit = ref<TrendPeriodUnit>(props.selection.periodUnit);
const draftLookback = ref<number>(props.selection.lookback);
const draftCurrency = ref<string>(props.selection.currency);
const draftCategoryIds = ref<string[]>([...props.selection.categoryIds]);
const draftIncludeUncategorized = ref<boolean>(props.selection.includeUncategorized);

// Categories flagged "Exclude from reports" are never offered
const categoryOptions = computed(() =>
  props.categories.filter((category) => !category.excludeFromReports),
);

// Re-seed the draft whenever the applied selection changes elsewhere
// (URL restore on mount, Clear, or the default currency resolving)
watch(
  () => props.selection,
  (selection) => {
    draftPeriodUnit.value = selection.periodUnit;
    draftLookback.value = selection.lookback;
    draftCurrency.value = selection.currency;
    draftCategoryIds.value = [...selection.categoryIds];
    draftIncludeUncategorized.value = selection.includeUncategorized;
  },
  { deep: true },
);

function handleApply() {
  emit("apply", {
    periodUnit: draftPeriodUnit.value,
    lookback: draftLookback.value,
    currency: draftCurrency.value,
    categoryIds: [...draftCategoryIds.value],
    includeUncategorized: draftIncludeUncategorized.value,
  });
}

function handleClear() {
  emit("clear");
}

async function handleToggleStar() {
  const matched = matchingStarredTrend.value;
  if (matched) {
    await unstar(matched.id);
  } else {
    await star(props.selection);
  }
}
</script>
