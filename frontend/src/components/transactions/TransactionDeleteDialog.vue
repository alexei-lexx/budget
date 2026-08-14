<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    :title="t('transactions.deleteDialog.title')"
    :confirm-message="confirmMessage"
    :warning="t('transactions.deleteDialog.warning')"
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
  accountName?: string;
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
    props.transaction.amount,
    props.transaction.currency,
    props.transaction.type,
  );

  return t("transactions.deleteDialog.confirmMessage", {
    account: props.accountName || t("common.unknownAccount"),
    amount: formattedAmount,
  });
});
</script>
