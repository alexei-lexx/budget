<script setup lang="ts">
import { computed } from "vue";
import type { Category } from "@/__generated__/vue-apollo";
import { getCategoryIcon, getCategoryIconColor } from "@/utils/category";

interface Props {
  modelValue: string[];
  categories: Category[];
  label: string;
  disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit("update:modelValue", value),
});
</script>

<template>
  <v-select
    v-model="selectedValue"
    :items="categories"
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
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #prepend="{ isSelected }">
          <v-checkbox-btn :model-value="isSelected" />
        </template>
        <template #append>
          <v-icon :color="getCategoryIconColor(item.raw.type)">
            {{ getCategoryIcon(item.raw.type) }}
          </v-icon>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>
