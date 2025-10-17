<script setup lang="ts">
import type { Account } from "@/composables/useAccounts";
import { formatCurrency } from "@/utils/currency";
import ActionButtons from "@/components/common/ActionButtons.vue";

// Define component props
interface Props {
  account: Account;
  isExpanded: boolean;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editAccount: [accountId: string];
  deleteAccount: [accountId: string];
  toggleExpand: [accountId: string];
}>();

// Event handlers
const handleEditAccount = () => {
  emit("editAccount", props.account.id);
};

const handleDeleteAccount = () => {
  emit("deleteAccount", props.account.id);
};

const handleCardClick = () => {
  emit("toggleExpand", props.account.id);
};
</script>

<template>
  <v-card
    variant="outlined"
    class="account-card"
    :class="{ expanded: isExpanded }"
    @click="handleCardClick"
    style="cursor: pointer"
  >
    <v-card-text class="py-3">
      <!-- Collapsed state: Always visible content -->
      <div class="d-flex align-center justify-space-between">
        <div class="text-truncate" style="min-width: 0; flex: 1">
          <h4 class="text-h6 mb-0 text-truncate">{{ account.name }}</h4>
        </div>
        <div class="text-h5 font-weight-bold flex-shrink-0">
          {{ formatCurrency(account.balance, account.currency) }}
        </div>
      </div>

      <!-- Expanded state: Conditional action buttons -->
      <div v-if="isExpanded" class="d-flex mt-3 justify-end">
        <ActionButtons @edit="handleEditAccount" @delete="handleDeleteAccount" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.account-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.account-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.account-card.expanded:hover {
  transform: none; /* Disable hover transform when expanded */
}
</style>
