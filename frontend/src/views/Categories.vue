<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useCategories, type Category, type CategoryType } from "@/composables/useCategories";
import { useSnackbar } from "@/composables/useSnackbar";
import CategoryForm from "@/components/categories/CategoryForm.vue";
import CategoryDeleteDialog from "@/components/categories/CategoryDeleteDialog.vue";
import CategoryCard from "@/components/categories/CategoryCard.vue";

// Define Category form data interface (for creating new categories)
interface CategoryFormData {
  id?: string;
  name: string;
  type: CategoryType;
  excludeFromReports: boolean;
}

// State for tabs
const activeTab = ref<CategoryType>("EXPENSE");

// Expansion state for collapsible category cards
const expandedCards = ref<Record<string, boolean>>({});

// Use categories composable for current tab
const {
  categories: categoriesData,
  categoriesLoading,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryLoading,
  updateCategoryLoading,
} = useCategories();

// State for dialogs and loading
const showAddCategoryDialog = ref(false);
const showEditCategoryDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryToDelete = ref<Category | null>(null);

// Use global snackbar
const { showSuccessSnackbar } = useSnackbar();

// Use categories data directly
const categories = computed<Category[]>(() => {
  if (!categoriesData.value?.categories) return [];
  return categoriesData.value.categories;
});

// Filter categories by current tab
const filteredCategories = computed<Category[]>(() => {
  return categories.value.filter((category) => category.type === activeTab.value);
});

// Loading state
const loading = computed(() => categoriesLoading.value);
const formLoading = computed(() => createCategoryLoading.value || updateCategoryLoading.value);

// Toggle expansion for a specific category
const toggleExpand = (categoryId: string) => {
  expandedCards.value[categoryId] = !expandedCards.value[categoryId];
};

// Check if category is expanded
const isExpanded = (categoryId: string): boolean => {
  return expandedCards.value[categoryId] ?? false;
};

// Functions for category operations
const openAddCategoryDialog = () => {
  showAddCategoryDialog.value = true;
};

const editCategory = (categoryId: string) => {
  const category = categories.value.find((c) => c.id === categoryId);
  if (category) {
    editingCategory.value = { ...category };
    showEditCategoryDialog.value = true;
  }
};

const deleteCategoryHandler = (categoryId: string) => {
  const category = categories.value.find((c) => c.id === categoryId);
  if (category) {
    categoryToDelete.value = category;
    showDeleteConfirmDialog.value = true;
  }
};

const confirmDeleteCategory = async () => {
  if (categoryToDelete.value) {
    const result = await deleteCategory(categoryToDelete.value.id);
    if (result) {
      showSuccessSnackbar(`Category "${categoryToDelete.value.name}" has been deleted`);
    }
    // Note: Error handling is managed globally via Apollo error link
  }
  showDeleteConfirmDialog.value = false;
  categoryToDelete.value = null;
};

const cancelDeleteCategory = () => {
  showDeleteConfirmDialog.value = false;
  categoryToDelete.value = null;
};

// Form handlers
const handleCategorySubmit = async (categoryData: CategoryFormData) => {
  let success = false;
  let successMessage = "";

  if (categoryData.id) {
    // Edit existing category
    const result = await updateCategory(categoryData.id, {
      name: categoryData.name,
      type: categoryData.type,
      excludeFromReports: categoryData.excludeFromReports,
    });
    success = !!result;
    successMessage = `Category "${categoryData.name}" has been updated`;
    if (success) showEditCategoryDialog.value = false;
  } else {
    // Create new category
    const result = await createCategory({
      name: categoryData.name,
      type: categoryData.type,
      excludeFromReports: categoryData.excludeFromReports,
    });
    success = !!result;
    successMessage = `Category "${categoryData.name}" has been created`;
    if (success) showAddCategoryDialog.value = false;
  }

  if (success) {
    editingCategory.value = null;
    showSuccessSnackbar(successMessage);
  }
  // Note: Error handling is now managed globally via Apollo error link
  // Local errors are logged but not displayed to avoid overriding global error messages
};

const handleCategoryCancel = () => {
  showAddCategoryDialog.value = false;
  showEditCategoryDialog.value = false;
  editingCategory.value = null;
};
</script>

<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6 flex-column flex-sm-row ga-3 ga-sm-0 justify-sm-space-between"
    >
      <h1 class="text-h5 text-sm-h4">Categories</h1>
      <!-- Desktop button: d-none (hidden <600px) + d-sm-flex (shows ≥600px) -->
      <v-btn
        class="d-none d-sm-flex"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddCategoryDialog"
      >
        Add Category
      </v-btn>
      <!-- Mobile button: d-flex (shows <600px) + d-sm-none (hidden ≥600px) -->
      <v-btn
        class="d-flex d-sm-none"
        color="primary"
        icon="mdi-plus"
        size="large"
        aria-label="Add Category"
        @click="openAddCategoryDialog"
      />
    </div>

    <!-- Category Type Tabs -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="EXPENSE">
        <v-icon start color="error">mdi-cash-minus</v-icon>
        Expense
      </v-tab>
      <v-tab value="INCOME">
        <v-icon start color="success">mdi-cash-plus</v-icon>
        Income
      </v-tab>
    </v-tabs>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" size="64" width="4"></v-progress-circular>
      <div class="text-h6 mt-4">Loading categories...</div>
    </div>

    <!-- Empty State -->
    <v-empty-state
      v-else-if="filteredCategories.length === 0"
      icon="mdi-tag-multiple-outline"
      :title="`No ${activeTab.toLowerCase()} categories yet`"
      :text="`Create your first ${activeTab.toLowerCase()} category to start organizing your transactions.`"
    />

    <!-- Categories Grid -->
    <v-row v-else dense>
      <v-col v-for="category in filteredCategories" :key="category.id" cols="12" md="6" xl="4">
        <CategoryCard
          :category="category"
          :is-expanded="isExpanded(category.id)"
          @edit-category="editCategory"
          @delete-category="deleteCategoryHandler"
          @toggle-expand="toggleExpand"
        />
      </v-col>
    </v-row>

    <!-- Add Category Dialog -->
    <v-dialog
      v-model="showAddCategoryDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '500'"
      :fullscreen="$vuetify.display.xs"
      persistent
    >
      <CategoryForm
        :initial-type="activeTab"
        :loading="formLoading"
        @submit="handleCategorySubmit"
        @cancel="handleCategoryCancel"
      />
    </v-dialog>

    <!-- Edit Category Dialog -->
    <v-dialog
      v-model="showEditCategoryDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '500'"
      :fullscreen="$vuetify.display.xs"
      persistent
    >
      <CategoryForm
        :category="editingCategory"
        :loading="formLoading"
        @submit="handleCategorySubmit"
        @cancel="handleCategoryCancel"
      />
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <CategoryDeleteDialog
      v-model="showDeleteConfirmDialog"
      :category="categoryToDelete"
      @confirm="confirmDeleteCategory"
      @cancel="cancelDeleteCategory"
    />
  </v-container>
</template>
