<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4">
          <h1 class="text-h4">Transactions</h1>
          <div class="d-flex gap-2">
            <v-btn color="secondary" prepend-icon="mdi-swap-horizontal" @click="handleAddTransfer">
              Create Transfer
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="handleAddTransaction">
              Add Transaction
            </v-btn>
          </div>
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
          <div class="d-flex gap-2 justify-center">
            <v-btn color="secondary" prepend-icon="mdi-swap-horizontal" @click="handleAddTransfer">
              Create Transfer
            </v-btn>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="handleAddTransaction">
              Add Your First Transaction
            </v-btn>
          </div>
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
              Load More
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

    <!-- Transfer Delete Confirmation Dialog -->
    <TransferDeleteDialog
      v-model="showDeleteTransferDialog"
      :transaction="transactionToDelete"
      :from-account-name="getTransferFromAccountName(transactionToDelete)"
      :to-account-name="getTransferToAccountName(transactionToDelete)"
      @confirm="confirmDeleteTransfer"
      @cancel="cancelDeleteTransfer"
    />

    <!-- Create Transaction Dialog -->
    <v-dialog v-model="showCreateTransactionDialog" :max-width="dialogMaxWidth" persistent>
      <TransactionForm
        :loading="transactionFormLoading"
        @submit="handleCreateTransactionSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>

    <!-- Edit Transaction Dialog -->
    <v-dialog v-model="showEditTransactionDialog" :max-width="dialogMaxWidth" persistent>
      <TransactionForm
        :transaction="editingTransaction"
        :loading="transactionFormLoading"
        @submit="handleEditTransactionSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>

    <!-- Create Transfer Dialog -->
    <v-dialog v-model="showCreateTransferDialog" :max-width="dialogMaxWidth" persistent>
      <TransferForm
        :loading="transferFormLoading"
        @submit="handleCreateTransferSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>

    <!-- Edit Transfer Dialog -->
    <v-dialog v-model="showEditTransferDialog" :max-width="dialogMaxWidth" persistent>
      <TransferForm
        :transfer="editingTransfer"
        :loading="transferFormLoading"
        @submit="handleEditTransferSubmit"
        @cancel="handleTransactionFormCancel"
      />
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";
import { useTransactions } from "@/composables/useTransactions";
import { useAccounts } from "@/composables/useAccounts";
import { useCategories } from "@/composables/useCategories";
import { useSnackbar } from "@/composables/useSnackbar";
import { useTransfers } from "@/composables/useTransfers";
import TransactionCard from "@/components/transactions/TransactionCard.vue";
import TransactionForm from "@/components/transactions/TransactionForm.vue";
import TransactionDeleteDialog from "@/components/transactions/TransactionDeleteDialog.vue";
import TransferDeleteDialog from "@/components/transfers/TransferDeleteDialog.vue";
import TransferForm from "@/components/transfers/TransferForm.vue";
import type { Transaction, CreateTransactionInput } from "@/composables/useTransactions";
import type {
  Transfer,
  CreateTransferInput,
  UpdateTransferInput,
} from "@/composables/useTransfers";

// Composables
const { xs } = useDisplay();
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
  updateTransactionsInList,
  addTransactionsToList,
  removeTransactionsFromList,
} = useTransactions();
const { accounts: accountsData, refetchAccounts } = useAccounts();
const { categories: categoriesData } = useCategories();
const { showSuccessSnackbar, showErrorSnackbar } = useSnackbar();
const { createTransfer, updateTransfer, deleteTransfer, getTransfer } = useTransfers();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.accounts || []);
const categories = computed(() => categoriesData.value?.categories || []);

// Responsive dialog width
const dialogMaxWidth = computed(() => (xs.value ? "95vw" : "600"));

// Transaction management state
const showCreateTransactionDialog = ref(false);
const showEditTransactionDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const showDeleteTransferDialog = ref(false);
const showCreateTransferDialog = ref(false);
const showEditTransferDialog = ref(false);
const editingTransaction = ref<Transaction | null>(null);
const editingTransfer = ref<Transfer | null>(null);
const transactionToDelete = ref<Transaction | null>(null);
const transactionFormLoading = ref(false);
const transferFormLoading = ref(false);

// Event handlers
const handleAddTransaction = () => {
  showCreateTransactionDialog.value = true;
};

const handleAddTransfer = () => {
  showCreateTransferDialog.value = true;
};

const handleEditTransaction = async (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (!transaction) return;

  // Check if this is a transfer transaction
  if (
    transaction.transferId &&
    (transaction.type === "TRANSFER_IN" || transaction.type === "TRANSFER_OUT")
  ) {
    // This is a transfer transaction - load the complete transfer data
    transferFormLoading.value = true;
    try {
      const transferData = await getTransfer(transaction.transferId);
      if (transferData) {
        editingTransfer.value = transferData;
        showEditTransferDialog.value = true;
      } else {
        console.error("Transfer not found:", transaction.transferId);
        showErrorSnackbar("Transfer not found. The transfer data may have been deleted.");
      }
    } catch (error) {
      console.error("Error loading transfer data:", error);
      showErrorSnackbar("Failed to load transfer data. Please try again.");
    } finally {
      transferFormLoading.value = false;
    }
  } else {
    // Regular transaction (income/expense) - use the existing logic
    editingTransaction.value = { ...transaction };
    showEditTransactionDialog.value = true;
  }
};

const handleDeleteTransaction = (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    transactionToDelete.value = transaction;

    // Check if this is a transfer transaction
    if (
      transaction.transferId &&
      (transaction.type === "TRANSFER_IN" || transaction.type === "TRANSFER_OUT")
    ) {
      showDeleteTransferDialog.value = true;
    } else {
      showDeleteConfirmDialog.value = true;
    }
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
      // Refetch accounts to update balances
      await refetchAccounts();
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

const confirmDeleteTransfer = async () => {
  if (transactionToDelete.value?.transferId) {
    const transferId = transactionToDelete.value.transferId;
    const success = await deleteTransfer(transferId);
    if (success) {
      const amount = transactionToDelete.value.amount;
      const description = transactionToDelete.value.description || "transfer";
      showSuccessSnackbar(`Transfer "${description}" (${Math.abs(amount)}) has been deleted`);

      // Remove both paired transactions from the local list
      // Find all transaction IDs with the same transferId
      const transactionIdsToRemove = paginatedTransactions.value
        .filter((t) => t.transferId === transferId)
        .map((t) => t.id);

      // Remove them using the helper function
      removeTransactionsFromList(transactionIdsToRemove);

      // Refetch accounts to update balances
      await refetchAccounts();
    }
    // Note: Error handling is managed by the composable
  }
  showDeleteTransferDialog.value = false;
  transactionToDelete.value = null;
};

const cancelDeleteTransfer = () => {
  showDeleteTransferDialog.value = false;
  transactionToDelete.value = null;
};

const handleCreateTransactionSubmit = async (transactionData: CreateTransactionInput) => {
  transactionFormLoading.value = true;
  try {
    const success = await createTransaction(transactionData);
    if (success) {
      showCreateTransactionDialog.value = false;
      showSuccessSnackbar("New transaction was created");
      // Refetch accounts to update balances
      await refetchAccounts();
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
      // Refetch accounts to update balances
      await refetchAccounts();
    }
  } finally {
    transactionFormLoading.value = false;
  }
};

const handleCreateTransferSubmit = async (data: CreateTransferInput | UpdateTransferInput) => {
  transferFormLoading.value = true;
  try {
    // For create dialog, data should always be CreateTransferInput (no id field)
    const result = await createTransfer(data as CreateTransferInput);
    if (result) {
      showCreateTransferDialog.value = false;
      showSuccessSnackbar("Transfer was created successfully");

      // Add the new transfer transactions to the top of the list
      addTransactionsToList([result.outboundTransaction, result.inboundTransaction]);

      // Refetch accounts to update balances
      await refetchAccounts();
    }
  } finally {
    transferFormLoading.value = false;
  }
};

const handleEditTransferSubmit = async (data: CreateTransferInput | UpdateTransferInput) => {
  if (!editingTransfer.value) return;

  transferFormLoading.value = true;
  try {
    let result;
    if ("id" in data) {
      // Edit mode - data is UpdateTransferInput
      const { id, ...input } = data;
      result = await updateTransfer(id, input);
    } else {
      // Create mode (shouldn't happen in edit, but handle it)
      // Convert CreateTransferInput to UpdateTransferInput format
      result = await updateTransfer(editingTransfer.value.id, data);
    }

    if (result) {
      showEditTransferDialog.value = false;
      editingTransfer.value = null;
      showSuccessSnackbar("Transfer was updated successfully");

      // Update the transaction list manually with the updated transactions
      updateTransactionsInList([result.outboundTransaction, result.inboundTransaction]);

      // Refetch accounts to update balances
      await refetchAccounts();
    }
  } finally {
    transferFormLoading.value = false;
  }
};

const handleTransactionFormCancel = () => {
  showCreateTransactionDialog.value = false;
  showEditTransactionDialog.value = false;
  showCreateTransferDialog.value = false;
  showEditTransferDialog.value = false;
  editingTransaction.value = null;
  editingTransfer.value = null;
  transactionFormLoading.value = false;
  transferFormLoading.value = false;
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

// Helper functions for transfer account names
const getTransferFromAccountName = (transaction: Transaction | null): string => {
  if (!transaction || !transaction.transferId) return "Unknown Account";

  // For TRANSFER_OUT, the current account is the source
  // For TRANSFER_IN, we need to find the paired TRANSFER_OUT transaction
  if (transaction.type === "TRANSFER_OUT") {
    return getAccountName(transaction.accountId);
  } else if (transaction.type === "TRANSFER_IN") {
    // Find the paired TRANSFER_OUT transaction
    const pairedTransaction = paginatedTransactions.value.find(
      (t) => t.transferId === transaction.transferId && t.type === "TRANSFER_OUT",
    );
    return pairedTransaction ? getAccountName(pairedTransaction.accountId) : "Unknown Account";
  }
  return "Unknown Account";
};

const getTransferToAccountName = (transaction: Transaction | null): string => {
  if (!transaction || !transaction.transferId) return "Unknown Account";

  // For TRANSFER_IN, the current account is the destination
  // For TRANSFER_OUT, we need to find the paired TRANSFER_IN transaction
  if (transaction.type === "TRANSFER_IN") {
    return getAccountName(transaction.accountId);
  } else if (transaction.type === "TRANSFER_OUT") {
    // Find the paired TRANSFER_IN transaction
    const pairedTransaction = paginatedTransactions.value.find(
      (t) => t.transferId === transaction.transferId && t.type === "TRANSFER_IN",
    );
    return pairedTransaction ? getAccountName(pairedTransaction.accountId) : "Unknown Account";
  }
  return "Unknown Account";
};
</script>
