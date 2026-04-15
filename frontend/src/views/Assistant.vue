<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-h5 text-sm-h4">Assistant</h1>
    </div>

    <v-empty-state
      v-if="!assistantAnswer && !askAssistantLoading"
      icon="mdi-creation-outline"
      title="Ask about your finances"
      text="Ask a question to get started."
    />

    <div v-else-if="askAssistantLoading" class="d-flex justify-center align-center fill-height">
      <v-progress-circular indeterminate size="40" width="3" />
    </div>

    <div v-else-if="assistantAnswer" class="answer-content mx-auto">
      <div class="text-body-1" style="white-space: pre-wrap">
        {{ assistantAnswer }}
      </div>
    </div>
  </v-container>

  <v-footer app elevation="4" class="pa-3 pa-sm-4">
    <div class="w-100">
      <AgenticInput
        v-model="question"
        :loading="askAssistantLoading"
        :agent-trace="assistantAgentTrace"
        placeholder="Ask about your spending..."
        input-aria-label="Ask a question"
        submit-aria-label="Submit question"
        @submit="handleAskQuestion"
      />
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useAssistant } from "@/composables/useAssistant";
import { useSnackbar } from "@/composables/useSnackbar";
import AgenticInput from "@/components/AgenticInput.vue";

const STORAGE_KEY = "assistant-input";

const { showErrorSnackbar } = useSnackbar();
const {
  askAssistantLoading,
  askAssistantError,
  assistantAnswer,
  assistantAgentTrace,
  askAssistant,
} = useAssistant();

interface StoredInput {
  question: string;
}

const loadStoredInput = (): Partial<StoredInput> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveInput = () => {
  const data: StoredInput = {
    question: question.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const storedInput = loadStoredInput();
const question = ref<string>(storedInput.question ?? "");

const handleAskQuestion = async (isVoiceInput: boolean) => {
  const trimmedQuestion = question.value.trim();
  if (!trimmedQuestion) {
    return;
  }

  await askAssistant(trimmedQuestion, isVoiceInput);

  if (askAssistantError.value) {
    showErrorSnackbar(askAssistantError.value);
  }
};

watch(question, () => {
  saveInput();
});
</script>
