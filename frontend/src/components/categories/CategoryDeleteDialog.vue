<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    :title="t('categories.deleteDialog.title')"
    :message="message"
    :warning="t('categories.deleteDialog.warning')"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import DeleteConfirmationDialog from "@/components/common/DeleteConfirmationDialog.vue";
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

const { t } = useI18n();

const message = computed(() => {
  if (!props.category) return "";
  return t("categories.deleteDialog.message", { name: props.category.name });
});
</script>
