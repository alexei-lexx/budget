<template>
  <div class="d-flex ga-2">
    <v-textarea
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="loading"
      :aria-label="inputAriaLabel"
      clear-icon="mdi-close-circle"
      clearable
      auto-grow
      rows="1"
      max-rows="4"
      variant="outlined"
      density="compact"
      hide-details
      class="flex-grow-1"
      @update:model-value="$emit('update:modelValue', $event)"
      @keydown.enter.exact.prevent="$emit('submit')"
    ></v-textarea>
    <v-btn
      icon="mdi-send"
      color="primary"
      :loading="loading"
      :disabled="loading || !modelValue.trim()"
      :aria-label="submitAriaLabel"
      style="align-self: flex-end"
      @click="$emit('submit')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  loading?: boolean;
  placeholder?: string;
  inputAriaLabel?: string;
  submitAriaLabel?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();
</script>
