<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="insight-container pa-0" fluid>
    <div class="d-flex flex-column fill-height">
      <!-- Answer area -->
      <div class="answer-area flex-grow-1 overflow-y-auto pa-4">
        <v-empty-state
          v-if="!insightAnswer && !insightLoading"
          icon="mdi-lightbulb-on-outline"
          title="Ask about your finances"
          text="Select a time period and ask a question to get started."
        />

        <div v-else-if="insightLoading" class="d-flex justify-center align-center fill-height">
          <v-progress-circular indeterminate size="40" width="3" />
        </div>

        <div v-else-if="insightAnswer" class="answer-content mx-auto">
          <div class="text-body-1" style="white-space: pre-wrap">
            {{ insightAnswer }}
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

          <!-- Question input -->
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
              :disabled="insightLoading"
              @keydown.enter.exact.prevent="handleAskQuestion"
            >
              <template #append-inner>
                <v-icon
                  v-if="question.trim()"
                  icon="mdi-close-circle"
                  size="small"
                  class="cursor-pointer"
                  @click="question = ''"
                />
              </template>
            </v-textarea>
            <v-btn
              icon="mdi-send"
              color="primary"
              :loading="insightLoading"
              :disabled="insightLoading || !question.trim()"
              @click="handleAskQuestion"
            />
          </div>
        </div>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useInsight } from "@/composables/useInsight";
import { useSnackbar } from "@/composables/useSnackbar";

type InsightPreset =
  | "THIS_MONTH"
  | "PREV_MONTH"
  | "LAST_3_MONTHS"
  | "LAST_6_MONTHS"
  | "LAST_12_MONTHS"
  | "THIS_YEAR"
  | "PREV_YEAR"
  | "CUSTOM";

const STORAGE_KEY = "insight-input";

const { showErrorSnackbar } = useSnackbar();
const { insightLoading, insightError, insightAnswer, askQuestion } = useInsight();

interface StoredInput {
  question: string;
  preset: InsightPreset;
  startDate: string;
  endDate: string;
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
    preset: selectedPreset.value,
    startDate: startDate.value,
    endDate: endDate.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const presetOptions: { value: InsightPreset; label: string }[] = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "PREV_MONTH", label: "Prev month" },
  { value: "LAST_3_MONTHS", label: "3 months" },
  { value: "LAST_6_MONTHS", label: "6 months" },
  { value: "LAST_12_MONTHS", label: "12 months" },
  { value: "THIS_YEAR", label: "This year" },
  { value: "PREV_YEAR", label: "Prev year" },
  { value: "CUSTOM", label: "Custom" },
];

const storedInput = loadStoredInput();
const selectedPreset = ref<InsightPreset>(storedInput.preset ?? "THIS_MONTH");
const startDate = ref<string>(storedInput.startDate ?? "");
const endDate = ref<string>(storedInput.endDate ?? "");
const question = ref<string>(storedInput.question ?? "");

const isCustomPreset = computed(() => selectedPreset.value === "CUSTOM");

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const applyPresetDates = (preset: InsightPreset) => {
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

  await askQuestion(trimmedQuestion, {
    startDate: startDate.value,
    endDate: endDate.value,
  });

  if (insightError.value) {
    showErrorSnackbar(insightError.value);
  }
};

watch(selectedPreset, (preset) => {
  if (preset !== "CUSTOM") {
    applyPresetDates(preset);
  }
  saveInput();
});

watch([question, startDate, endDate], () => {
  saveInput();
});

onMounted(() => {
  // Only apply preset dates if no stored custom dates or not custom preset
  if (selectedPreset.value !== "CUSTOM" || !storedInput.startDate) {
    applyPresetDates(selectedPreset.value);
  }
});
</script>

<style scoped>
.insight-container {
  height: calc(100vh - 64px);
  max-height: calc(100vh - 64px);
}

.answer-area {
  min-height: 0;
}

.answer-content {
  max-width: 720px;
}

.input-area {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.input-content {
  max-width: 720px;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
