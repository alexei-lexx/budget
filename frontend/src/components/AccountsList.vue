<script setup lang="ts">
import { computed } from "vue";

// Define Account interface
interface Account {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Define component props
interface Props {
  accounts: Account[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// Define emitted events
const emit = defineEmits<{
  editAccount: [accountId: string];
  archiveAccount: [accountId: string];
}>();

// Filter out archived accounts
const activeAccounts = computed(() => props.accounts.filter((account) => !account.isArchived));

// Currency formatting helper
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

// Event handlers
const handleEditAccount = (accountId: string) => {
  emit("editAccount", accountId);
};

const handleArchiveAccount = (accountId: string) => {
  emit("archiveAccount", accountId);
};
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" size="64" width="4"></v-progress-circular>
    <div class="text-h6 mt-4">Loading accounts...</div>
  </div>

  <!-- Empty State -->
  <v-sheet
    v-else-if="activeAccounts.length === 0"
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
    <slot name="empty-action">
      <!-- Slot for custom empty state action button -->
    </slot>
  </v-sheet>

  <!-- Accounts Table -->
  <v-table v-else>
    <thead>
      <tr>
        <th class="text-left">Account</th>
        <th class="text-right">Current Balance</th>
        <th class="text-right">Initial Balance</th>
        <th class="text-center">Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="account in activeAccounts" :key="account.id">
        <td>
          <div class="d-flex align-center">
            <v-icon class="me-2" color="primary">mdi-bank</v-icon>
            <span class="font-weight-medium">{{ account.name }}</span>
          </div>
        </td>
        <td class="text-right">
          <span class="text-h6">{{
            formatCurrency(account.currentBalance, account.currency)
          }}</span>
        </td>
        <td class="text-right text-medium-emphasis">
          {{ formatCurrency(account.initialBalance, account.currency) }}
        </td>
        <td class="text-center">
          <v-btn
            variant="text"
            size="small"
            icon="mdi-pencil"
            @click="handleEditAccount(account.id)"
          ></v-btn>
          <v-btn
            variant="text"
            size="small"
            icon="mdi-archive"
            color="error"
            @click="handleArchiveAccount(account.id)"
          ></v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
