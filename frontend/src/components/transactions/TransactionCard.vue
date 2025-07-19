<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "@/composables/useTransactions";
import { formatTransactionAmount } from "@/utils/currency";
import ActionDropdown from "@/components/common/ActionDropdown.vue";

// Define component props
interface Props {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
}>();

// Format amount with +/- prefix
const formattedAmount = computed(() => {
  return formatTransactionAmount(
    props.transaction.amount,
    props.transaction.currency,
    props.transaction.type,
  );
});

// Format date for display
const formattedDate = computed(() => {
  const date = new Date(props.transaction.date);
  const currentYear = new Date().getFullYear();
  const transactionYear = date.getFullYear();

  // Only show year if it's different from current year
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };

  if (transactionYear !== currentYear) {
    options.year = "numeric";
  }

  return date.toLocaleDateString("en-US", options);
});

// Amount color based on type
const amountColor = computed(() => {
  // INCOME and TRANSFER_IN are positive (green)
  // EXPENSE and TRANSFER_OUT are negative (red)
  return props.transaction.type === "INCOME" || props.transaction.type === "TRANSFER_IN"
    ? "success"
    : "error";
});

// Icon based on transaction type
const transactionIcon = computed(() => {
  switch (props.transaction.type) {
    case "INCOME":
      return "mdi-cash-plus";
    case "EXPENSE":
      return "mdi-cash-minus";
    case "TRANSFER_IN":
      return "mdi-bank-transfer-in";
    case "TRANSFER_OUT":
      return "mdi-bank-transfer-out";
    default:
      return "mdi-cash";
  }
});

// Event handlers
const handleEditTransaction = () => {
  emit("editTransaction", props.transaction.id);
};

const handleDeleteTransaction = () => {
  emit("deleteTransaction", props.transaction.id);
};
</script>

<template>
  <v-card variant="outlined" class="transaction-card">
    <v-card-text class="py-2 px-3">
      <div class="d-flex align-center">
        <!-- Icon -->
        <v-icon :color="amountColor" size="20" class="me-3">
          {{ transactionIcon }}
        </v-icon>

        <!-- Main content -->
        <div class="flex-grow-1 me-3">
          <div class="text-caption text-medium-emphasis">
            {{ formattedDate }} • {{ accountName
            }}<span v-if="categoryName"> • {{ categoryName }}</span
            ><span v-if="transaction.description"> • {{ transaction.description }}</span>
          </div>
        </div>

        <!-- Amount -->
        <div class="text-h6 font-weight-bold" :class="`text-${amountColor}`">
          {{ formattedAmount }}
        </div>

        <!-- Menu -->
        <ActionDropdown @edit="handleEditTransaction" @delete="handleDeleteTransaction" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.transaction-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.transaction-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
