<script setup lang="ts">
// Define component props with sensible defaults
interface Props {
  editLabel?: string;
  deleteLabel?: string;
  editIcon?: string;
  deleteIcon?: string;
  size?: "x-small" | "small" | "default" | "large" | "x-large";
}

withDefaults(defineProps<Props>(), {
  editLabel: "Edit",
  deleteLabel: "Delete",
  editIcon: "mdi-pencil",
  deleteIcon: "mdi-delete",
  size: "small",
});

// Define emitted events
const emit = defineEmits<{
  edit: [];
  delete: [];
}>();

// Event handlers with click.stop to prevent event propagation
const handleEdit = () => {
  emit("edit");
};

const handleDelete = () => {
  emit("delete");
};
</script>

<template>
  <div class="action-buttons d-flex ga-2">
    <v-btn
      :size="size"
      color="primary"
      variant="text"
      :prepend-icon="editIcon"
      @click.stop="handleEdit"
    >
      {{ editLabel }}
    </v-btn>
    <v-btn
      :size="size"
      color="error"
      variant="text"
      :prepend-icon="deleteIcon"
      @click.stop="handleDelete"
    >
      {{ deleteLabel }}
    </v-btn>
  </div>
</template>

<style scoped>
.action-buttons {
  flex-shrink: 0;
}
</style>
