<!-- eslint-disable vue/no-mutating-props -->
<template>
  <v-card class="transaction-filter-bar pa-4 mb-4">
    <v-card-title class="text-h6 pa-0 mb-4">Transaction Filters</v-card-title>

    <v-row>
      <!-- Account Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filters.selectedAccountIds.value"
          :items="accounts"
          item-title="name"
          item-value="id"
          label="Account"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          variant="outlined"
        />
      </v-col>

      <!-- Category Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filters.selectedCategoryIds.value"
          :items="categoryOptions"
          item-title="name"
          item-value="id"
          label="Category"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          variant="outlined"
        />
        <v-checkbox
          v-model="filters.includeUncategorized.value"
          label="Include uncategorized"
          :disabled="loading"
          density="compact"
          class="mt-1"
        />
      </v-col>

      <!-- Date After -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="filters.dateAfter.value"
          type="date"
          label="From Date"
          :disabled="loading"
          clearable
          variant="outlined"
        />
      </v-col>

      <!-- Date Before -->
      <v-col cols="12" md="6">
        <v-text-field
          v-model="filters.dateBefore.value"
          type="date"
          label="To Date"
          :disabled="loading"
          clearable
          variant="outlined"
        />
      </v-col>

      <!-- Transaction Type Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filters.selectedTypes.value"
          :items="transactionTypeOptions"
          label="Type"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          variant="outlined"
        />
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" class="d-flex gap-2">
        <v-btn color="primary" @click="handleApply" :disabled="loading"> Apply Filters </v-btn>
        <v-btn
          variant="outlined"
          @click="handleClear"
          :disabled="loading || !filters.hasSelectedFilters.value"
        >
          Clear Filters
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Account, Category, TransactionType } from "@/__generated__/graphql-types";
import type { TransactionFiltersState } from "@/composables/useTransactionFilters";

interface Props {
  accounts: Account[];
  categories: Category[];
  filters: TransactionFiltersState;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  apply: [];
  clear: [];
}>();

// Add "Uncategorized" option to categories
const categoryOptions = computed(() => {
  return [...props.categories];
});

// Transaction type options
const transactionTypeOptions = computed(() => [
  { title: "Income", value: "INCOME" as TransactionType },
  { title: "Expense", value: "EXPENSE" as TransactionType },
  { title: "Transfer In", value: "TRANSFER_IN" as TransactionType },
  { title: "Transfer Out", value: "TRANSFER_OUT" as TransactionType },
]);

function handleApply() {
  props.filters.applyFilters();
  emit("apply");
}

function handleClear() {
  props.filters.clearFilters();
  props.filters.applyFilters(); // Apply empty filters
  emit("clear");
}
</script>

<style scoped>
.transaction-filter-bar {
  background-color: var(--v-theme-surface);
}
</style>
