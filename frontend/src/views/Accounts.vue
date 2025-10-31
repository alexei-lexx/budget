<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed } from "vue";
import AccountsList from "@/components/accounts/AccountsList.vue";
import AccountForm from "@/components/accounts/AccountForm.vue";
import AccountDeleteDialog from "@/components/accounts/AccountDeleteDialog.vue";
import { useAccounts, type Account } from "@/composables/useAccounts";
import { useSnackbar } from "@/composables/useSnackbar";

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
  deleteAccount,
  createAccountLoading,
  updateAccountLoading,
} = useAccounts();

// State for dialogs and loading
const showAddAccountDialog = ref(false);
const showEditAccountDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const editingAccount = ref<Account | null>(null);
const accountToDelete = ref<Account | null>(null);

// Use global snackbar
const { showSuccessSnackbar } = useSnackbar();

// Use accounts data directly
const accounts = computed<Account[]>(() => {
  if (!accountsData.value?.accounts) return [];
  return accountsData.value.accounts;
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

const deleteAccountHandler = (accountId: string) => {
  const account = accounts.value.find((a) => a.id === accountId);
  if (account) {
    accountToDelete.value = account;
    showDeleteConfirmDialog.value = true;
  }
};

const confirmDeleteAccount = async () => {
  if (accountToDelete.value) {
    const result = await deleteAccount(accountToDelete.value.id);
    if (result) {
      showSuccessSnackbar(`Account "${accountToDelete.value.name}" has been deleted`);
    }
    // Note: Error handling is managed globally via Apollo error link
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
  let success = false;
  let successMessage = "";

  if (accountData.id) {
    // Edit existing account
    const result = await updateAccount(accountData.id, {
      name: accountData.name,
      currency: accountData.currency,
      initialBalance: accountData.initialBalance,
    });
    success = !!result;
    successMessage = `Account "${accountData.name}" has been updated`;
    if (success) showEditAccountDialog.value = false;
  } else {
    // Create new account
    const result = await createAccount({
      name: accountData.name,
      currency: accountData.currency,
      initialBalance: accountData.initialBalance,
    });
    success = !!result;
    successMessage = `Account "${accountData.name}" has been created`;
    if (success) showAddAccountDialog.value = false;
  }

  if (success) {
    editingAccount.value = null;
    showSuccessSnackbar(successMessage);
  }
  // Note: Error handling is now managed globally via Apollo error link
  // Local errors are logged but not displayed to avoid overriding global error messages
};

const handleAccountCancel = () => {
  showAddAccountDialog.value = false;
  showEditAccountDialog.value = false;
  editingAccount.value = null;
};
</script>

<template>
  <v-container :class="{ 'pa-3': $vuetify.display.xs, 'pa-6': $vuetify.display.smAndUp }">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6"
      :class="{
        'flex-column ga-3': $vuetify.display.xs,
        'justify-space-between': $vuetify.display.smAndUp,
      }"
    >
      <h1 :class="$vuetify.display.xs ? 'text-h5' : 'text-h4'">Accounts</h1>
      <v-btn
        v-if="$vuetify.display.smAndUp"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddAccountDialog"
      >
        Add Account
      </v-btn>
      <v-btn v-else color="primary" icon="mdi-plus" size="large" @click="openAddAccountDialog">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </div>

    <!-- Accounts List Component -->
    <AccountsList
      :accounts="accounts"
      :loading="loading"
      @edit-account="editAccount"
      @delete-account="deleteAccountHandler"
    >
      <template #empty-action>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddAccountDialog">
          Add Your First Account
        </v-btn>
      </template>
    </AccountsList>

    <!-- Add Account Dialog -->
    <v-dialog
      v-model="showAddAccountDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '600'"
      :fullscreen="$vuetify.display.xs"
      persistent
    >
      <AccountForm
        :loading="formLoading"
        @submit="handleAccountSubmit"
        @cancel="handleAccountCancel"
      />
    </v-dialog>

    <!-- Edit Account Dialog -->
    <v-dialog
      v-model="showEditAccountDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '600'"
      :fullscreen="$vuetify.display.xs"
      persistent
    >
      <AccountForm
        :account="editingAccount"
        :loading="formLoading"
        @submit="handleAccountSubmit"
        @cancel="handleAccountCancel"
      />
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <AccountDeleteDialog
      v-model="showDeleteConfirmDialog"
      :account="accountToDelete"
      @confirm="confirmDeleteAccount"
      @cancel="cancelDeleteAccount"
    />
  </v-container>
</template>
