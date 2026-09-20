<template>
  <div class="pa-3 pa-sm-4">
    <v-row dense>
      <!-- Account Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filters.selectedAccountIds.value"
          :items="accounts"
          item-title="name"
          item-value="id"
          :label="t('transactions.filterBar.accounts')"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          variant="outlined"
          density="compact"
        />
      </v-col>

      <!-- Category Filter -->
      <v-col cols="12" md="6">
        <CategoryMultiSelect
          v-model="filters.selectedCategoryIds.value"
          :categories="categories"
          :label="t('transactions.filterBar.categories')"
          :disabled="loading"
        />
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
          density="compact"
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
          density="compact"
        />
      </v-col>

      <!-- Transaction Type Filter -->
      <v-col cols="12" md="6">
        <v-select
          v-model="filters.selectedTypes.value"
          :items="transactionTypeOptions"
          :label="t('transactions.filterBar.types')"
          multiple
          chips
          closable-chips
          :disabled="loading"
          clearable
          variant="outlined"
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" class="d-flex align-center">
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Account, Category, TransactionType } from "@/__generated__/vue-apollo";
import type { TransactionFiltersState } from "@/composables/useTransactionFilters";
import CategoryMultiSelect from "@/components/common/CategoryMultiSelect.vue";

interface Props {
  accounts: Account[];
  categories: Category[];
  loading?: boolean;
}

defineProps<Props>();

const filters = defineModel<TransactionFiltersState>("filters", { required: true });

const emit = defineEmits<{
  apply: [];
  clear: [];
}>();

const { t } = useI18n();

// Transaction type options
const transactionTypeOptions = computed(
  () =>
    [
      { title: t("transactions.types.income"), value: "INCOME" },
      { title: t("transactions.types.expense"), value: "EXPENSE" },
      { title: t("transactions.types.transferIn"), value: "TRANSFER_IN" },
      { title: t("transactions.types.transferOut"), value: "TRANSFER_OUT" },
      { title: t("transactions.types.refund"), value: "REFUND" },
    ] satisfies { title: string; value: TransactionType }[],
);

function handleApply() {
  emit("apply");
}

function handleClear() {
  emit("clear");
}
</script>
