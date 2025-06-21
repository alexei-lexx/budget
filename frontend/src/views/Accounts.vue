<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from "vue";
import AccountsList from "@/components/AccountsList.vue";
import AccountForm from "@/components/AccountForm.vue";

// State for dialogs and loading
const showAddAccountDialog = ref(false);
const showEditAccountDialog = ref(false);
const loading = ref(false);
const formLoading = ref(false);
const editingAccount = ref(null);

// Sample data for now - will be replaced with actual GraphQL data
const accounts = ref([
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

const closeAddAccountDialog = () => {
  showAddAccountDialog.value = false;
};

const editAccount = (accountId: string) => {
  const account = accounts.value.find(a => a.id === accountId);
  if (account) {
    editingAccount.value = { ...account };
    showEditAccountDialog.value = true;
  }
};

const archiveAccount = (accountId: string) => {
  console.log("Archive account:", accountId);
  // TODO: Implement archive functionality
};

// Form handlers
const handleAccountSubmit = async (accountData: any) => {
  formLoading.value = true;
  
  try {
    if (accountData.id) {
      // Edit existing account
      const index = accounts.value.findIndex(a => a.id === accountData.id);
      if (index !== -1) {
        accounts.value[index] = {
          ...accounts.value[index],
          name: accountData.name,
          currency: accountData.currency,
          initialBalance: accountData.initialBalance,
          currentBalance: accountData.initialBalance // For now, reset current balance
        };
      }
      showEditAccountDialog.value = false;
    } else {
      // Create new account
      const newAccount = {
        id: (accounts.value.length + 1).toString(),
        name: accountData.name,
        currency: accountData.currency,
        initialBalance: accountData.initialBalance,
        currentBalance: accountData.initialBalance
      };
      accounts.value.push(newAccount);
      showAddAccountDialog.value = false;
    }
  } catch (error) {
    console.error('Error saving account:', error);
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
  </v-container>
</template>
