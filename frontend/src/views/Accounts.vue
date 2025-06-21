<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed } from "vue";
import AccountsList from "@/components/AccountsList.vue";
import AccountForm from "@/components/AccountForm.vue";
import { useAccounts, type Account } from "@/composables/useAccounts";

// Define Account form data interface (for creating new accounts)
interface AccountFormData {
  id?: string;
  name: string;
  currency: string;
  initialBalance: number;
}

// Use accounts composable
const {
  accounts: accountsData,
  accountsLoading,
  createAccount,
  updateAccount,
  archiveAccount: archiveAccountMutation,
  createAccountLoading,
  updateAccountLoading,
} = useAccounts();

// State for dialogs and loading
const showAddAccountDialog = ref(false);
const showEditAccountDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const editingAccount = ref<Account | null>(null);
const accountToDelete = ref<Account | null>(null);

// Use accounts data directly
const accounts = computed<Account[]>(() => {
  if (!accountsData.value?.activeAccounts) return [];
  return accountsData.value.activeAccounts;
});

// Loading state
const loading = computed(() => accountsLoading.value);
const formLoading = computed(() => createAccountLoading.value || updateAccountLoading.value);

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

const confirmDeleteAccount = async () => {
  if (accountToDelete.value) {
    try {
      await archiveAccountMutation(accountToDelete.value.id);
      console.log("Account archived:", accountToDelete.value.name);
    } catch (error) {
      console.error("Error archiving account:", error);
      // TODO: Show error message to user
    }
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
  try {
    if (accountData.id) {
      // Edit existing account
      await updateAccount(accountData.id, {
        name: accountData.name,
        currency: accountData.currency,
        initialBalance: accountData.initialBalance,
      });
      showEditAccountDialog.value = false;
    } else {
      // Create new account
      await createAccount({
        name: accountData.name,
        currency: accountData.currency,
        initialBalance: accountData.initialBalance,
      });
      showAddAccountDialog.value = false;
    }
  } catch (error) {
    console.error("Error saving account:", error);
    // TODO: Show error message to user
  } finally {
    editingAccount.value = null;
  }
};

const handleAccountCancel = () => {
  showAddAccountDialog.value = false;
  showEditAccountDialog.value = false;
  editingAccount.value = null;
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
