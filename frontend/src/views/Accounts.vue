<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from "vue";
import AccountsList from "@/components/AccountsList.vue";

// State for dialog and loading
const showAddAccountDialog = ref(false);
const loading = ref(false);

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
  console.log("Edit account:", accountId);
  // TODO: Implement edit functionality
};

const archiveAccount = (accountId: string) => {
  console.log("Archive account:", accountId);
  // TODO: Implement archive functionality
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

    <!-- Add Account Dialog Placeholder -->
    <v-dialog v-model="showAddAccountDialog" max-width="500">
      <v-card>
        <v-card-title>Add New Account</v-card-title>
        <v-card-text>
          <div class="text-center py-8">
            <v-icon size="48" class="mb-4" color="primary">mdi-wrench</v-icon>
            <div class="text-h6 mb-2">Coming Soon</div>
            <div class="text-body-1">
              Account creation form will be implemented in the next task.
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeAddAccountDialog"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
