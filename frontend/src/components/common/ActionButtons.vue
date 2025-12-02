<script setup lang="ts">
// Define component props with sensible defaults
interface Props {
  editLabel?: string;
  deleteLabel?: string;
  duplicateLabel?: string;
  editIcon?: string;
  deleteIcon?: string;
  duplicateIcon?: string;
  size?: "x-small" | "small" | "default" | "large" | "x-large";
  showDuplicate?: boolean;
}

withDefaults(defineProps<Props>(), {
  editLabel: "Edit",
  deleteLabel: "Delete",
  duplicateLabel: "Copy",
  editIcon: "mdi-pencil",
  deleteIcon: "mdi-delete",
  duplicateIcon: "mdi-content-copy",
  size: "small",
  showDuplicate: false,
});

// Define emitted events
const emit = defineEmits<{
  edit: [];
  delete: [];
  duplicate: [];
}>();

// Event handlers with click.stop to prevent event propagation
const handleEdit = () => {
  emit("edit");
};

const handleDelete = () => {
  emit("delete");
};

const handleDuplicate = () => {
  emit("duplicate");
};
</script>

<template>
  <div class="action-buttons d-flex ga-2">
    <v-btn
      v-if="showDuplicate"
      :size="size"
      color="secondary"
      variant="text"
      :prepend-icon="duplicateIcon"
      @click.stop="handleDuplicate"
    >
      {{ duplicateLabel }}
    </v-btn>
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
