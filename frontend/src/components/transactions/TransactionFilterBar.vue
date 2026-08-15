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
            :label="t('transactions.filterBar.account')"
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
            :label="t('transactions.filterBar.category')"
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
            :label="t('transactions.filterBar.includeUncategorized')"
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
            :label="t('transactions.filterBar.fromDate')"
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
            :label="t('transactions.filterBar.toDate')"
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
            :label="t('transactions.form.type')"
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
            {{ t("common.buttons.clear") }}
          </v-btn>
          <v-spacer />
          <v-btn color="primary" @click="handleApply" :disabled="loading">
            {{ t("common.buttons.apply") }}
          </v-btn>
        </v-col>
      </v-row>
    </div>
  </v-expand-transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Account, Category, TransactionType } from "@/__generated__/vue-apollo";
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

const { t } = useI18n();

// Add "Uncategorized" option to categories
const categoryOptions = computed(() => {
  return [...props.categories];
});

// Transaction type options
const transactionTypeOptions = computed(() => [
  { title: t("categories.types.income"), value: "INCOME" as TransactionType },
  { title: t("categories.types.expense"), value: "EXPENSE" as TransactionType },
  { title: t("transactions.filterBar.transferIn"), value: "TRANSFER_IN" as TransactionType },
  { title: t("transactions.filterBar.transferOut"), value: "TRANSFER_OUT" as TransactionType },
  { title: t("transactions.form.refund"), value: "REFUND" as TransactionType },
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
