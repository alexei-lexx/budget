<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <h1 class="text-h4">Transactions</h1>
          <div class="d-flex gap-2">
            <v-btn color="secondary" size="small" @click="handleRegenerateData">
              Regenerate Data
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus"> Add Transaction </v-btn>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="transactionsLoading" class="text-center py-8">
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
            width="4"
          ></v-progress-circular>
          <div class="text-h6 mt-4">Loading transactions...</div>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="transactionsError" type="error" class="mb-4">
          {{ transactionsError }}
        </v-alert>

        <!-- Empty State -->
        <v-sheet
          v-else-if="transactions.length === 0"
          border="dashed md"
          color="surface-light"
          height="300"
          rounded="lg"
          width="100%"
          class="d-flex flex-column align-center justify-center"
        >
          <v-icon size="64" class="mb-4" color="primary">mdi-swap-horizontal</v-icon>
          <div class="text-h6 mb-2">No Transactions Yet</div>
          <div class="text-body-1 text-center mb-4">
            Start tracking your income and expenses by adding your first transaction.
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus"> Add Your First Transaction </v-btn>
        </v-sheet>

        <!-- Transactions List -->
        <div v-else>
          <div class="text-body-2 text-medium-emphasis mb-3">
            {{ transactions.length }} transaction{{ transactions.length !== 1 ? "s" : "" }}
          </div>
          <v-row dense>
            <v-col v-for="transaction in transactions" :key="transaction.id" cols="12">
              <TransactionCard
                :transaction="transaction"
                :account-name="getAccountName(transaction.accountId)"
                :category-name="getCategoryName(transaction.categoryId)"
                @edit-transaction="handleEditTransaction"
                @archive-transaction="handleArchiveTransaction"
              />
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useTransactions } from "@/composables/useTransactions";
import { useAccounts } from "@/composables/useAccounts";
import { useCategories } from "@/composables/useCategories";
import TransactionCard from "@/components/TransactionCard.vue";

// Composables
const {
  transactions,
  transactionsLoading,
  transactionsError,
  initializeMockData,
  regenerateMockData,
} = useTransactions();
const { accounts: accountsData } = useAccounts();
const { categories: categoriesData } = useCategories();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.activeAccounts || []);
const categories = computed(() => categoriesData.value?.activeCategories || []);

// Initialize mock data when component mounts
onMounted(async () => {
  await initializeMockData();
});

// Event handlers
const handleEditTransaction = (transactionId: string) => {
  console.log("Edit transaction:", transactionId);
  // TODO: Implement edit functionality
};

const handleArchiveTransaction = (transactionId: string) => {
  console.log("Archive transaction:", transactionId);
  // TODO: Implement archive functionality with confirmation dialog
};

const handleRegenerateData = async () => {
  await regenerateMockData();
};

// Helper functions to resolve names
const getAccountName = (accountId: string): string => {
  const account = accounts.value.find((a) => a.id === accountId);
  return account?.name || "Unknown Account";
};

const getCategoryName = (categoryId?: string): string | undefined => {
  if (!categoryId) return undefined;
  const category = categories.value.find((c) => c.id === categoryId);
  return category?.name;
};
</script>
