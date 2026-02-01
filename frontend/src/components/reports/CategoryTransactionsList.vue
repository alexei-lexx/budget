<template>
  <div class="category-transactions-list">
    <div v-if="loading" class="d-flex justify-center pa-4">
      <v-progress-circular indeterminate color="primary" size="32"></v-progress-circular>
    </div>

    <v-alert v-else-if="error" type="error" variant="tonal" class="ma-3">
      Failed to load transactions: {{ error }}
    </v-alert>

    <div v-else-if="transactions.length === 0" class="text-center pa-4 text-medium-emphasis">
      No transactions found
    </div>

    <div v-else class="pa-3">
      <!-- Show count badge if there are more transactions than displayed -->
      <div v-if="totalCount > transactions.length" class="mb-2">
        <v-chip size="small" color="primary" variant="tonal">
          Showing {{ transactions.length }} of {{ totalCount }}
        </v-chip>
      </div>

      <!-- Transaction list -->
      <div class="transaction-list">
        <TransactionCard
          v-for="transaction in transactions"
          :key="transaction.id"
          :transaction="transaction"
          :is-expanded="false"
          class="mb-2"
          @edit-transaction="() => {}"
          @delete-transaction="() => {}"
          @duplicate-transaction="() => {}"
          @toggle-expand="() => {}"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useGetCategoryTopTransactionsQuery } from "@/__generated__/vue-apollo";
import type { ReportType } from "@/__generated__/vue-apollo";
import TransactionCard from "@/components/transactions/TransactionCard.vue";

interface Props {
  year: number;
  month: number;
  categoryId: string | undefined;
  reportType: ReportType;
}

const props = defineProps<Props>();

const DEFAULT_LIMIT = 5;

// Fetch top transactions for this category
const { result, loading, error } = useGetCategoryTopTransactionsQuery({
  year: props.year,
  month: props.month,
  categoryId: props.categoryId || null,
  type: props.reportType,
  limit: DEFAULT_LIMIT,
});

const transactions = computed(() => {
  return result.value?.categoryTopTransactions?.transactions || [];
});

const totalCount = computed(() => {
  return result.value?.categoryTopTransactions?.totalCount || 0;
});
</script>

<style scoped>
.category-transactions-list {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}
</style>
