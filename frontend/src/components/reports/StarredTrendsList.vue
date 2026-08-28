<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category, StarredTrend } from "@/__generated__/vue-apollo";
import type { TrendSelection } from "@/composables/useExpenseTrend";

interface Props {
  starredTrends: StarredTrend[];
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
function formatEntry(starredTrend: StarredTrend): string {
  const categoryNames = starredTrend.categoryIds
    .map((categoryId) => categoryNamesById.value.get(categoryId))
    .filter((name): name is string => !!name);
  if (starredTrend.includeUncategorized) {
    categoryNames.push(t("trends.starred.uncategorized"));
  }
  const categoriesLabel =
    categoryNames.length > 0 ? categoryNames.join(", ") : t("trends.starred.all");

  const periodLabel =
    starredTrend.periodUnit === "WEEK"
      ? t("trends.starred.periodWeek", starredTrend.lookback)
      : t("trends.starred.periodMonth", starredTrend.lookback);

  return t("trends.starred.label", {
    categories: categoriesLabel,
    lookback: starredTrend.lookback,
    period: periodLabel,
    currency: starredTrend.currency,
  });
}

function handleClick(starredTrend: StarredTrend) {
  emit("apply", {
    periodUnit: starredTrend.periodUnit,
    lookback: starredTrend.lookback,
    currency: starredTrend.currency,
    categoryIds: starredTrend.categoryIds,
    includeUncategorized: starredTrend.includeUncategorized,
  });
}
</script>

<template>
  <div v-if="starredTrends.length > 0" class="mb-4">
    <div class="text-subtitle-2 mb-2">{{ t("trends.starred.title") }}</div>
    <div class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="starredTrend in starredTrends"
        :key="starredTrend.id"
        variant="outlined"
        size="small"
        class="text-caption"
        clickable
        @click="handleClick(starredTrend)"
      >
        <v-icon start size="small" color="amber-darken-2">mdi-star</v-icon>
        {{ formatEntry(starredTrend) }}
      </v-chip>
    </div>
  </div>
</template>
