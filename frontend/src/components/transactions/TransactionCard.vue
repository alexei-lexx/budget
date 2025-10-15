<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "@/composables/useTransactions";
import { formatTransactionAmount } from "@/utils/currency";

// Define component props
interface Props {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
  isExpanded: boolean;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
  toggleExpand: [transactionId: string];
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

const handleCardClick = () => {
  emit("toggleExpand", props.transaction.id);
};
</script>

<template>
  <v-card
    variant="outlined"
    class="transaction-card"
    :class="{ expanded: isExpanded }"
    @click="handleCardClick"
    style="cursor: pointer"
  >
    <v-card-text class="py-3">
      <!-- Collapsed state: Single row with all info -->
      <div class="d-flex align-center">
        <!-- Icon -->
        <v-icon :color="amountColor" size="20" class="me-3 flex-shrink-0">
          {{ transactionIcon }}
        </v-icon>

        <!-- Main content -->
        <div class="flex-grow-1 me-3" style="min-width: 0">
          <h4 class="text-h6 mb-0 text-truncate">
            {{ formattedDate }} • {{ accountName
            }}<span v-if="categoryName"> • {{ categoryName }}</span>
          </h4>
        </div>

        <!-- Amount -->
        <div class="text-h5 font-weight-bold flex-shrink-0" :class="`text-${amountColor}`">
          {{ formattedAmount }}
        </div>
      </div>

      <!-- Expanded state: Second row with description and buttons -->
      <div
        v-if="isExpanded && transaction.description"
        class="d-flex flex-column flex-sm-row align-sm-center justify-sm-space-between ga-2 mt-3"
      >
        <!-- Description on left (top on mobile) -->
        <div class="text-body-2 flex-grow-1" style="min-width: 0">
          {{ transaction.description }}
        </div>

        <!-- Buttons on right (bottom on mobile) -->
        <div class="flex-shrink-0 d-flex ga-2" @click.stop>
          <v-btn
            size="small"
            color="primary"
            variant="text"
            prepend-icon="mdi-pencil"
            @click="handleEditTransaction"
          >
            Edit
          </v-btn>
          <v-btn
            size="small"
            color="error"
            variant="text"
            prepend-icon="mdi-delete"
            @click="handleDeleteTransaction"
          >
            Delete
          </v-btn>
        </div>
      </div>

      <!-- Expanded state without description: Only buttons -->
      <div
        v-else-if="isExpanded && !transaction.description"
        class="d-flex justify-end ga-2 mt-3"
        @click.stop
      >
        <v-btn
          size="small"
          color="primary"
          variant="text"
          prepend-icon="mdi-pencil"
          @click="handleEditTransaction"
        >
          Edit
        </v-btn>
        <v-btn
          size="small"
          color="error"
          variant="text"
          prepend-icon="mdi-delete"
          @click="handleDeleteTransaction"
        >
          Delete
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.transaction-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.transaction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.transaction-card.expanded {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}

.transaction-card.expanded:hover {
  transform: none; /* Disable hover transform when expanded */
}
</style>
