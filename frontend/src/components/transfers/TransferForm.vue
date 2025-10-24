<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getCurrencySymbol } from "@/utils/currency";
import { checkRules, type CheckRule } from "@/utils/validation";
import { currencyAmountRules } from "@/utils/currencyValidation";
import { getTodayDateString } from "@/utils/date";
import { useAccounts } from "@/composables/useAccounts";
import AccountSelect from "@/components/common/AccountSelect.vue";
import DescriptionAutocomplete from "@/components/common/DescriptionAutocomplete.vue";
import type {
  Transfer,
  CreateTransferInput,
  UpdateTransferInput,
} from "@/composables/useTransfers";

// Define emitted events
const emit = defineEmits<{
  submit: [data: CreateTransferInput | UpdateTransferInput];
  cancel: [];
}>();

// Define component props
interface Props {
  transfer?: Transfer | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  transfer: null,
  loading: false,
});

// Use composables
const { accounts: accountsData } = useAccounts();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.accounts || []);

// Mode detection
const isEditing = computed(() => !!props.transfer?.id);

// Dynamic UI content
const formTitle = computed(() => (isEditing.value ? "Edit Transfer" : "Create Transfer"));
const submitButtonText = computed(() => (isEditing.value ? "Update Transfer" : "Create Transfer"));
const titleIcon = computed(() => (isEditing.value ? "mdi-pencil" : "mdi-swap-horizontal"));

// Form data
const formData = ref<CreateTransferInput>({
  fromAccountId: "",
  toAccountId: "",
  amount: 0,
  date: getTodayDateString(),
  description: "",
});

// Create a computed wrapper for description to handle the undefined type
const descriptionValue = computed({
  get: () => formData.value.description || "",
  set: (value: string) => {
    formData.value.description = value;
  },
});

// Watch for transfer prop changes to populate form in edit mode
watch(
  () => props.transfer,
  (newTransfer) => {
    if (newTransfer) {
      formData.value = {
        fromAccountId: newTransfer.outboundTransaction.accountId,
        toAccountId: newTransfer.inboundTransaction.accountId,
        amount: newTransfer.outboundTransaction.amount,
        date: newTransfer.outboundTransaction.date,
        description: newTransfer.outboundTransaction.description || "",
      };
    } else {
      // Reset form for create mode
      formData.value = {
        fromAccountId: "",
        toAccountId: "",
        amount: 0,
        date: getTodayDateString(),
        description: "",
      };
    }
  },
  { immediate: true },
);

// Form validation
const formValid = ref(false);
const formRef = ref();
const amountFieldRef = ref();

// Validation rules
const fromAccountRules: CheckRule[] = [(value: string) => !!value || "Source account is required"];

const toAccountRules: CheckRule[] = [
  (value: string) => !!value || "Destination account is required",
];

const amountRules = currencyAmountRules;

const dateRules: CheckRule[] = [
  (value: string) => !!value || "Date is required",
  (value: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value) || "Date must be in YYYY-MM-DD format";
  },
];

// Custom validation for account selection and currency matching
const accountValidationRules: CheckRule[] = [
  () => {
    if (!formData.value.fromAccountId || !formData.value.toAccountId) {
      return true; // Skip validation if accounts aren't selected
    }

    // Check if same account selected for both
    if (formData.value.fromAccountId === formData.value.toAccountId) {
      return "Source and destination accounts must be different";
    }

    const fromAccount = accounts.value.find((a) => a.id === formData.value.fromAccountId);
    const toAccount = accounts.value.find((a) => a.id === formData.value.toAccountId);

    if (fromAccount && toAccount && fromAccount.currency !== toAccount.currency) {
      return "Source and destination accounts must have the same currency";
    }
    return true;
  },
];

// Force validation check when form data changes
const isFormValid = computed(() => {
  const fromAccountValid = checkRules(formData.value.fromAccountId, fromAccountRules);
  const toAccountValid = checkRules(formData.value.toAccountId, toAccountRules);
  const amountValid = checkRules(formData.value.amount, amountRules);
  const dateValid = checkRules(formData.value.date, dateRules);
  const accountValid = checkRules("", accountValidationRules);

  return fromAccountValid && toAccountValid && amountValid && dateValid && accountValid;
});

// Get selected account for currency information
const fromAccount = computed(() => {
  return accounts.value.find((account) => account.id === formData.value.fromAccountId);
});

// Currency prefix for amount input
const currencyPrefix = computed(() => {
  if (fromAccount.value) {
    return getCurrencySymbol(fromAccount.value.currency);
  }
  return "";
});

// Event handlers
const handleSubmit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (valid && isFormValid.value) {
      if (isEditing.value && props.transfer) {
        // Edit mode: create UpdateTransferInput object
        const updateData: UpdateTransferInput = {
          id: props.transfer.id,
          fromAccountId: formData.value.fromAccountId,
          toAccountId: formData.value.toAccountId,
          amount: formData.value.amount,
          date: formData.value.date,
          description: formData.value.description === "" ? null : formData.value.description,
        };
        emit("submit", updateData);
      } else {
        // Create mode: create CreateTransferInput object
        const createData: CreateTransferInput = {
          fromAccountId: formData.value.fromAccountId,
          toAccountId: formData.value.toAccountId,
          amount: formData.value.amount,
          date: formData.value.date,
          description: formData.value.description === "" ? null : formData.value.description,
        };
        emit("submit", createData);
      }
    } else {
      // Validation failed - the form will show field-specific errors
      // but we don't need a global notification as Vuetify handles this well
    }
  }
};

const handleCancel = () => {
  emit("cancel");
};

// Handle account swap
const handleSwapAccounts = () => {
  const temp = formData.value.fromAccountId;
  formData.value.fromAccountId = formData.value.toAccountId;
  formData.value.toAccountId = temp;
};
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2" color="primary">{{ titleIcon }}</v-icon>
      {{ formTitle }}
      <v-spacer></v-spacer>
      <v-btn
        icon="mdi-swap-vertical"
        variant="text"
        size="small"
        :disabled="loading || !formData.fromAccountId || !formData.toAccountId"
        @click="handleSwapAccounts"
        title="Swap accounts"
      >
      </v-btn>
    </v-card-title>

    <v-card-text>
      <v-form
        ref="formRef"
        v-model="formValid"
        @submit.prevent="handleSubmit"
        @keydown.esc="$emit('cancel')"
      >
        <v-row>
          <v-col cols="12" md="6">
            <!-- From Account Selection -->
            <AccountSelect
              v-model="formData.fromAccountId"
              label="From Account"
              :rules="[...fromAccountRules, ...accountValidationRules]"
              :disabled="loading"
              required
            />
          </v-col>

          <v-col cols="12" md="6">
            <!-- To Account Selection -->
            <AccountSelect
              v-model="formData.toAccountId"
              label="To Account"
              :rules="[...toAccountRules, ...accountValidationRules]"
              :disabled="loading"
              required
            />
          </v-col>

          <v-col cols="12" md="6">
            <!-- Amount -->
            <v-text-field
              ref="amountFieldRef"
              v-model.number="formData.amount"
              type="number"
              step="1"
              min="0"
              label="Amount"
              :rules="amountRules"
              :disabled="loading"
              variant="outlined"
              required
              autofocus
            >
              <template #prepend-inner>
                <span class="text-medium-emphasis">
                  {{ currencyPrefix }}
                </span>
              </template>
            </v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <!-- Date -->
            <v-text-field
              v-model="formData.date"
              type="date"
              label="Date"
              :rules="dateRules"
              :disabled="loading"
              variant="outlined"
              required
            />
          </v-col>
          <v-col cols="12">
            <!-- Description (Full Width) -->
            <DescriptionAutocomplete
              v-model="descriptionValue"
              label="Description (Optional)"
              placeholder="e.g., Monthly savings transfer, Emergency fund contribution"
              :disabled="loading"
              variant="outlined"
            />
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-6 pb-6" :class="{ 'flex-column ga-2': $vuetify.display.xs }">
      <v-btn variant="text" @click="handleCancel" :disabled="loading" :block="$vuetify.display.xs">
        Cancel
      </v-btn>

      <v-spacer v-if="$vuetify.display.smAndUp"></v-spacer>

      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="!isFormValid || loading"
        @click="handleSubmit"
        :block="$vuetify.display.xs"
      >
        {{ submitButtonText }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
