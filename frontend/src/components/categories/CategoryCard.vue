<script setup lang="ts">
import type { Category } from "@/composables/useCategories";
import ActionButtons from "@/components/common/ActionButtons.vue";

// Define component props
interface Props {
  category: Category;
  isExpanded: boolean;
}

const props = defineProps<Props>();

// Define emitted events
const emit = defineEmits<{
  editCategory: [categoryId: string];
  deleteCategory: [categoryId: string];
  toggleExpand: [categoryId: string];
}>();

// Event handlers
const handleEditCategory = () => {
  emit("editCategory", props.category.id);
};

const handleDeleteCategory = () => {
  emit("deleteCategory", props.category.id);
};

const handleCardClick = () => {
  emit("toggleExpand", props.category.id);
};
</script>

<template>
  <v-card
    variant="outlined"
    class="category-card"
    :class="{ expanded: isExpanded }"
    @click="handleCardClick"
    style="cursor: pointer"
  >
    <v-card-text class="py-3">
      <!-- Collapsed state: Always visible content -->
      <div class="d-flex align-center">
        <div class="flex-grow-1" style="min-width: 0">
          <h4 class="text-h6 mb-0 text-truncate">{{ category.name }}</h4>
        </div>
      </div>

      <!-- Expanded state: Conditional action buttons -->
      <div v-if="isExpanded" class="d-flex mt-3 justify-end">
        <ActionButtons @edit="handleEditCategory" @delete="handleDeleteCategory" />
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.category-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.category-card.expanded:hover {
  transform: none; /* Disable hover transform when expanded */
}
</style>
