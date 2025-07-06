<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    title="Delete Transaction"
    :message="message"
    warning="This action cannot be undone. The transaction will be permanently removed from your records."
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
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

const message = computed(() => {
  if (!props.transaction) return "";

  const formattedAmount = formatTransactionAmount(
    props.transaction.amount,
    props.transaction.currency,
    props.transaction.type,
  );

  return `Are you sure you want to delete the transaction "${props.accountName || "Unknown Account"}, ${formattedAmount}"?`;
});
</script>
