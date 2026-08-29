<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category, TrendPreset } from "@/__generated__/vue-apollo";
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

const categoryNamesById = computed(
  () => new Map(props.categories.map((category) => [category.id, category.name])),
);

// "{categories} in last {lookback} {week|weeks|month|months} in {currency}"
function formatEntry(trendPreset: TrendPreset): string {
  const categoryNames = trendPreset.categoryIds
    .map((categoryId) => categoryNamesById.value.get(categoryId))
    .filter((name): name is string => !!name);
  if (trendPreset.includeUncategorized) {
    categoryNames.push(t("trends.presets.uncategorized"));
  }
  const categoriesLabel =
    categoryNames.length > 0 ? categoryNames.join(", ") : t("trends.presets.all");

  const periodLabel =
    trendPreset.periodUnit === "WEEK"
      ? t("trends.presets.periodWeek", trendPreset.lookback)
      : t("trends.presets.periodMonth", trendPreset.lookback);

  return t("trends.presets.label", {
    categories: categoriesLabel,
    lookback: trendPreset.lookback,
    period: periodLabel,
    currency: trendPreset.currency,
  });
}

function handleClick(trendPreset: TrendPreset) {
  emit("apply", {
    periodUnit: trendPreset.periodUnit,
    lookback: trendPreset.lookback,
    currency: trendPreset.currency,
    categoryIds: trendPreset.categoryIds,
    includeUncategorized: trendPreset.includeUncategorized,
  });
}
</script>

<template>
  <div v-if="trendPresets.length > 0" class="mb-4">
    <div class="text-subtitle-2 mb-2">{{ t("trends.presets.title") }}</div>
    <div class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="trendPreset in trendPresets"
        :key="trendPreset.id"
        variant="outlined"
        size="small"
        class="text-caption"
        clickable
        @click="handleClick(trendPreset)"
      >
        <v-icon start size="small" color="amber-darken-2">mdi-star</v-icon>
        {{ formatEntry(trendPreset) }}
      </v-chip>
    </div>
  </div>
</template>
