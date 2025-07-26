<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    title="Delete Transfer"
    :message="message"
    warning="This action cannot be undone. Both the outbound and inbound transactions will be permanently removed from your records."
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

const message = computed(() => {
  if (!props.transaction) return "";

  const formattedAmount = formatTransactionAmount(
    Math.abs(props.transaction.amount),
    props.transaction.currency,
    "TRANSFER_IN", // Use TRANSFER_IN type to ensure positive formatting
  );

  const fromAccount = props.fromAccountName || "Unknown Account";
  const toAccount = props.toAccountName || "Unknown Account";

  return `Are you sure you want to delete this transfer of ${formattedAmount} from "${fromAccount}" to "${toAccount}"?`;
});
</script>
