<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <h1 class="text-h4">Transactions</h1>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="handleAddTransaction">
            Add Transaction
          </v-btn>
        </div>

        <!-- Loading State -->
        <div v-if="paginatedLoading" class="text-center py-8">
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
          v-else-if="paginatedTransactions.length === 0"
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
          <v-btn color="primary" prepend-icon="mdi-plus" @click="handleAddTransaction">
            Add Your First Transaction
          </v-btn>
        </v-sheet>

        <!-- Transactions List -->
        <div v-else>
          <div class="text-body-2 text-medium-emphasis mb-3">
            {{ paginatedTransactions.length
            }}{{ totalCount > 0 ? ` of ${totalCount}` : "" }} transaction{{
              totalCount !== 1 ? "s" : ""
            }}
          </div>
          <div class="transaction-list">
            <TransactionCard
              v-for="transaction in paginatedTransactions"
              :key="transaction.id"
              :transaction="transaction"
              :account-name="getAccountName(transaction.accountId)"
              :category-name="getCategoryName(transaction.categoryId)"
              class="mb-3"
              @edit-transaction="handleEditTransaction"
              @delete-transaction="handleDeleteTransaction"
            />
          </div>

          <!-- Load More Button -->
          <div v-if="hasNextPage" class="text-center mt-4">
            <v-btn
              :loading="loadMoreLoading"
              :disabled="loadMoreLoading"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-refresh"
              @click="handleLoadMore"
            >
              Load More Transactions
            </v-btn>
          </div>

          <!-- Load More Error -->
          <v-alert v-if="loadMoreError" type="error" class="mt-4">
            {{ loadMoreError }}
          </v-alert>
        </div>
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <TransactionDeleteDialog
      v-model="showDeleteConfirmDialog"
      :transaction="transactionToDelete"
      :account-name="transactionToDelete ? getAccountName(transactionToDelete.accountId) : ''"
      @confirm="confirmDeleteTransaction"
      @cancel="cancelDeleteTransaction"
    />

    <!-- Create Transaction Dialog -->
    <v-dialog
      v-model="showCreateTransactionDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '600'"
      persistent
    >
      <TransactionForm
        :loading="transactionFormLoading"
        @submit="handleCreateTransactionSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>

    <!-- Edit Transaction Dialog -->
    <v-dialog
      v-model="showEditTransactionDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '600'"
      persistent
    >
      <TransactionForm
        :transaction="editingTransaction"
        :loading="transactionFormLoading"
        @submit="handleEditTransactionSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useTransactions } from "@/composables/useTransactions";
import { useAccounts } from "@/composables/useAccounts";
import { useCategories } from "@/composables/useCategories";
import { useSnackbar } from "@/composables/useSnackbar";
import TransactionCard from "@/components/transactions/TransactionCard.vue";
import TransactionForm from "@/components/transactions/TransactionForm.vue";
import TransactionDeleteDialog from "@/components/transactions/TransactionDeleteDialog.vue";
import type { Transaction, CreateTransactionInput } from "@/composables/useTransactions";

// Composables
const {
  paginatedTransactions,
  paginatedLoading,
  transactionsError,
  loadMoreLoading,
  loadMoreError,
  hasNextPage,
  totalCount,
  updateTransaction,
  deleteTransaction,
  createTransaction,
  loadMoreTransactions,
} = useTransactions();
const { accounts: accountsData } = useAccounts();
const { categories: categoriesData } = useCategories();
const { showSuccessSnackbar } = useSnackbar();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.accounts || []);
const categories = computed(() => categoriesData.value?.categories || []);

// Transaction management state
const showCreateTransactionDialog = ref(false);
const showEditTransactionDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const editingTransaction = ref<Transaction | null>(null);
const transactionToDelete = ref<Transaction | null>(null);
const transactionFormLoading = ref(false);

// Event handlers
const handleAddTransaction = () => {
  showCreateTransactionDialog.value = true;
};

const handleEditTransaction = (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    editingTransaction.value = { ...transaction };
    showEditTransactionDialog.value = true;
  }
};

const handleDeleteTransaction = (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    transactionToDelete.value = transaction;
    showDeleteConfirmDialog.value = true;
  }
};

const handleLoadMore = async () => {
  const success = await loadMoreTransactions();

  if (!success && loadMoreError.value) {
    // Error is already handled by the composable and displayed in the UI
    console.error("Failed to load more transactions:", loadMoreError.value);
  }
};

const confirmDeleteTransaction = async () => {
  if (transactionToDelete.value) {
    const success = await deleteTransaction(transactionToDelete.value.id);
    if (success) {
      const amount = transactionToDelete.value.amount;
      const description = transactionToDelete.value.description || "transaction";
      showSuccessSnackbar(`Transaction "${description}" (${amount}) has been deleted`);
    }
    // Note: Error handling is managed by the composable
  }
  showDeleteConfirmDialog.value = false;
  transactionToDelete.value = null;
};

const cancelDeleteTransaction = () => {
  showDeleteConfirmDialog.value = false;
  transactionToDelete.value = null;
};

const handleCreateTransactionSubmit = async (transactionData: CreateTransactionInput) => {
  transactionFormLoading.value = true;
  try {
    const success = await createTransaction(transactionData);
    if (success) {
      showCreateTransactionDialog.value = false;
      showSuccessSnackbar("New transaction was created");
    }
  } finally {
    transactionFormLoading.value = false;
  }
};

const handleEditTransactionSubmit = async (transactionData: CreateTransactionInput) => {
  if (!editingTransaction.value) return;

  transactionFormLoading.value = true;
  try {
    const success = await updateTransaction(editingTransaction.value.id, transactionData);
    if (success) {
      showEditTransactionDialog.value = false;
      editingTransaction.value = null;
      showSuccessSnackbar("Transaction was updated");
    }
  } finally {
    transactionFormLoading.value = false;
  }
};

const handleTransactionFormCancel = () => {
  showCreateTransactionDialog.value = false;
  showEditTransactionDialog.value = false;
  editingTransaction.value = null;
  transactionFormLoading.value = false;
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
