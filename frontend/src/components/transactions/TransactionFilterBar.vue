<!-- eslint-disable vue/no-mutating-props -->
<template>
  <v-expand-transition>
    <div v-show="modelValue" class="pa-4">
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
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #append>
                  <v-icon :color="getCategoryIconColor(item.raw.type)">
                    {{ getCategoryIcon(item.raw.type) }}
                  </v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
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
            :disabled="loading || !filters.hasSelectedFilters.value"
            @click="handleClear"
          >
            Clear
          </v-btn>
          <v-spacer />
          <v-btn color="primary" :disabled="loading" @click="handleApply"> Apply </v-btn>
        </v-col>
      </v-row>
    </div>
  </v-expand-transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Account, Category, TransactionType } from "@/__generated__/graphql-types";
import type { TransactionFiltersState } from "@/composables/useTransactionFilters";
import { getCategoryIconColor, getCategoryIcon } from "@/utils/category";

interface Props {
  modelValue: boolean;
  accounts: Account[];
  categories: Category[];
  filters: TransactionFiltersState;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  apply: [];
  clear: [];
}>();

const categoryOptions = computed(() => {
  return [...props.categories];
});

const transactionTypeOptions = computed(() => [
  { title: "Income", value: "INCOME" as TransactionType },
  { title: "Expense", value: "EXPENSE" as TransactionType },
  { title: "Transfer In", value: "TRANSFER_IN" as TransactionType },
  { title: "Transfer Out", value: "TRANSFER_OUT" as TransactionType },
  { title: "Refund", value: "REFUND" as TransactionType },
]);

function handleApply() {
  props.filters.applyFilters();
  emit("apply");
}

function handleClear() {
  props.filters.clearFilters();
  props.filters.applyFilters();
  emit("clear");
}
</script>
