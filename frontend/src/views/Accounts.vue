<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref } from "vue";

// State for dialog
const showAddAccountDialog = ref(false);

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

// Currency formatting helper
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
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

    <!-- Account Grid -->
    <v-row>
      <v-col v-for="account in accounts" :key="account.id" cols="12" md="6" lg="4">
        <v-card>
          <v-card-title>
            <v-icon class="me-2">mdi-bank</v-icon>
            {{ account.name }}
          </v-card-title>

          <v-card-text>
            <div class="text-h5 mb-2">
              {{ formatCurrency(account.currentBalance, account.currency) }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              Initial Balance: {{ formatCurrency(account.initialBalance, account.currency) }}
            </div>
          </v-card-text>

          <v-card-actions>
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-pencil"
              @click="editAccount(account.id)"
            >
              Edit
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              prepend-icon="mdi-archive"
              color="error"
              @click="archiveAccount(account.id)"
            >
              Archive
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-sheet
      v-if="accounts.length === 0"
      border="dashed md"
      color="surface-light"
      height="300"
      rounded="lg"
      width="100%"
      class="d-flex flex-column align-center justify-center"
    >
      <v-icon size="64" class="mb-4" color="primary">mdi-bank-plus</v-icon>
      <div class="text-h6 mb-2">No Accounts Yet</div>
      <div class="text-body-1 text-center mb-4">
        Get started by creating your first account to track your finances.
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddAccountDialog">
        Add Your First Account
      </v-btn>
    </v-sheet>

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
