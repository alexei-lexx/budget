<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { getCurrencySymbol } from "@/utils/currency";
import { checkRules, type CheckRule } from "@/utils/validation";
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

const { t } = useI18n();

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

// Force validation check when form data changes
const isFormValid = computed(() => {
  const nameValid = checkRules(formData.value.name, nameRules);
  const currencyValid = checkRules(formData.value.currency, currencyRules);
  const balanceValid = checkRules(formData.value.initialBalance, balanceRules);

  return nameValid && currencyValid && balanceValid;
});

// Validation rules
const nameRules: CheckRule<string>[] = [
  (v) => !!v || t("accounts.form.errors.nameRequired"),
  (v) => (v && v.trim().length > 0) || t("accounts.form.errors.nameNotEmpty"),
  (v) => (v && v.length <= 100) || t("accounts.form.errors.nameTooLong"),
];

const currencyRules: CheckRule<string>[] = [
  (v) => !!v || t("accounts.form.errors.currencyRequired"),
  (v) =>
    supportedCurrencies.value.some((c: { value: string; title: string }) => c.value === v) ||
    t("accounts.form.errors.currencyInvalid"),
];

const balanceRules: CheckRule<number>[] = [
  (v) => (v !== null && v !== undefined) || t("accounts.form.errors.balanceRequired"),
  (v) => !isNaN(v) || t("accounts.form.errors.balanceInvalidNumber"),
  (v) => isFinite(v) || t("accounts.form.errors.balanceInvalidFinite"),
];

// Computed properties
const isEditing = computed(() => !!props.account?.id);
const formTitle = computed(() =>
  isEditing.value ? t("accounts.form.editTitle") : t("accounts.form.createTitle"),
);
const submitButtonText = computed(() =>
  isEditing.value ? t("accounts.form.update") : t("accounts.form.create"),
);

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
            {{ t("common.buttons.retry") }}
          </v-btn>
        </div>
      </v-alert>

      <v-form
        ref="formRef"
        v-model="formValid"
        @submit.prevent="handleSubmit"
        @keydown.esc="$emit('cancel')"
      >
        <v-row>
          <v-col cols="12" md="12">
            <!-- Account Name -->
            <v-text-field
              v-model="formData.name"
              :label="t('accounts.form.nameLabel')"
              :placeholder="t('accounts.form.namePlaceholder')"
              :rules="nameRules"
              :disabled="loading"
              variant="outlined"
              required
              autofocus
              autocapitalize="off"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="6">
            <!-- Currency Selection -->
            <v-autocomplete
              v-model="formData.currency"
              :label="t('accounts.form.currencyLabel')"
              :items="supportedCurrencies"
              :rules="currencyRules"
              :disabled="loading || currenciesLoading"
              :loading="currenciesLoading"
              variant="outlined"
              required
            >
              <template #no-data>
                <v-list-item v-if="currencyHasError">
                  <v-list-item-title class="text-error">
                    {{ t("accounts.form.errors.currencyLoadError") }}
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-autocomplete>
          </v-col>

          <v-col cols="12" md="6">
            <!-- Initial Balance -->
            <v-text-field
              v-model.number="formData.initialBalance"
              :label="t('accounts.form.initialBalanceLabel')"
              type="number"
              step="1"
              :rules="balanceRules"
              :disabled="loading"
              variant="outlined"
              required
            >
              <template #prepend-inner>
                <span class="text-medium-emphasis">
                  {{ getCurrencySymbol(formData.currency) }}
                </span>
              </template>
            </v-text-field>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-6 pb-6" :class="{ 'flex-column ga-2': $vuetify.display.xs }">
      <v-btn variant="text" @click="handleCancel" :disabled="loading" :block="$vuetify.display.xs">
        {{ t("common.buttons.cancel") }}
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
