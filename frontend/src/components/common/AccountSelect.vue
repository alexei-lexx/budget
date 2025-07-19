<script setup lang="ts">
import { computed } from "vue";
import { useAccounts } from "@/composables/useAccounts";

interface Props {
  modelValue: string;
  label?: string;
  rules?: Array<(value: string) => boolean | string>;
  disabled?: boolean;
  required?: boolean;
  variant?:
    | "outlined"
    | "filled"
    | "underlined"
    | "plain"
    | "solo"
    | "solo-inverted"
    | "solo-filled";
}

const props = withDefaults(defineProps<Props>(), {
  label: "Account",
  rules: () => [],
  disabled: false,
  required: false,
  variant: "outlined",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// Use accounts composable
const { accounts: accountsData } = useAccounts();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.accounts || []);

const selectedValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});
</script>

<template>
  <v-select
    v-model="selectedValue"
    :items="accounts"
    item-title="name"
    item-value="id"
    :label="label"
    :rules="rules"
    :disabled="disabled"
    :variant="variant"
    :required="required"
  >
    <template #item="{ props: itemProps, item }">
      <v-list-item v-bind="itemProps">
        <template #append>
          <div class="text-caption text-medium-emphasis">
            {{ item.raw.currency }}
          </div>
        </template>
      </v-list-item>
    </template>
    <template #selection="{ item }">
      <span>{{ item.title }}</span>
      <span v-if="item.raw.currency" class="text-caption text-medium-emphasis ml-2"
        >({{ item.raw.currency }})</span
      >
    </template>
  </v-select>
</template>
