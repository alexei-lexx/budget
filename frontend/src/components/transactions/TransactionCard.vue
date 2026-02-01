<script setup lang="ts">
import { computed } from "vue";
import type { Transaction } from "@/composables/useTransactions";
import { formatTransactionAmount } from "@/utils/currency";
import ActionButtons from "@/components/common/ActionButtons.vue";

// Define component props
interface Props {
  transaction: Transaction;
  isExpanded: boolean;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

// Define emitted events
const emit = defineEmits<{
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
  duplicateTransaction: [transaction: Transaction];
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
  // INCOME, REFUND, and TRANSFER_IN are positive (green)
  // EXPENSE and TRANSFER_OUT are negative (red)
  return props.transaction.type === "INCOME" ||
    props.transaction.type === "TRANSFER_IN" ||
    props.transaction.type === "REFUND"
    ? "success"
    : "error";
});

// Add after existing computed properties (after line 91)
const descriptionPreview = computed(() => {
  if (!props.transaction.description) return null;

  // Normalize whitespace (convert line breaks and multiple spaces to single space)
  return props.transaction.description.replace(/\s+/g, " ").trim();
});

// Event handlers
const handleEditTransaction = () => {
  emit("editTransaction", props.transaction.id);
};

const handleDeleteTransaction = () => {
  emit("deleteTransaction", props.transaction.id);
};

const handleDuplicateTransaction = () => {
  emit("duplicateTransaction", props.transaction);
};

const handleCardClick = () => {
  if (!props.readonly) {
    emit("toggleExpand", props.transaction.id);
  }
};
</script>

<template>
  <v-card
    variant="outlined"
    class="transaction-card"
    :class="{ expanded: isExpanded, readonly: readonly }"
    @click="handleCardClick"
  >
    <v-card-text class="py-3">
      <!-- Collapsed state: Single row with all info -->
      <div class="d-flex align-center">
        <!-- Main content -->
        <div class="flex-grow-1 me-3" style="min-width: 0">
          <h4 class="text-h6 mb-0" :class="{ 'text-truncate': !isExpanded }">
            {{ formattedDate }} •
            <span
              :class="{ 'account-archived': transaction.account.isArchived }"
              :aria-label="
                transaction.account.isArchived ? `Deleted: ${transaction.account.name}` : undefined
              "
              :title="transaction.account.isArchived ? 'Deleted account' : ''"
            >
              {{ transaction.account.name }}
            </span>
            <span v-if="transaction.category">
              •
              <span
                :class="{ 'category-archived': transaction.category.isArchived }"
                :aria-label="
                  transaction.category.isArchived
                    ? `Deleted: ${transaction.category.name}`
                    : undefined
                "
                :title="transaction.category.isArchived ? 'Deleted category' : ''"
              >
                {{ transaction.category.name }}
              </span>
            </span>
            <span v-if="!isExpanded && descriptionPreview" class="text-subtitle-1">
              • {{ descriptionPreview }}
            </span>
          </h4>
        </div>

        <!-- Amount -->
        <div class="text-h5 text-high-emphasis flex-shrink-0" :class="`text-${amountColor}`">
          {{ formattedAmount }}
        </div>
      </div>

      <!-- Expanded state: Description and buttons -->
      <div
        v-if="isExpanded && !readonly"
        class="d-flex ga-2 mt-3"
        :class="
          transaction.description
            ? 'flex-column flex-sm-row align-sm-center justify-sm-space-between'
            : 'justify-end'
        "
      >
        <!-- Description on left (top on mobile) - only shown if present -->
        <div v-if="transaction.description" class="text-body-1 flex-grow-1" style="min-width: 0">
          {{ transaction.description }}
        </div>

        <!-- Action buttons on right (bottom on mobile) -->
        <ActionButtons
          show-duplicate
          @duplicate="handleDuplicateTransaction"
          @edit="handleEditTransaction"
          @delete="handleDeleteTransaction"
        />
      </div>

      <!-- Readonly expanded state: Just show description -->
      <div v-if="isExpanded && readonly && transaction.description" class="mt-3">
        <div class="text-body-1">{{ transaction.description }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.transaction-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.transaction-card:not(.readonly) {
  cursor: pointer;
}

.transaction-card:not(.readonly):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.transaction-card.expanded:not(.readonly):hover {
  transform: none; /* Disable hover transform when expanded */
}

.account-archived,
.category-archived {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--v-theme-on-surface-variant);
}
</style>
