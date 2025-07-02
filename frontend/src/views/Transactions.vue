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
          <v-btn color="primary" prepend-icon="mdi-plus" @click="handleAddTransaction">
            Add Your First Transaction
          </v-btn>
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
  transactions,
  transactionsLoading,
  transactionsError,
  updateTransaction,
  archiveTransaction,
  createTransaction,
} = useTransactions();
const { accounts: accountsData } = useAccounts();
const { categories: categoriesData } = useCategories();
const { showSuccessSnackbar } = useSnackbar();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.activeAccounts || []);
const categories = computed(() => categoriesData.value?.activeCategories || []);

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
  const transaction = transactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    editingTransaction.value = { ...transaction };
    showEditTransactionDialog.value = true;
  }
};

const handleArchiveTransaction = (transactionId: string) => {
  const transaction = transactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    transactionToDelete.value = transaction;
    showDeleteConfirmDialog.value = true;
  }
};

const confirmDeleteTransaction = async () => {
  if (transactionToDelete.value) {
    const success = await archiveTransaction(transactionToDelete.value.id);
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
