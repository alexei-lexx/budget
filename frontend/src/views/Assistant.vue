<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <v-empty-state
      v-if="!assistantAnswer && !askAssistantLoading"
      class="mt-6"
      icon="mdi-creation-outline"
      :title="t('assistant.emptyTitle')"
      :text="t('assistant.emptyText')"
    />

    <div
      v-else-if="askAssistantLoading"
      class="d-flex justify-center align-center fill-height mt-6"
    >
      <v-progress-circular indeterminate size="40" width="3" />
    </div>

    <div v-else-if="assistantAnswer" class="answer-content mx-auto mt-6">
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
        :placeholder="t('assistant.placeholder')"
        :input-aria-label="t('assistant.inputAriaLabel')"
        :submit-aria-label="t('assistant.submitAriaLabel')"
        @submit="handleAskQuestion"
        @abort="abortAskAssistant"
      />
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAssistant } from "@/composables/useAssistant";
import { useSnackbar } from "@/composables/useSnackbar";
import { appStorage } from "@/lib/appStorage";
import AgenticInput from "@/components/AgenticInput.vue";

const STORAGE_KEY = "assistant-input";

const { t } = useI18n();
const { showErrorSnackbar } = useSnackbar();
const {
  askAssistantLoading,
  askAssistantError,
  assistantAnswer,
  assistantAgentTrace,
  askAssistant,
  abortAskAssistant,
} = useAssistant();

interface StoredInput {
  question: string;
}

const loadStoredInput = (): Partial<StoredInput> => {
  try {
    const stored = appStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveInput = () => {
  const data: StoredInput = {
    question: question.value,
  };
  appStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
