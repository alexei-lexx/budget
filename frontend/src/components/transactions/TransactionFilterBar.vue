<!-- eslint-disable vue/no-mutating-props -->
<template>
  <v-card class="transaction-filter-bar mb-4">
    <!-- Header with Toggle -->
    <div
      class="filter-header pa-4 d-flex align-center justify-space-between cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <h3 class="text-subtitle1 mb-0">Filter</h3>
      <v-icon :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
    </div>

    <!-- Expandable Content -->
    <v-expand-transition>
      <div v-show="isExpanded" class="pa-4">
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
          <v-col cols="12" class="d-flex">
            <v-btn
              variant="outlined"
              @click="handleClear"
              :disabled="loading || !filters.hasSelectedFilters.value"
            >
              Clear
            </v-btn>
            <v-spacer />
            <v-btn color="primary" @click="handleApply" :disabled="loading"> Apply </v-btn>
          </v-col>
        </v-row>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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

// Expandable state
const isExpanded = ref(false);

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

.filter-header {
  border-bottom: 1px solid var(--v-theme-surface-variant);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.filter-header:hover {
  background-color: var(--v-theme-surface-bright);
}

.cursor-pointer {
  cursor: pointer;
}
</style>
