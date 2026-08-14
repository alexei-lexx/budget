<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { checkRules, type CheckRule } from "@/utils/validation";
import type { CategoryType } from "@/composables/useCategories";
import { getCategoryIcon, getCategoryIconColor } from "@/utils/category";

// Define Category interface for editing
interface Category {
  id?: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;
}

// Define component props
interface Props {
  category?: Category | null;
  loading?: boolean;
  initialType?: CategoryType;
}

const props = withDefaults(defineProps<Props>(), {
  category: null,
  loading: false,
  initialType: "INCOME",
});

// Define emitted events
const emit = defineEmits<{
  submit: [category: Category];
  cancel: [];
}>();

const { t } = useI18n();

// Form data
const formData = ref<Category>({
  name: "",
  type: props.initialType,
  excludeFromReports: false,
});

// Form validation
const formValid = ref(false);
const formRef = ref();

// Force validation check when form data changes
const isFormValid = computed(() => {
  const nameValid = checkRules(formData.value.name, nameRules);
  const typeValid = checkRules(formData.value.type, typeRules);

  return nameValid && typeValid;
});

// Validation rules
const nameRules: CheckRule<string>[] = [
  (v) => !!v || t("categories.form.nameRequired"),
  (v) => (v && v.trim().length > 0) || t("categories.form.nameNotEmpty"),
  (v) => (v && v.length <= 100) || t("categories.form.nameTooLong"),
];

const typeRules: CheckRule<CategoryType>[] = [
  (v) => !!v || t("categories.form.typeRequired"),
  (v) => ["INCOME", "EXPENSE"].includes(v) || t("categories.form.typeInvalid"),
];

// Category type options
const categoryTypeOptions = computed(() => [
  {
    title: t("categories.types.income"),
    value: "INCOME" as CategoryType,
    icon: getCategoryIcon("INCOME"),
    color: getCategoryIconColor("INCOME"),
  },
  {
    title: t("categories.types.expense"),
    value: "EXPENSE" as CategoryType,
    icon: getCategoryIcon("EXPENSE"),
    color: getCategoryIconColor("EXPENSE"),
  },
]);

// Computed properties
const isEditing = computed(() => !!props.category?.id);
const formTitle = computed(() =>
  isEditing.value ? t("categories.form.editTitle") : t("categories.form.createTitle"),
);
const submitButtonText = computed(() =>
  isEditing.value ? t("categories.form.update") : t("categories.form.create"),
);

// Watch for category prop changes (for editing)
watch(
  () => props.category,
  (newCategory) => {
    if (newCategory) {
      formData.value = {
        id: newCategory.id,
        name: newCategory.name,
        type: newCategory.type,
        excludeFromReports: newCategory.excludeFromReports ?? false,
      };
    } else {
      // Reset form for new category
      formData.value = {
        name: "",
        type: props.initialType,
        excludeFromReports: false,
      };
    }
  },
  { immediate: true },
);

// Form methods
const handleSubmit = async () => {
  const { valid } = await formRef.value.validate();
  if (valid) {
    // Create clean category object
    const categoryData: Category = {
      name: formData.value.name.trim(),
      type: formData.value.type,
      excludeFromReports: formData.value.excludeFromReports,
    };

    // Include ID if editing
    if (isEditing.value && formData.value.id) {
      categoryData.id = formData.value.id;
    }

    emit("submit", categoryData);
  }
};

const handleCancel = () => {
  emit("cancel");
};

// Example category names for different types
const exampleNames = computed(() => {
  return formData.value.type === "INCOME"
    ? t("categories.form.exampleNamesIncome")
    : t("categories.form.exampleNamesExpense");
});
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
        <v-row>
          <v-col cols="12" md="12">
            <!-- Category Name -->
            <v-text-field
              v-model="formData.name"
              :label="t('categories.form.nameLabel')"
              :placeholder="t('categories.form.namePlaceholder', { examples: exampleNames })"
              :rules="nameRules"
              :disabled="loading"
              variant="outlined"
              required
              autofocus
              autocapitalize="off"
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="12">
            <!-- Category Type Selection -->
            <v-select
              v-model="formData.type"
              :label="t('categories.form.typeLabel')"
              :items="categoryTypeOptions"
              :rules="typeRules"
              :disabled="loading"
              variant="outlined"
              required
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                  </template>
                </v-list-item>
              </template>
              <template #selection="{ item }">
                <div class="d-flex align-center">
                  <v-icon :color="item.raw.color" class="me-2">{{ item.raw.icon }}</v-icon>
                  {{ item.raw.title }}
                </div>
              </template>
            </v-select>
          </v-col>

          <v-col cols="12" md="12">
            <!-- Exclude from Reports Toggle -->
            <v-switch
              v-model="formData.excludeFromReports"
              :label="t('categories.form.excludeFromReportsLabel')"
              :disabled="loading"
              color="primary"
              hide-details="auto"
            ></v-switch>
            <div class="text-caption text-medium-emphasis mt-1 ml-1">
              {{ t("categories.form.excludeFromReportsHint") }}
            </div>
          </v-col>
        </v-row>
      </v-form>
    </v-card-text>

    <v-card-actions class="px-6 pb-6" :class="{ 'flex-column ga-2': $vuetify.display.xs }">
      <v-btn variant="text" @click="handleCancel" :disabled="loading" :block="$vuetify.display.xs">
        {{ t("common.cancel") }}
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
