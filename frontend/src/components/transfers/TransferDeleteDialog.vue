<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    :title="t('transfers.deleteDialog.title')"
    :confirm-message="confirmMessage"
    :warning="t('transfers.deleteDialog.warning')"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import DeleteConfirmationDialog from "@/components/common/DeleteConfirmationDialog.vue";
import type { Transaction } from "@/composables/useTransactions";
import { formatTransactionAmount } from "@/utils/currency";

interface Props {
  modelValue: boolean;
  transaction: Transaction | null;
  fromAccountName?: string;
  toAccountName?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const { t } = useI18n();

const confirmMessage = computed(() => {
  if (!props.transaction) return "";

  const formattedAmount = formatTransactionAmount(
    Math.abs(props.transaction.amount),
    props.transaction.currency,
    "TRANSFER_IN", // Use TRANSFER_IN type to ensure positive formatting
  );

  return t("transfers.deleteDialog.confirmMessage", {
    amount: formattedAmount,
    from: props.fromAccountName || t("common.unknownAccount"),
    to: props.toAccountName || t("common.unknownAccount"),
  });
});
</script>
