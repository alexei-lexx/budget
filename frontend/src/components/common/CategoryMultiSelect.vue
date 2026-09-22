<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Category } from "@/__generated__/vue-apollo";
import { haveSameItems } from "@/utils/array";
import { getCategoryIcon, getCategoryIconColor } from "@/utils/category";

interface Props {
  categories: Category[];
  label: string;
  disabled?: boolean;
}

const props = defineProps<Props>();

const categoryIdsModel = defineModel<string[]>("categoryIds", { required: true });
const includeUncategorizedModel = defineModel<boolean>("includeUncategorized", { required: true });

const { t } = useI18n();

// Private to this component: never appears in props, emits, or model types.
const UNCATEGORIZED_ID = "__uncategorized__";

const items = computed(() => [
  {
    id: UNCATEGORIZED_ID,
    name: t("common.uncategorized"),
    icon: undefined,
    iconColor: undefined,
  },
  { type: "divider" as const },
  ...props.categories.map((category) => ({
    id: category.id,
    name: category.name,
    icon: getCategoryIcon(category.type),
    iconColor: getCategoryIconColor(category.type),
  })),
]);

const selectedValue = computed({
  get: () =>
    includeUncategorizedModel.value
      ? [UNCATEGORIZED_ID, ...categoryIdsModel.value]
      : categoryIdsModel.value,
  set: (value: string[]) => {
    const nextIncludeUncategorized = value.includes(UNCATEGORIZED_ID);
    if (nextIncludeUncategorized !== includeUncategorizedModel.value) {
      includeUncategorizedModel.value = nextIncludeUncategorized;
    }

    const nextCategoryIds = value.filter((id) => id !== UNCATEGORIZED_ID);
    if (!haveSameItems(nextCategoryIds, categoryIdsModel.value)) {
      categoryIdsModel.value = nextCategoryIds;
    }
  },
});
</script>

<template>
  <v-select
    v-model="selectedValue"
    :items="items"
    item-title="name"
    item-value="id"
    :label="label"
    multiple
    chips
    closable-chips
    clearable
    :disabled="disabled"
    variant="outlined"
    density="compact"
  >
    <template #divider>
      <v-divider />
    </template>
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend="{ isSelected }">
          <v-checkbox-btn :model-value="isSelected" />
        </template>
        <template v-if="item.raw.icon" #append>
          <v-icon :color="item.raw.iconColor">
            {{ item.raw.icon }}
          </v-icon>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>
