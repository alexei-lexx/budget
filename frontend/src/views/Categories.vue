<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useCategories, type Category, type CategoryType } from "@/composables/useCategories";
import { useSnackbar } from "@/composables/useSnackbar";
import CategoryForm from "@/components/CategoryForm.vue";

// Define Category form data interface (for creating new categories)
interface CategoryFormData {
  id?: string;
  name: string;
  type: CategoryType;
}

// State for tabs
const activeTab = ref<CategoryType>("INCOME");

// Use categories composable for current tab
const {
  categories: categoriesData,
  categoriesLoading,
  createCategory,
  updateCategory,
  archiveCategory: archiveCategoryMutation,
  createCategoryLoading,
  updateCategoryLoading,
  categoriesError,
} = useCategories();

// State for dialogs and loading
const showAddCategoryDialog = ref(false);
const showEditCategoryDialog = ref(false);
const showDeleteConfirmDialog = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryToDelete = ref<Category | null>(null);

// Use global snackbar
const { showErrorSnackbar, showSuccessSnackbar } = useSnackbar();

// Use categories data directly
const categories = computed<Category[]>(() => {
  if (!categoriesData.value?.activeCategories) return [];
  return categoriesData.value.activeCategories;
});

// Filter categories by current tab
const filteredCategories = computed<Category[]>(() => {
  return categories.value.filter((category) => category.type === activeTab.value);
});

// Loading state
const loading = computed(() => categoriesLoading.value);
const formLoading = computed(() => createCategoryLoading.value || updateCategoryLoading.value);

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

const archiveCategory = (categoryId: string) => {
  const category = categories.value.find((c) => c.id === categoryId);
  if (category) {
    categoryToDelete.value = category;
    showDeleteConfirmDialog.value = true;
  }
};

const confirmDeleteCategory = async () => {
  if (categoryToDelete.value) {
    const result = await archiveCategoryMutation(categoryToDelete.value.id);
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
    });
    success = !!result;
    successMessage = `Category "${categoryData.name}" has been updated`;
    if (success) showEditCategoryDialog.value = false;
  } else {
    // Create new category
    const result = await createCategory({
      name: categoryData.name,
      type: categoryData.type,
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
  <v-container :class="{ 'pa-3': $vuetify.display.xs, 'pa-6': $vuetify.display.smAndUp }">
    <!-- Page Header -->
    <div
      class="d-flex align-center mb-6"
      :class="{
        'flex-column ga-3': $vuetify.display.xs,
        'justify-space-between': $vuetify.display.smAndUp,
      }"
    >
      <h1 :class="$vuetify.display.xs ? 'text-h5' : 'text-h4'">Categories</h1>
      <v-btn
        v-if="$vuetify.display.smAndUp"
        color="primary"
        prepend-icon="mdi-plus"
        @click="openAddCategoryDialog"
      >
        Add New Category
      </v-btn>
      <v-btn v-else color="primary" icon="mdi-plus" size="large" @click="openAddCategoryDialog">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
    </div>

    <!-- Category Type Tabs -->
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="INCOME">
        <v-icon start color="success">mdi-cash-plus</v-icon>
        Income
      </v-tab>
      <v-tab value="EXPENSE">
        <v-icon start color="error">mdi-cash-minus</v-icon>
        Expense
      </v-tab>
    </v-tabs>

    <!-- Categories List -->
    <v-card>
      <v-card-text>
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate size="64" />
          <p class="text-medium-emphasis mt-4">Loading categories...</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredCategories.length === 0" class="text-center py-8">
          <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-tag-multiple-outline</v-icon>
          <h3 class="text-h6 mb-2">No {{ activeTab.toLowerCase() }} categories yet</h3>
          <p class="text-medium-emphasis mb-4">
            Create your first {{ activeTab.toLowerCase() }} category to start organizing your
            transactions.
          </p>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddCategoryDialog">
            Add Your First {{ activeTab === "INCOME" ? "Income" : "Expense" }} Category
          </v-btn>
        </div>

        <!-- Categories Grid -->
        <div v-else class="categories-grid">
          <v-card
            v-for="category in filteredCategories"
            :key="category.id"
            variant="outlined"
            class="category-card"
          >
            <v-card-text class="pb-2">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon :color="category.type === 'INCOME' ? 'success' : 'error'" class="me-2">
                    {{ category.type === "INCOME" ? "mdi-cash-plus" : "mdi-cash-minus" }}
                  </v-icon>
                  <div>
                    <h4 class="text-h6">{{ category.name }}</h4>
                  </div>
                </div>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
                  </template>
                  <v-list density="compact">
                    <v-list-item
                      prepend-icon="mdi-pencil"
                      title="Edit"
                      @click="editCategory(category.id)"
                    />
                    <v-list-item
                      prepend-icon="mdi-delete"
                      title="Delete"
                      @click="archiveCategory(category.id)"
                    />
                  </v-list>
                </v-menu>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

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
    <v-dialog
      v-model="showDeleteConfirmDialog"
      :max-width="$vuetify.display.xs ? '95vw' : '500'"
      persistent
    >
      <v-card>
        <v-card-title class="text-h5 d-flex align-center">
          <v-icon color="error" class="me-2">mdi-alert</v-icon>
          Delete Category
        </v-card-title>

        <v-card-text>
          <p class="text-body-1 mb-3">
            Are you sure you want to delete the category
            <strong>"{{ categoryToDelete?.name }}"</strong>?
          </p>
          <p class="text-body-2 text-medium-emphasis">
            This action cannot be undone. The category will be permanently removed from your
            records, but historical transaction data will be preserved.
          </p>
        </v-card-text>

        <v-card-actions :class="{ 'flex-column ga-2': $vuetify.display.xs }">
          <v-spacer v-if="$vuetify.display.smAndUp"></v-spacer>
          <v-btn variant="text" @click="cancelDeleteCategory" :block="$vuetify.display.xs">
            Cancel
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="confirmDeleteCategory"
            :block="$vuetify.display.xs"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

@media (max-width: 600px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
}

.category-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
