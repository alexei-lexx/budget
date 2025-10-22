<script setup lang="ts">
import { computed, ref } from "vue";
import type { Account } from "@/composables/useAccounts";
import AccountCard from "@/components/accounts/AccountCard.vue";

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
  deleteAccount: [accountId: string];
}>();

const accounts = computed(() => props.accounts);

// Expansion state for collapsible account cards
const expandedCards = ref<Record<string, boolean>>({});

// Toggle expansion for a specific account
const toggleExpand = (accountId: string) => {
  expandedCards.value[accountId] = !expandedCards.value[accountId];
};

// Check if account is expanded
const isExpanded = (accountId: string): boolean => {
  return expandedCards.value[accountId] ?? false;
};

// Event handlers
const handleEditAccount = (accountId: string) => {
  emit("editAccount", accountId);
};

const handleDeleteAccount = (accountId: string) => {
  emit("deleteAccount", accountId);
};
</script>

<template>
  <!-- Loading State -->
  <div v-if="loading" class="text-center py-8">
    <v-progress-circular indeterminate color="primary" size="64" width="4"></v-progress-circular>
    <div class="text-h6 mt-4">Loading accounts...</div>
  </div>

  <!-- Empty State -->
  <v-empty-state
    v-else-if="accounts.length === 0"
    icon="mdi-bank-plus"
    title="No Accounts Yet"
    text="Get started by creating your first account to track your finances."
  />

  <!-- Accounts Grid - Optimized for Single-Line Cards -->
  <v-row v-else dense>
    <v-col v-for="account in accounts" :key="account.id" cols="12" md="6" xl="4">
      <AccountCard
        :account="account"
        :is-expanded="isExpanded(account.id)"
        @edit-account="handleEditAccount"
        @delete-account="handleDeleteAccount"
        @toggle-expand="toggleExpand"
      />
    </v-col>
  </v-row>
</template>
