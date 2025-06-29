<template>
  <DeleteConfirmationDialog
    :model-value="modelValue"
    title="Delete Account"
    :message="message"
    warning="This action cannot be undone. The account will be permanently removed from your records, but historical transaction data will be preserved."
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm')"
    @cancel="$emit('cancel')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import DeleteConfirmationDialog from "@/components/common/DeleteConfirmationDialog.vue";
import type { Account } from "@/composables/useAccounts";

interface Props {
  modelValue: boolean;
  account: Account | null;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "confirm"): void;
  (e: "cancel"): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const message = computed(() => {
  if (!props.account) return "";
  return `Are you sure you want to delete the account "${props.account.name}"?`;
});
</script>
