<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { checkRules, type CheckRule } from "@/utils/validation";
import type { CategoryType } from "@/composables/useCategories";

// Define Category interface for editing
interface Category {
  id?: string;
  name: string;
  type: CategoryType;
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

// Form data
const formData = ref<Category>({
  name: "",
  type: props.initialType,
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
  (v) => !!v || "Category name is required",
  (v) => (v && v.trim().length > 0) || "Category name cannot be empty",
  (v) => (v && v.length <= 100) || "Category name cannot exceed 100 characters",
];

const typeRules: CheckRule<CategoryType>[] = [
  (v) => !!v || "Category type is required",
  (v) => ["INCOME", "EXPENSE"].includes(v) || "Category type must be either Income or Expense",
];

// Category type options
const categoryTypeOptions = [
  {
    title: "Income",
    value: "INCOME" as CategoryType,
    icon: "mdi-cash-plus",
    color: "success",
  },
  {
    title: "Expense",
    value: "EXPENSE" as CategoryType,
    icon: "mdi-cash-minus",
    color: "error",
  },
];

// Computed properties
const isEditing = computed(() => !!props.category?.id);
const formTitle = computed(() => (isEditing.value ? "Edit Category" : "Create New Category"));
const submitButtonText = computed(() => (isEditing.value ? "Update Category" : "Create Category"));

// Watch for category prop changes (for editing)
watch(
  () => props.category,
  (newCategory) => {
    if (newCategory) {
      formData.value = {
        id: newCategory.id,
        name: newCategory.name,
        type: newCategory.type,
      };
    } else {
      // Reset form for new category
      formData.value = {
        name: "",
        type: props.initialType,
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
  if (formData.value.type === "INCOME") {
    return ["Salary", "Freelance", "Investment", "Bonus"];
  } else {
    return ["Groceries", "Rent", "Utilities", "Entertainment"];
  }
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
              label="Category Name"
              :placeholder="`e.g., ${exampleNames.join(', ')}`"
              :rules="nameRules"
              :disabled="loading"
              variant="outlined"
              required
              autofocus
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="12">
            <!-- Category Type Selection -->
            <v-select
              v-model="formData.type"
              label="Category Type"
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
