<script setup lang="ts">
import type { Category } from "@/composables/useCategories";
import ActionDropdown from "@/components/common/ActionDropdown.vue";

// Define component props
interface Props {
  category: Category;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editCategory: [categoryId: string];
  deleteCategory: [categoryId: string];
}>();

// Event handlers
const handleEditCategory = () => {
  emit("editCategory", props.category.id);
};

const handleDeleteCategory = () => {
  emit("deleteCategory", props.category.id);
};
</script>

<template>
  <v-card variant="outlined" class="category-card">
    <v-card-text class="py-3">
      <div class="d-flex align-center">
        <div class="flex-grow-1" style="min-width: 0">
          <h4 class="text-h6 mb-0 text-truncate">{{ category.name }}</h4>
        </div>
        <div class="flex-shrink-0 ml-2">
          <ActionDropdown @edit="handleEditCategory" @delete="handleDeleteCategory" />
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
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
