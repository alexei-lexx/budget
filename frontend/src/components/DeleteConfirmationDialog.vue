<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="$vuetify.display.xs ? '95vw' : '500'"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h5 d-flex align-center">
        <v-icon color="error" class="me-2">mdi-alert</v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text>
        <p class="text-body-1 mb-3">
          {{ message }}
        </p>
        <p class="text-body-2 text-medium-emphasis">
          {{ warning }}
        </p>
      </v-card-text>

      <v-card-actions :class="{ 'flex-column ga-2': $vuetify.display.xs }">
        <v-spacer v-if="$vuetify.display.smAndUp"></v-spacer>
        <v-btn variant="text" @click="$emit('cancel')" :block="$vuetify.display.xs"> Cancel </v-btn>
        <v-btn color="error" variant="flat" @click="$emit('confirm')" :block="$vuetify.display.xs">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
interface Props {
  /** Controls whether the dialog is visible (v-model) */
  modelValue: boolean;
  /** The title text shown in the dialog header (e.g., "Delete Account") */
  title: string;
  /** The main confirmation message asking the user to confirm the action */
  message: string;
  /** Optional warning text shown below the message (defaults to "This action cannot be undone.") */
  warning?: string;
}

interface Emits {
  /** Emitted when the dialog visibility changes (for v-model binding) */
  (e: "update:modelValue", value: boolean): void;
  /** Emitted when the user clicks the Delete button to confirm the action */
  (e: "confirm"): void;
  /** Emitted when the user clicks the Cancel button to abort the action */
  (e: "cancel"): void;
}

withDefaults(defineProps<Props>(), {
  warning: "This action cannot be undone.",
});

defineEmits<Emits>();
</script>
