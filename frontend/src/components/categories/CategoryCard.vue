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
  archiveCategory: [categoryId: string];
}>();

// Event handlers
const handleEditCategory = () => {
  emit("editCategory", props.category.id);
};

const handleArchiveCategory = () => {
  emit("archiveCategory", props.category.id);
};
</script>

<template>
  <v-card variant="outlined" class="category-card">
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
        <ActionDropdown @edit="handleEditCategory" @delete="handleArchiveCategory" />
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
