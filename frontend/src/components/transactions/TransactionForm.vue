<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { getCurrencySymbol } from "@/utils/currency";
import { checkRules, type CheckRule } from "@/utils/validation";
import { currencyAmountRules } from "@/utils/currencyValidation";
import { getTodayDateString } from "@/utils/date";
import { useAccounts } from "@/composables/useAccounts";
import { useCategories } from "@/composables/useCategories";
import AccountSelect from "@/components/common/AccountSelect.vue";
import DescriptionAutocomplete from "@/components/common/DescriptionAutocomplete.vue";
import QuickTransactionButtons from "@/components/transactions/QuickTransactionButtons.vue";
import type {
  Transaction,
  CreateTransactionInput,
  TransactionType,
} from "@/composables/useTransactions";
import type { TransactionPatternType } from "@/composables/useTransactionPatterns";

// Define component props
interface Props {
  transaction?: Transaction | null;
  loading?: boolean;
  initialType?: TransactionType;
}

const props = withDefaults(defineProps<Props>(), {
  transaction: null,
  loading: false,
  initialType: "EXPENSE",
});

// Define emitted events
const emit = defineEmits<{
  submit: [transaction: CreateTransactionInput];
  cancel: [];
}>();

// Use composables
const { accounts: accountsData } = useAccounts();
const { categories: categoriesData } = useCategories();

// Computed properties for clean data access
const accounts = computed(() => accountsData.value?.accounts || []);
const categories = computed(() => categoriesData.value?.categories || []);

// Filter categories by transaction type
const filteredCategories = computed(() => {
  return categories.value.filter((category) => category.type === formData.value.type);
});

// Form data
const formData = ref<CreateTransactionInput>({
  accountId: "",
  categoryId: "",
  type: props.initialType,
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

// Form validation
const formValid = ref(false);
const formRef = ref();
const amountFieldRef = ref();

// Validation rules
const accountRules: CheckRule[] = [(value: string) => !!value || "Account is required"];

const typeRules: CheckRule<TransactionType>[] = [
  (value: TransactionType) => !!value || "Transaction type is required",
  (value: TransactionType) =>
    ["INCOME", "EXPENSE"].includes(value) || "Transaction type must be either Income or Expense",
];

const amountRules = currencyAmountRules;

const dateRules: CheckRule[] = [
  (value: string) => !!value || "Date is required",
  (value: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value) || "Date must be in YYYY-MM-DD format";
  },
];

// Force validation check when form data changes
const isFormValid = computed(() => {
  const accountValid = checkRules(formData.value.accountId, accountRules);
  const typeValid = checkRules(formData.value.type, typeRules);
  const amountValid = checkRules(formData.value.amount, amountRules);
  const dateValid = checkRules(formData.value.date, dateRules);

  return accountValid && typeValid && amountValid && dateValid;
});

// Get selected account for currency information
const selectedAccount = computed(() => {
  return accounts.value.find((account) => account.id === formData.value.accountId);
});

// Currency prefix for amount input
const currencyPrefix = computed(() => {
  if (selectedAccount.value) {
    return getCurrencySymbol(selectedAccount.value.currency);
  }
  // No prefix when no account is selected
  return "";
});

// Computed properties for form titles and button text
const isEditing = computed(() => !!props.transaction?.id);
const formTitle = computed(() => (isEditing.value ? "Edit Transaction" : "Create New Transaction"));
const submitButtonText = computed(() =>
  isEditing.value ? "Update Transaction" : "Create Transaction",
);

// Watch for account changes to clear category if types don't match
watch(
  () => formData.value.accountId,
  () => {
    // Clear category when account changes to avoid type mismatches
    if (formData.value.categoryId && filteredCategories.value.length > 0) {
      const selectedCategory = categories.value.find((c) => c.id === formData.value.categoryId);
      if (selectedCategory && selectedCategory.type !== formData.value.type) {
        formData.value.categoryId = "";
      }
    }
  },
);

// Watch for type changes to clear incompatible category
watch(
  () => formData.value.type,
  () => {
    if (formData.value.categoryId) {
      const selectedCategory = categories.value.find((c) => c.id === formData.value.categoryId);
      if (selectedCategory && selectedCategory.type !== formData.value.type) {
        formData.value.categoryId = "";
      }
    }
  },
);

// Initialize form with transaction data if editing
watch(
  () => props.transaction,
  (transaction) => {
    if (transaction) {
      formData.value = {
        accountId: transaction.accountId,
        categoryId: transaction.categoryId || "",
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        description: transaction.description || "",
      };
    } else {
      // Reset form for new transaction
      formData.value = {
        accountId: "",
        categoryId: "",
        type: props.initialType,
        amount: 0,
        date: getTodayDateString(),
        description: "",
      };
    }
  },
  { immediate: true },
);

// Event handlers
const handleSubmit = async () => {
  if (formRef.value) {
    const { valid } = await formRef.value.validate();
    if (valid && isFormValid.value) {
      // Clean up empty fields appropriately
      const submitData = { ...formData.value };
      if (submitData.categoryId === "") {
        submitData.categoryId = isEditing.value ? null : undefined;
      }
      if (submitData.description === "") {
        submitData.description = isEditing.value ? null : undefined;
      }

      emit("submit", submitData);
    }
  }
};

const handleCancel = () => {
  emit("cancel");
};

// Handle pattern selection
const handlePatternSelected = (pattern: { accountId: string; categoryId: string }) => {
  formData.value.accountId = pattern.accountId;
  formData.value.categoryId = pattern.categoryId;

  // Focus the amount field after pattern selection
  if (amountFieldRef.value) {
    amountFieldRef.value.focus();
  }
};
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
      <v-form
        ref="formRef"
        v-model="formValid"
        @submit.prevent="handleSubmit"
        @keydown.esc="$emit('cancel')"
      >
        <!-- Transaction Type Toggle -->
        <div class="mb-4">
          <div class="text-body-2 text-medium-emphasis mb-2">Type</div>
          <v-btn-toggle
            v-model="formData.type"
            variant="outlined"
            color="primary"
            mandatory
            :disabled="loading"
            class="w-100"
          >
            <v-btn value="EXPENSE" class="flex-1-1">
              <template #prepend>
                <v-icon color="error">mdi-cash-minus</v-icon>
              </template>
              Expense
            </v-btn>
            <v-btn value="INCOME" class="flex-1-1">
              <template #prepend>
                <v-icon color="success">mdi-cash-plus</v-icon>
              </template>
              Income
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Quick Action Buttons -->
        <QuickTransactionButtons
          :transaction-type="formData.type as TransactionPatternType"
          :loading="loading"
          @pattern-selected="handlePatternSelected"
        />

        <v-row>
          <v-col cols="12" md="6">
            <!-- Account Selection -->
            <AccountSelect
              v-model="formData.accountId"
              label="Account"
              :rules="accountRules"
              :disabled="loading"
              required
            />
          </v-col>

          <v-col cols="12" md="6">
            <!-- Category Selection (Optional) -->
            <v-select
              v-model="formData.categoryId"
              :items="filteredCategories"
              item-title="name"
              item-value="id"
              label="Category (Optional)"
              :disabled="loading || filteredCategories.length === 0"
              variant="outlined"
              clearable
            >
              <template #no-data>
                <v-list-item>
                  <v-list-item-title class="text-medium-emphasis">
                    No {{ formData.type.toLowerCase() }} categories available
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-select>
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
              placeholder="e.g., Weekly groceries, Salary payment, Coffee with friends"
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
