<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="insights-container pa-0" fluid>
    <div class="d-flex flex-column fill-height">
      <!-- Messages area -->
      <div ref="messagesContainer" class="messages-area flex-grow-1 overflow-y-auto pa-4">
        <div
          v-if="!hasConversation"
          class="d-flex flex-column align-center justify-center fill-height"
        >
          <v-icon icon="mdi-lightbulb-on-outline" size="64" color="grey-lighten-1" class="mb-4" />
          <div class="text-h6 text-grey-darken-1">Ask about your finances</div>
          <div class="text-body-2 text-grey">
            Select a time period and ask a question to get started.
          </div>
        </div>

        <div v-else class="messages-list mx-auto">
          <div
            v-for="(message, index) in conversation.messages"
            :key="index"
            class="mb-4 d-flex"
            :class="message.role === 'USER' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="message-bubble pa-3 rounded-lg"
              :class="
                message.role === 'USER'
                  ? 'bg-primary text-on-primary user-bubble'
                  : 'bg-surface-variant assistant-bubble'
              "
            >
              <div class="text-body-1" style="white-space: pre-wrap">{{ message.content }}</div>
            </div>
          </div>

          <div v-if="insightsLoading" class="mb-4 d-flex justify-start">
            <div class="message-bubble pa-3 rounded-lg bg-surface-variant assistant-bubble">
              <v-progress-circular indeterminate size="20" width="2" />
            </div>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="input-area pa-4 bg-surface">
        <div class="input-content mx-auto">
          <!-- Period selector -->
          <div class="d-flex align-center ga-1 mb-3 flex-wrap">
            <v-chip
              v-for="preset in presetOptions"
              :key="preset.value"
              :color="selectedPreset === preset.value ? 'primary' : undefined"
              :variant="selectedPreset === preset.value ? 'flat' : 'tonal'"
              size="small"
              label
              @click="selectedPreset = preset.value"
            >
              {{ preset.label }}
            </v-chip>

            <v-spacer />

            <v-chip
              v-if="hasConversation"
              size="small"
              variant="text"
              prepend-icon="mdi-delete-outline"
              :disabled="insightsLoading"
              @click="handleClearConversation"
            >
              Clear
            </v-chip>
          </div>

          <v-row v-if="isCustomPreset" class="mb-3" dense>
            <v-col cols="6">
              <v-text-field
                v-model="startDate"
                type="date"
                label="Start"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="endDate"
                type="date"
                label="End"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <!-- Message input -->
          <div class="d-flex ga-2 align-end">
            <v-textarea
              v-model="question"
              placeholder="Ask about your spending..."
              variant="outlined"
              density="compact"
              auto-grow
              rows="1"
              max-rows="4"
              hide-details
              :disabled="insightsLoading"
              @keydown.enter.exact.prevent="handleAskQuestion"
            />
            <v-btn
              icon="mdi-send"
              color="primary"
              :loading="insightsLoading"
              :disabled="insightsLoading || !question.trim()"
              @click="handleAskQuestion"
            />
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useInsight } from "@/composables/useInsight";
import { useSnackbar } from "@/composables/useSnackbar";

type InsightsPreset =
  | "THIS_MONTH"
  | "PREV_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_12_MONTHS"
  | "THIS_YEAR"
  | "PREV_YEAR"
  | "CUSTOM";

const { showErrorSnackbar } = useSnackbar();
const {
  conversation,
  insightLoading: insightsLoading,
  insightError: insightsError,
  loadConversation,
  persistConversation,
  clearConversation,
  askQuestion,
} = useInsight();

const presetOptions: { value: InsightsPreset; label: string }[] = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "PREV_MONTH", label: "Prev month" },
  { value: "LAST_3_MONTHS", label: "3 months" },
  { value: "LAST_6_MONTHS", label: "6 months" },
  { value: "LAST_12_MONTHS", label: "12 months" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "PREV_YEAR", label: "Prev year" },
  { value: "CUSTOM", label: "Custom" },
];

const selectedPreset = ref<InsightsPreset>("THIS_MONTH");
const startDate = ref<string>("");
const endDate = ref<string>("");
const question = ref<string>("");
const messagesContainer = ref<HTMLElement | null>(null);

const isCustomPreset = computed(() => selectedPreset.value === "CUSTOM");
const hasConversation = computed(() => conversation.value.messages.length > 0);

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const applyPresetDates = (preset: InsightsPreset) => {
  const today = new Date();
  let presetStart: Date;
  let presetEnd = today;

  switch (preset) {
    case "THIS_MONTH":
      presetStart = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "PREV_MONTH":
      presetStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      presetEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "LAST_3_MONTHS":
      presetStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      break;
    case "LAST_6_MONTHS":
      presetStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      break;
    case "LAST_12_MONTHS":
      presetStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      break;
    case "THIS_YEAR":
      presetStart = new Date(today.getFullYear(), 0, 1);
      break;
    case "PREV_YEAR":
      presetStart = new Date(today.getFullYear() - 1, 0, 1);
      presetEnd = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  startDate.value = formatDateForInput(presetStart);
  endDate.value = formatDateForInput(presetEnd);
};

const isValidDateRange = (): boolean => {
  if (!startDate.value || !endDate.value) {
    showErrorSnackbar("Please select both a start and end date.");
    return false;
  }

  if (startDate.value > endDate.value) {
    showErrorSnackbar("Start date must be before or equal to end date.");
    return false;
  }

  return true;
};

const handleAskQuestion = async () => {
  const trimmedQuestion = question.value.trim();
  if (!trimmedQuestion) {
    return;
  }

  if (!isValidDateRange()) {
    return;
  }

  conversation.value.messages.push({ role: "USER", content: trimmedQuestion });
  persistConversation();
  question.value = "";
  scrollToBottom();

  const response = await askQuestion(trimmedQuestion, {
    startDate: startDate.value,
    endDate: endDate.value,
  });

  if (!response) {
    showErrorSnackbar(insightsError.value || "Unable to fetch insights right now.");
    conversation.value.messages.pop();
    persistConversation();
    return;
  }

  conversation.value.messages.push({ role: "ASSISTANT", content: response.answer });
  persistConversation();
  scrollToBottom();
};

const handleClearConversation = () => {
  clearConversation();
};

watch(selectedPreset, (preset) => {
  if (preset !== "CUSTOM") {
    applyPresetDates(preset);
  }
});

onMounted(() => {
  loadConversation();
  applyPresetDates(selectedPreset.value);
  scrollToBottom();
});
</script>

<style scoped>
.insights-container {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
}

.messages-area {
  min-height: 0;
}

.messages-list {
  max-width: 720px;
}

.message-bubble {
  max-width: 80%;
  word-break: break-word;
}

.user-bubble {
  border-bottom-right-radius: 4px !important;
}

.assistant-bubble {
  border-bottom-left-radius: 4px !important;
}

.input-area {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.input-content {
  max-width: 720px;
}
</style>
