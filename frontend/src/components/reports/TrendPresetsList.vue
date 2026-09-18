<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category, TrendPeriodUnit, TrendPreset } from "@/__generated__/vue-apollo";
import type { TrendSelection } from "@/composables/useExpenseTrend";

interface Props {
  trendPresets: TrendPreset[];
  categories: Category[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [selection: TrendSelection];
}>();

const { t } = useI18n();

// Period pill: color marks WEEK vs MONTH,
// its tint scales with lookback relative to the other
// currently-rendered entries of the same period unit.
const PERIOD_UNIT_COLORS: Record<TrendPeriodUnit, string> = {
  WEEK: "teal",
  MONTH: "palevioletred",
};
const PERIOD_UNIT_MIN_TINT = 15; // faintest tint, %
const PERIOD_UNIT_MAX_TINT = 45; // strongest tint, %

const categoryNamesById = computed(
  () => new Map(props.categories.map((category) => [category.id, category.name])),
);

function getCategoriesLabel(trendPreset: TrendPreset): string {
  const categoryNames = trendPreset.categoryIds
    .map((categoryId) => categoryNamesById.value.get(categoryId))
    .filter((name): name is string => !!name);
  if (trendPreset.includeUncategorized) {
    categoryNames.push(t("trends.presets.uncategorized"));
  }
  return categoryNames.length > 0 ? categoryNames.join(", ") : t("trends.presets.all");
}

function getPeriodPhrase(trendPreset: TrendPreset): string {
  const namedValues = { lookback: trendPreset.lookback };
  return trendPreset.periodUnit === "WEEK"
    ? t("trends.presets.periodPhraseWeek", namedValues, trendPreset.lookback)
    : t("trends.presets.periodPhraseMonth", namedValues, trendPreset.lookback);
}

// Ordered by "all" (no categories) first, then category count descending,
// then categories label ascending, then period (month before week),
// then lookback descending, then currency ascending.
const sortedTrendPresets = computed(() =>
  [...props.trendPresets].sort((a, b) => {
    if (a.categoryIds.length === 0 && b.categoryIds.length > 0) {
      return -1;
    }

    if (b.categoryIds.length === 0 && a.categoryIds.length > 0) {
      return 1;
    }

    if (a.categoryIds.length !== b.categoryIds.length) {
      return b.categoryIds.length - a.categoryIds.length;
    }

    const categoriesComparison = getCategoriesLabel(a).localeCompare(getCategoriesLabel(b));
    if (categoriesComparison !== 0) {
      return categoriesComparison;
    }

    if (a.periodUnit !== b.periodUnit) {
      return a.periodUnit === "MONTH" ? -1 : 1;
    }

    if (a.lookback !== b.lookback) {
      return b.lookback - a.lookback;
    }

    return a.currency.localeCompare(b.currency);
  }),
);

function getLookbackRange(periodUnit: TrendPeriodUnit): { min: number; max: number } {
  const lookbacks = props.trendPresets
    .filter((trendPreset) => trendPreset.periodUnit === periodUnit)
    .map((trendPreset) => trendPreset.lookback);
  return { min: Math.min(...lookbacks), max: Math.max(...lookbacks) };
}

function getPeriodPhraseBgColor(trendPreset: TrendPreset): string {
  const { min, max } = getLookbackRange(trendPreset.periodUnit);
  const tintFraction = max > min ? (trendPreset.lookback - min) / (max - min) : 1;
  const tintPercent =
    PERIOD_UNIT_MIN_TINT + tintFraction * (PERIOD_UNIT_MAX_TINT - PERIOD_UNIT_MIN_TINT);
  const color = PERIOD_UNIT_COLORS[trendPreset.periodUnit];
  return `color-mix(in srgb, ${color} ${tintPercent}%, white)`;
}

const trendPresetChips = computed(() =>
  sortedTrendPresets.value.map((trendPreset) => ({
    trendPreset,
    categoriesLabel: getCategoriesLabel(trendPreset),
    periodPhrase: getPeriodPhrase(trendPreset),
    periodPhraseBgColor: getPeriodPhraseBgColor(trendPreset),
  })),
);

function handleClick(trendPreset: TrendPreset) {
  emit("apply", {
    periodUnit: trendPreset.periodUnit,
    lookback: trendPreset.lookback,
    currency: trendPreset.currency,
    categoryIds: trendPreset.categoryIds,
    includeUncategorized: trendPreset.includeUncategorized || undefined,
  });
}
</script>

<template>
  <div v-if="trendPresets.length > 0" class="mb-4">
    <div class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="chip in trendPresetChips"
        :key="chip.trendPreset.id"
        variant="outlined"
        size="small"
        class="text-caption"
        clickable
        @click="handleClick(chip.trendPreset)"
      >
        <v-icon start size="small" color="amber-darken-2">mdi-star</v-icon>
        <i18n-t keypath="trends.presets.label" tag="span">
          <template #categories>{{ chip.categoriesLabel }}</template>
          <template #periodPhrase>
            <span
              class="period-phrase rounded-pill px-2"
              :style="{ backgroundColor: chip.periodPhraseBgColor }"
              >{{ chip.periodPhrase }}</span
            >
          </template>
          <template #currency>{{ chip.trendPreset.currency }}</template>
        </i18n-t>
      </v-chip>
    </div>
  </div>
</template>
