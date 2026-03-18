<template>
  <div class="d-flex ga-2">
    <v-textarea
      ref="textareaRef"
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
      @update:model-value="emit('update:modelValue', $event)"
      @keydown.enter.exact.prevent="emit('submit')"
    >
      <template v-if="isVoiceSupported" #append-inner>
        <v-icon
          :color="isRecording ? 'error' : undefined"
          :class="{ 'mic-recording': isRecording }"
          :disabled="loading"
          role="button"
          aria-label="Voice input"
          @click="onMicClick"
        >
          {{ isRecording ? "mdi-microphone" : "mdi-microphone-outline" }}
        </v-icon>
      </template>
    </v-textarea>
    <v-btn
      icon="mdi-send"
      color="primary"
      :loading="loading"
      :disabled="loading || !modelValue.trim()"
      :aria-label="submitAriaLabel"
      style="align-self: flex-end"
      @click="emit('submit')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  modelValue: string;
  loading?: boolean;
  placeholder?: string;
  inputAriaLabel?: string;
  submitAriaLabel?: string;
  isVoiceSupported?: boolean;
  isRecording?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
  startRecording: [];
  stopRecording: [];
}>();

const textareaRef = ref<{ focus: () => void } | null>(null);

function onMicClick() {
  if (props.isRecording) {
    emit("stopRecording");
  } else {
    emit("startRecording");
  }
}

defineExpose({
  focus: () => textareaRef.value?.focus(),
});
</script>

<style scoped>
@keyframes mic-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.mic-recording {
  animation: mic-pulse 1s ease-in-out infinite;
}
</style>
