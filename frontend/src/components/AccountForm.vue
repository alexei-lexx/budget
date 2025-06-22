<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { formatCurrency, getCurrencyInputPrefix } from "@/utils/currency";
import { useCurrencies } from "@/composables/useCurrencies";

// Define Account interface for editing
interface Account {
  id?: string;
  name: string;
  currency: string;
  initialBalance: number;
}

// Define component props
interface Props {
  account?: Account | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  account: null,
  loading: false,
});

// Define emitted events
const emit = defineEmits<{
  submit: [account: Account];
  cancel: [];
}>();

// Use currencies composable for enhanced error handling
const {
  supportedCurrencies,
  currenciesLoading,
  hasError: currencyHasError,
  errorMessage: currencyErrorMessage,
  retry: retryCurrencies,
  defaultCurrency,
} = useCurrencies();

// Form data
const formData = ref<Account>({
  name: "",
  currency: "",
  initialBalance: 0,
});

// Update currency when default becomes available
watch(
  defaultCurrency,
  (newDefault) => {
    if (newDefault && !formData.value.currency) {
      formData.value.currency = newDefault;
    }
  },
  { immediate: true },
);

// Form validation
const formValid = ref(false);
const formRef = ref();

// Validation rules
const nameRules = [
  (v: string) => !!v || "Account name is required",
  (v: string) => (v && v.trim().length > 0) || "Account name cannot be empty",
  (v: string) => (v && v.length <= 100) || "Account name cannot exceed 100 characters",
];

const currencyRules = [
  (v: string) => !!v || "Currency is required",
  (v: string) =>
    supportedCurrencies.value.some((c: { value: string; title: string }) => c.value === v) ||
    "Please select a valid currency",
];

const balanceRules = [
  (v: number | string) => (v !== "" && v !== null) || "Initial balance is required",
  (v: number | string) => !isNaN(Number(v)) || "Initial balance must be a valid number",
  (v: number | string) => isFinite(Number(v)) || "Initial balance must be a finite number",
];

// Computed properties
const isEditing = computed(() => !!props.account?.id);
const formTitle = computed(() => (isEditing.value ? "Edit Account" : "Create New Account"));
const submitButtonText = computed(() => (isEditing.value ? "Update Account" : "Create Account"));

// Watch for account prop changes (for editing)
watch(
  () => props.account,
  (newAccount) => {
    if (newAccount) {
      formData.value = {
        id: newAccount.id,
        name: newAccount.name,
        currency: newAccount.currency,
        initialBalance: newAccount.initialBalance,
      };
    } else {
      // Reset form for new account
      formData.value = {
        name: "",
        currency: defaultCurrency.value || "",
        initialBalance: 0,
      };
    }
  },
  { immediate: true },
);

// Form methods
const handleSubmit = async () => {
  const { valid } = await formRef.value.validate();
  if (valid) {
    // Create clean account object
    const accountData: Account = {
      name: formData.value.name.trim(),
      currency: formData.value.currency,
      initialBalance: Number(formData.value.initialBalance),
    };

    // Include ID if editing
    if (isEditing.value && formData.value.id) {
      accountData.id = formData.value.id;
    }

    emit("submit", accountData);
  }
};

const handleCancel = () => {
  emit("cancel");
};

// Form reset method (can be used later for additional functionality)
// const resetForm = () => {
//   formRef.value?.reset()
//   formData.value = {
//     name: '',
//     currency: 'USD',
//     initialBalance: 0
//   }
// }
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="me-2" color="primary">
        {{ isEditing ? "mdi-pencil" : "mdi-plus" }}
      </v-icon>
      {{ formTitle }}
    </v-card-title>

    <v-card-text>
      <!-- Currency Error Alert -->
      <v-alert v-if="currencyErrorMessage" type="warning" variant="tonal" class="mb-4" closable>
        <div class="d-flex align-center justify-space-between">
          <span>{{ currencyErrorMessage }}</span>
          <v-btn
            size="small"
            variant="outlined"
            color="warning"
            @click="retryCurrencies"
            :loading="currenciesLoading"
          >
            Retry
          </v-btn>
        </div>
      </v-alert>

      <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
        <!-- Account Name -->
        <v-text-field
          v-model="formData.name"
          label="Account Name"
          placeholder="e.g., Cash, Bank Account, Credit Card"
          :rules="nameRules"
          :disabled="loading"
          variant="outlined"
          class="mb-4"
          required
        ></v-text-field>

        <!-- Currency Selection -->
        <v-select
          v-model="formData.currency"
          label="Currency"
          :items="supportedCurrencies"
          :rules="currencyRules"
          :disabled="loading || currenciesLoading"
          :loading="currenciesLoading"
          variant="outlined"
          class="mb-4"
          required
        >
          <template #no-data>
            <v-list-item v-if="currencyHasError">
              <v-list-item-title class="text-error">
                Failed to load currencies. Using defaults.
              </v-list-item-title>
            </v-list-item>
          </template>
        </v-select>

        <!-- Initial Balance -->
        <v-text-field
          v-model.number="formData.initialBalance"
          label="Initial Balance"
          type="number"
          step="0.01"
          :rules="balanceRules"
          :disabled="loading"
          variant="outlined"
          class="mb-4"
          required
        >
          <template #prepend-inner>
            <span class="text-medium-emphasis">
              {{ getCurrencyInputPrefix(formData.currency) }}
            </span>
          </template>
        </v-text-field>

        <!-- Balance Preview -->
        <v-alert
          v-if="formData.name && formData.currency && formData.initialBalance !== null"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          <div class="text-body-2">
            <strong>Preview:</strong> {{ formData.name }} will start with
            {{ formatCurrency(Number(formData.initialBalance) || 0, formData.currency) }}
          </div>
        </v-alert>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-6 pb-6">
      <v-btn variant="text" @click="handleCancel" :disabled="loading"> Cancel </v-btn>

      <v-spacer></v-spacer>

      <v-btn
        color="primary"
        variant="flat"
        :loading="loading"
        :disabled="!formValid || loading"
        @click="handleSubmit"
      >
        {{ submitButtonText }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
