<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6 flex-column flex-sm-row ga-3 ga-sm-0 justify-sm-space-between"
    >
      <h1 class="text-h5 text-sm-h4">Transactions</h1>
      <div class="d-flex">
        <!-- Desktop buttons: d-none d-md-flex - hidden by default, shown at 960px+ -->
        <v-btn
          class="d-none d-md-flex"
          color="primary"
          prepend-icon="mdi-plus"
          @click="handleAddTransaction"
        >
          Add Transaction
        </v-btn>
        <!-- Tablet/Mobile buttons: d-flex d-md-none - shown by default, hidden at 960px+ -->
        <v-btn
          class="d-flex d-md-none"
          color="primary"
          icon="mdi-plus"
          size="large"
          aria-label="Add Transaction"
          @click="handleAddTransaction"
        />
        <v-btn
          class="d-none d-md-flex ml-3"
          color="secondary"
          prepend-icon="mdi-swap-horizontal"
          @click="handleAddTransfer"
        >
          Add Transfer
        </v-btn>
        <v-btn
          class="d-flex d-md-none ml-3"
          color="secondary"
          icon="mdi-swap-horizontal"
          size="large"
          aria-label="Add Transfer"
          @click="handleAddTransfer"
        />
      </div>
    </div>

    <!-- Transaction Filter Bar -->
    <TransactionFilterBar
      :accounts="accounts"
      :categories="categories"
      :filters="transactionFilters"
      :loading="paginatedLoading"
      @apply="() => {}"
      @clear="() => {}"
    />

    <!-- Natural Language Transaction Input -->
    <div class="d-flex align-center ga-2 mb-4">
      <v-text-field
        v-model="nlText"
        :disabled="nlLoading"
        placeholder="e.g., morning coffee 4.5 euro"
        label="Create transaction from text"
        variant="outlined"
        density="compact"
        hide-details
        class="flex-grow-1"
        @keydown.enter="handleNlSubmit"
      />
      <v-btn
        :loading="nlLoading"
        :disabled="!nlText.trim() || nlLoading"
        color="primary"
        @click="handleNlSubmit"
      >
        Add
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="paginatedLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" width="4"></v-progress-circular>
      <div class="text-h6 mt-4">Loading transactions...</div>
    </div>

    <!-- Error State -->
    <v-alert v-else-if="transactionsError" type="error" class="mb-4">
      {{ transactionsError }}
    </v-alert>

    <!-- Empty State -->
    <div v-else-if="paginatedTransactions.length === 0" class="mt-4">
      <v-empty-state
        icon="mdi-swap-horizontal"
        title="No Transactions Yet"
        text="Start tracking your income and expenses by adding your first transaction."
      />
    </div>

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
          :is-expanded="isTransactionExpanded(transaction.id)"
          class="mb-3"
          @edit-transaction="handleEditTransaction"
          @delete-transaction="handleDeleteTransaction"
          @duplicate-transaction="handleDuplicateTransaction"
          @toggle-expand="toggleTransactionExpand"
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

    <!-- Delete Confirmation Dialog -->
    <TransactionDeleteDialog
      v-model="showDeleteConfirmDialog"
      :transaction="transactionToDelete"
      :account-name="transactionToDelete ? transactionToDelete.account.name : ''"
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
        :transaction="duplicatingTransaction"
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
        :transfer="duplicatingTransfer"
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
import { computed, ref, watch } from "vue";
import { useDisplay } from "vuetify";
import { getTodayDateString } from "@/utils/date";
import { useTransactions } from "@/composables/useTransactions";
import { useAccounts } from "@/composables/useAccounts";
import { useCategories } from "@/composables/useCategories";
import { useCreateTransactionFromText } from "@/composables/useCreateTransactionFromText";
import { useSnackbar } from "@/composables/useSnackbar";
import { useTransfers } from "@/composables/useTransfers";
import { useTransactionFilters } from "@/composables/useTransactionFilters";
import TransactionCard from "@/components/transactions/TransactionCard.vue";
import TransactionForm from "@/components/transactions/TransactionForm.vue";
import TransactionDeleteDialog from "@/components/transactions/TransactionDeleteDialog.vue";
import TransactionFilterBar from "@/components/transactions/TransactionFilterBar.vue";
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

// Filter state
const transactionFilters = useTransactionFilters();

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
  refetchTransactions,
  updateTransactionsInList,
  addTransactionsToList,
  removeTransactionsFromList,
} = useTransactions({
  filters: transactionFilters.appliedFilters,
});
const { accounts: accountsData, refetchAccounts } = useAccounts();
const { categories: categoriesData } = useCategories();
const { showSuccessSnackbar, showErrorSnackbar } = useSnackbar();
const { createTransfer, updateTransfer, deleteTransfer, getTransfer, transfersError } =
  useTransfers();

// NL transaction creation
const { text: nlText, loading: nlLoading, submit: nlSubmit } = useCreateTransactionFromText();

const handleNlSubmit = async () => {
  const transaction = await nlSubmit();
  if (transaction) {
    // Prepend the new transaction to the list so it appears at the top
    addTransactionsToList([transaction]);
  }
};

// Watch applied filters and refetch when they change
watch(
  () => transactionFilters.appliedFilters.value,
  () => {
    refetchTransactions();
  },
  { deep: true },
);

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
const duplicatingTransaction = ref<Transaction | null>(null);
const duplicatingTransfer = ref<Transfer | null>(null);
const transactionToDelete = ref<Transaction | null>(null);
const transactionFormLoading = ref(false);
const transferFormLoading = ref(false);

// Expansion state for collapsible transaction cards
const expandedTransactionIds = ref<Set<string>>(new Set());

// Event handlers
const handleAddTransaction = () => {
  duplicatingTransaction.value = null;
  showCreateTransactionDialog.value = true;
};

const handleAddTransfer = () => {
  duplicatingTransfer.value = null;
  showCreateTransferDialog.value = true;
};

const handleEditTransaction = async (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (!transaction) return;

  // Check if this is a transfer transaction
  if (isTransferTransaction(transaction)) {
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

const handleDuplicateTransaction = async (transaction: Transaction) => {
  if (isTransferTransaction(transaction)) {
    transferFormLoading.value = true;
    try {
      const transferData = await getTransfer(transaction.transferId);
      if (transferData) {
        duplicatingTransfer.value = {
          ...transferData,
          id: "",
          outboundTransaction: {
            ...transferData.outboundTransaction,
            date: getTodayDateString(),
          },
          inboundTransaction: {
            ...transferData.inboundTransaction,
            date: getTodayDateString(),
          },
        };
        showCreateTransferDialog.value = true;
      } else {
        showErrorSnackbar("Transfer not found. The transfer data may have been deleted.");
      }
    } catch (error) {
      console.error("Error loading transfer for duplicate:", error);
      showErrorSnackbar("Failed to load transfer data. Please try again.");
    } finally {
      transferFormLoading.value = false;
    }
  } else {
    duplicatingTransaction.value = {
      ...transaction,
      id: "",
      date: getTodayDateString(),
    };
    showCreateTransactionDialog.value = true;
  }
};

const handleDeleteTransaction = (transactionId: string) => {
  const transaction = paginatedTransactions.value.find((t) => t.id === transactionId);
  if (transaction) {
    transactionToDelete.value = transaction;

    // Check if this is a transfer transaction
    if (isTransferTransaction(transaction)) {
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
    } else {
      // Transfer deletion failed
      const errorMessage = transfersError.value || "Failed to delete transfer. Please try again.";
      showErrorSnackbar(errorMessage);
    }
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
      addTransactionsToList([result.inboundTransaction, result.outboundTransaction]);

      // Refetch accounts to update balances
      await refetchAccounts();
    } else {
      // Transfer creation failed
      const errorMessage = transfersError.value || "Failed to create transfer. Please try again.";
      showErrorSnackbar(errorMessage);
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
    } else {
      // Transfer update failed
      const errorMessage = transfersError.value || "Failed to update transfer. Please try again.";
      showErrorSnackbar(errorMessage);
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

// Expansion state handlers
const toggleTransactionExpand = (transactionId: string) => {
  if (expandedTransactionIds.value.has(transactionId)) {
    expandedTransactionIds.value.delete(transactionId);
  } else {
    expandedTransactionIds.value.add(transactionId);
  }
  // Trigger Vue reactivity by creating new Set instance
  expandedTransactionIds.value = new Set(expandedTransactionIds.value);
};

const isTransactionExpanded = (transactionId: string): boolean => {
  return expandedTransactionIds.value.has(transactionId);
};

const isTransferTransaction = (
  transaction: Transaction,
): transaction is Transaction & { transferId: string } => {
  return !!(
    transaction.transferId &&
    (transaction.type === "TRANSFER_IN" || transaction.type === "TRANSFER_OUT")
  );
};

// Helper functions for transfer account names
const getTransferFromAccountName = (transaction: Transaction | null): string => {
  if (!transaction || !transaction.transferId) return "Unknown Account";

  // For TRANSFER_OUT, the current account is the source
  // For TRANSFER_IN, we need to find the paired TRANSFER_OUT transaction
  if (transaction.type === "TRANSFER_OUT") {
    return transaction.account.name;
  } else if (transaction.type === "TRANSFER_IN") {
    // Find the paired TRANSFER_OUT transaction
    const pairedTransaction = paginatedTransactions.value.find(
      (t) => t.transferId === transaction.transferId && t.type === "TRANSFER_OUT",
    );
    return pairedTransaction ? pairedTransaction.account.name : "Unknown Account";
  }
  return "Unknown Account";
};

const getTransferToAccountName = (transaction: Transaction | null): string => {
  if (!transaction || !transaction.transferId) return "Unknown Account";

  // For TRANSFER_IN, the current account is the destination
  // For TRANSFER_OUT, we need to find the paired TRANSFER_IN transaction
  if (transaction.type === "TRANSFER_IN") {
    return transaction.account.name;
  } else if (transaction.type === "TRANSFER_OUT") {
    // Find the paired TRANSFER_IN transaction
    const pairedTransaction = paginatedTransactions.value.find(
      (t) => t.transferId === transaction.transferId && t.type === "TRANSFER_IN",
    );
    return pairedTransaction ? pairedTransaction.account.name : "Unknown Account";
  }
  return "Unknown Account";
};
</script>
