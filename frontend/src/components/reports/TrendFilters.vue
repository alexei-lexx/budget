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
      <v-col cols="12" sm="6">
        <v-label class="d-block mb-1">{{ t("trends.filters.period") }}</v-label>
        <v-btn-toggle v-model="draftPeriod" mandatory density="compact" color="primary" divided>
          <v-btn value="WEEK">{{ t("trends.filters.week") }}</v-btn>
          <v-btn value="MONTH">{{ t("trends.filters.month") }}</v-btn>
        </v-btn-toggle>
      </v-col>

      <!-- Lookback -->
      <v-col cols="12" sm="6">
        <v-label class="d-block mb-1">{{ t("trends.filters.lookback") }}</v-label>
        <v-btn-toggle v-model="draftLookback" mandatory density="compact" color="primary" divided>
          <v-btn v-for="option in LOOKBACK_OPTIONS" :key="option" :value="option">
            {{ option }}
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" class="d-flex">
        <v-btn variant="outlined" :disabled="loading" @click="handleClear">
          {{ t("common.buttons.clear") }}
        </v-btn>
        <v-spacer />
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
import type { Category, TrendPeriod } from "@/__generated__/vue-apollo";
import { useCurrencies } from "@/composables/useCurrencies";
import type { TrendSelection } from "@/composables/useExpenseTrend";

const LOOKBACK_OPTIONS = [3, 6, 12];

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

// Draft state: edits stay local until Apply
const draftPeriod = ref<TrendPeriod>(props.selection.period);
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
    draftPeriod.value = selection.period;
    draftLookback.value = selection.lookback;
    draftCurrency.value = selection.currency;
    draftCategoryIds.value = [...selection.categoryIds];
    draftIncludeUncategorized.value = selection.includeUncategorized;
  },
  { deep: true },
);

function handleApply() {
  emit("apply", {
    period: draftPeriod.value,
    lookback: draftLookback.value,
    currency: draftCurrency.value,
    categoryIds: [...draftCategoryIds.value],
    includeUncategorized: draftIncludeUncategorized.value,
  });
}

function handleClear() {
  emit("clear");
}
</script>
