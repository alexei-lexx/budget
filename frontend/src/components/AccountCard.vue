<script setup lang="ts">
import type { Account } from "@/composables/useAccounts";
import { formatCurrencyCompact } from "@/utils/currency";
import ActionDropdown from "@/components/ActionDropdown.vue";

// Define component props
interface Props {
  account: Account;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editAccount: [accountId: string];
  archiveAccount: [accountId: string];
}>();

// Currency formatting helper using the new utility
const formatAccountBalance = (amount: number, currency: string) => {
  return formatCurrencyCompact(amount, currency, { showSymbol: true });
};

// Event handlers
const handleEditAccount = () => {
  emit("editAccount", props.account.id);
};

const handleArchiveAccount = () => {
  emit("archiveAccount", props.account.id);
};
</script>

<template>
  <v-card variant="outlined" class="account-card">
    <v-card-text class="pb-2">
      <div class="d-flex align-center justify-space-between">
        <div>
          <h4 class="text-h6">{{ account.name }}</h4>
        </div>
        <ActionDropdown @edit="handleEditAccount" @delete="handleArchiveAccount" />
      </div>
      <div class="mt-2">
        <div class="text-h5 font-weight-bold">
          {{ formatAccountBalance(account.initialBalance, account.currency) }}
        </div>
      </div>
    </v-card-text>
  </v-card>
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
