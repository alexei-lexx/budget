<script setup lang="ts">
import { computed } from "vue";
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
  archiveAccount: [accountId: string];
}>();

// All accounts (archived accounts filtered by backend)
const activeAccounts = computed(() => props.accounts);

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

  <!-- Accounts Grid - Optimized for Single-Line Cards -->
  <v-row v-else dense>
    <v-col v-for="account in activeAccounts" :key="account.id" cols="12" md="6" xl="4">
      <AccountCard
        :account="account"
        @edit-account="handleEditAccount"
        @archive-account="handleArchiveAccount"
      />
    </v-col>
  </v-row>
</template>
