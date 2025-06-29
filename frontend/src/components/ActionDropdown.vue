<template>
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" />
    </template>
    <v-list density="compact">
      <v-list-item v-if="showEdit" prepend-icon="mdi-pencil" title="Edit" @click="$emit('edit')" />
      <v-list-item
        v-if="showDelete"
        prepend-icon="mdi-delete"
        title="Delete"
        @click="$emit('delete')"
      />
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
interface Props {
  showEdit?: boolean;
  showDelete?: boolean;
}

withDefaults(defineProps<Props>(), {
  showEdit: true,
  showDelete: true,
});

defineEmits<{
  edit: [];
  delete: [];
}>();
</script>
