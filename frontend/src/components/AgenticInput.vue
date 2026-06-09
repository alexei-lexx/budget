<template>
  <div class="d-flex align-center ga-2">
    <TextboxButtonInput
      ref="inputRef"
      :model-value="modelValue"
      :loading="loading"
      :placeholder="placeholder"
      :input-aria-label="inputAriaLabel"
      :submit-aria-label="submitAriaLabel"
      :is-voice-supported="isVoiceSupported"
      :is-recording="isRecording"
      class="flex-grow-1"
      @update:model-value="onModelValueUpdate"
      @submit="onSubmit"
      @abort="$emit('abort')"
      @start-recording="startRecording"
      @stop-recording="stopRecording"
    />
    <AgentTraceTriggerButton
      :agent-trace="agentTrace"
      :loading="loading ?? false"
      @click="showAgentTrace = true"
    />
  </div>
  <AgentTracePanel v-model="showAgentTrace" :agent-trace="agentTrace" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";
import AgentTracePanel from "@/components/AgentTracePanel.vue";
import AgentTraceTriggerButton from "@/components/AgentTraceTriggerButton.vue";
import TextboxButtonInput from "@/components/common/TextboxButtonInput.vue";
import { useSnackbar } from "@/composables/useSnackbar";
import { useUserSettings } from "@/composables/useUserSettings";
import { useVoiceInput } from "@/composables/useVoiceInput";

defineProps<{
  modelValue: string;
  loading?: boolean;
  agentTrace: AgentTraceMessage[];
  placeholder?: string;
  inputAriaLabel?: string;
  submitAriaLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [isVoiceInput: boolean];
  abort: [];
}>();

const { showErrorSnackbar } = useSnackbar();
const { settings } = useUserSettings();

const isVoiceSet = ref(false);

const {
  isSupported: isVoiceSupported,
  isRecording,
  startRecording,
  stopRecording,
} = useVoiceInput({
  onTranscript: (transcript: string) => {
    isVoiceSet.value = true;
    emit("update:modelValue", transcript);
    emit("submit", isVoiceSet.value);
  },
  onError: showErrorSnackbar,
  language: () => settings.value?.voiceInputLanguage ?? undefined,
});

function onModelValueUpdate(value: string) {
  isVoiceSet.value = false;
  emit("update:modelValue", value);
}

function onSubmit() {
  emit("submit", isVoiceSet.value);
  isVoiceSet.value = false;
}

const showAgentTrace = ref(false);
const inputRef = ref<{ focus: () => void } | null>(null);

defineExpose({
  focus: () => inputRef.value?.focus(),
});
</script>
