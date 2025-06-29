<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    title="Delete Category"
    :message="message"
    warning="This action cannot be undone. The category will be permanently removed from your records, but historical transaction data will be preserved."
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog.vue";
import type { Category } from "@/composables/useCategories";

interface Props {
  modelValue: boolean;
  category: Category | null;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const message = computed(() => {
  if (!props.category) return "";
  return `Are you sure you want to delete the category "${props.category.name}"?`;
});
</script>
