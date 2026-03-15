<template>
  <div class="d-flex align-center ga-2">
    <TextboxButtonInput
      ref="inputRef"
      :model-value="modelValue"
      :loading="loading"
      :placeholder="placeholder"
      :input-aria-label="inputAriaLabel"
      :submit-aria-label="submitAriaLabel"
      class="flex-grow-1"
      @update:model-value="$emit('update:modelValue', $event)"
      @submit="$emit('submit')"
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

defineProps<{
  modelValue: string;
  loading?: boolean;
  agentTrace: AgentTraceMessage[];
  placeholder?: string;
  inputAriaLabel?: string;
  submitAriaLabel?: string;
}>();

defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();

const showAgentTrace = ref(false);
const inputRef = ref<{ focus: () => void } | null>(null);

defineExpose({
  focus: () => inputRef.value?.focus(),
});
</script>
