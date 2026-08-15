<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    :title="t('accounts.deleteDialog.title')"
    :message="message"
    :warning="t('accounts.deleteDialog.warning')"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import DeleteConfirmationDialog from "@/components/common/DeleteConfirmationDialog.vue";
import type { Account } from "@/composables/useAccounts";

interface Props {
  modelValue: boolean;
  account: Account | null;
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
  if (!props.account) return "";
  return t("accounts.deleteDialog.confirmMessage", { name: props.account.name });
});
</script>
