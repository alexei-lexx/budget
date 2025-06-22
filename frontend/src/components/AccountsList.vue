<script setup lang="ts">
import { computed } from "vue";
import type { Account } from "@/composables/useAccounts";
import { formatCurrencyCompact } from "@/utils/currency";

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

// Currency formatting helper using the new utility
const formatAccountBalance = (amount: number, currency: string) => {
  return formatCurrencyCompact(amount, currency, { showSymbol: true });
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

  <!-- Accounts Grid - Compact Responsive Cards -->
  <v-row v-else dense>
    <v-col v-for="account in activeAccounts" :key="account.id" cols="12" sm="6" lg="4" xl="3">
      <v-card variant="outlined" class="account-card">
        <v-card-text class="pb-2">
          <div class="d-flex align-center justify-space-between">
            <div>
              <h4 class="text-h6">{{ account.name }}</h4>
            </div>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
              </template>
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pencil"
                  title="Edit"
                  @click="handleEditAccount(account.id)"
                />
                <v-list-item
                  prepend-icon="mdi-delete"
                  title="Delete"
                  @click="handleArchiveAccount(account.id)"
                />
              </v-list>
            </v-menu>
          </div>
          <div class="mt-2">
            <div class="text-h5 font-weight-bold">
              {{ formatAccountBalance(account.initialBalance, account.currency) }}
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.account-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
