<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from "vue";
import AccountsList from "@/components/AccountsList.vue";
import AccountForm from "@/components/AccountForm.vue";

// Define Account interface
interface Account {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
}

// Define Account form data interface (for creating new accounts)
interface AccountFormData {
  id?: string;
  name: string;
  currency: string;
  initialBalance: number;
}

// State for dialogs and loading
const showAddAccountDialog = ref(false);
const showEditAccountDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const loading = ref(false);
const formLoading = ref(false);
const editingAccount = ref<Account | null>(null);
const accountToDelete = ref<Account | null>(null);

// Sample data for now - will be replaced with actual GraphQL data
const accounts = ref<Account[]>([
  {
    id: "1",
    name: "Cash",
    currency: "USD",
    initialBalance: 1234.56,
    currentBalance: 1234.56,
  },
  {
    id: "2",
    name: "Bank Account",
    currency: "EUR",
    initialBalance: 2500.0,
    currentBalance: 2500.0,
  },
]);

// Functions for account operations
const openAddAccountDialog = () => {
  showAddAccountDialog.value = true;
};

const editAccount = (accountId: string) => {
  const account = accounts.value.find((a) => a.id === accountId);
  if (account) {
    editingAccount.value = { ...account };
    showEditAccountDialog.value = true;
  }
};

const archiveAccount = (accountId: string) => {
  const account = accounts.value.find((a) => a.id === accountId);
  if (account) {
    accountToDelete.value = account;
    showDeleteConfirmDialog.value = true;
  }
};

const confirmDeleteAccount = () => {
  if (accountToDelete.value) {
    // Remove account from frontend list (backend will handle archiving)
    const index = accounts.value.findIndex((a) => a.id === accountToDelete.value!.id);
    if (index !== -1) {
      accounts.value.splice(index, 1);
    }
    console.log("Account deleted:", accountToDelete.value.name);
    // TODO: Implement actual GraphQL archiveAccount mutation
  }
  showDeleteConfirmDialog.value = false;
  accountToDelete.value = null;
};

const cancelDeleteAccount = () => {
  showDeleteConfirmDialog.value = false;
  accountToDelete.value = null;
};

// Form handlers
const handleAccountSubmit = async (accountData: AccountFormData) => {
  formLoading.value = true;

  try {
    if (accountData.id) {
      // Edit existing account
      const index = accounts.value.findIndex((a) => a.id === accountData.id);
      if (index !== -1) {
        accounts.value[index] = {
          ...accounts.value[index],
          name: accountData.name,
          currency: accountData.currency,
          initialBalance: accountData.initialBalance,
          currentBalance: accountData.initialBalance, // For now, reset current balance
        };
      }
      showEditAccountDialog.value = false;
    } else {
      // Create new account
      const newAccount: Account = {
        id: (accounts.value.length + 1).toString(),
        name: accountData.name,
        currency: accountData.currency,
        initialBalance: accountData.initialBalance,
        currentBalance: accountData.initialBalance,
      };
      accounts.value.push(newAccount);
      showAddAccountDialog.value = false;
    }
  } catch (error) {
    console.error("Error saving account:", error);
    // TODO: Show error message
  } finally {
    formLoading.value = false;
    editingAccount.value = null;
  }
};

const handleAccountCancel = () => {
  showAddAccountDialog.value = false;
  showEditAccountDialog.value = false;
  editingAccount.value = null;
  formLoading.value = false;
};
</script>

<template>
  <v-container>
    <!-- Page Header -->
    <div class="d-flex justify-space-between align-center mb-6">
      <h1 class="text-h4">Accounts</h1>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddAccountDialog">
        Add New Account
      </v-btn>
    </div>

    <!-- Accounts List Component -->
    <AccountsList
      :accounts="accounts"
      :loading="loading"
      @edit-account="editAccount"
      @archive-account="archiveAccount"
    >
      <template #empty-action>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddAccountDialog">
          Add Your First Account
        </v-btn>
      </template>
    </AccountsList>

    <!-- Add Account Dialog -->
    <v-dialog v-model="showAddAccountDialog" max-width="600" persistent>
      <AccountForm
        :loading="formLoading"
        @submit="handleAccountSubmit"
        @cancel="handleAccountCancel"
      />
    </v-dialog>

    <!-- Edit Account Dialog -->
    <v-dialog v-model="showEditAccountDialog" max-width="600" persistent>
      <AccountForm
        :account="editingAccount"
        :loading="formLoading"
        @submit="handleAccountSubmit"
        @cancel="handleAccountCancel"
      />
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteConfirmDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon color="error" class="me-2">mdi-alert</v-icon>
          Delete Account
        </v-card-title>

        <v-card-text>
          <p class="text-body-1 mb-3">
            Are you sure you want to delete the account
            <strong>"{{ accountToDelete?.name }}"</strong>?
          </p>
          <p class="text-body-2 text-medium-emphasis">
            This action cannot be undone. The account will be permanently removed from your records,
            but historical transaction data will be preserved.
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelDeleteAccount"> Cancel </v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeleteAccount"> Delete </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
