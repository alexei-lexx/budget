<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-h5 text-sm-h4">Insight</h1>
    </div>

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
  </v-container>

  <v-footer app elevation="4" class="pa-3 pa-sm-4">
    <div class="w-100">
      <!-- Period selector -->
      <div class="d-flex align-center ga-1 mb-3 flex-wrap">
        <v-chip
          v-for="option in dateRangePresetOptions"
          :key="option.value"
          :color="selectedDateRangePreset === option.value ? 'primary' : undefined"
          :variant="selectedDateRangePreset === option.value ? 'flat' : 'tonal'"
          size="small"
          label
          @click="selectedDateRangePreset = option.value"
        >
          {{ option.label }}
        </v-chip>
      </div>

      <v-row v-if="isCustomDateRangePreset" class="mb-3" dense>
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

      <AgenticInput
        v-model="question"
        :loading="insightLoading"
        :agent-trace="insightAgentTrace"
        placeholder="Ask about your spending..."
        input-aria-label="Ask a question"
        submit-aria-label="Submit question"
        @submit="handleAskQuestion"
      />
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useInsight } from "@/composables/useInsight";
import { useSnackbar } from "@/composables/useSnackbar";
import { formatDateAsYYYYMMDD } from "@/utils/date";
import AgenticInput from "@/components/AgenticInput.vue";

type InsightDateRangePreset =
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
const { insightLoading, insightError, insightAnswer, insightAgentTrace, askQuestion } =
  useInsight();

interface StoredInput {
  question: string;
  dateRangePreset: InsightDateRangePreset;
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
    dateRangePreset: selectedDateRangePreset.value,
    startDate: startDate.value,
    endDate: endDate.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const dateRangePresetOptions: { value: InsightDateRangePreset; label: string }[] = [
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
const selectedDateRangePreset = ref<InsightDateRangePreset>(
  storedInput.dateRangePreset ?? "THIS_MONTH",
);
const startDate = ref<string>(storedInput.startDate ?? "");
const endDate = ref<string>(storedInput.endDate ?? "");
const question = ref<string>(storedInput.question ?? "");

const isCustomDateRangePreset = computed(() => selectedDateRangePreset.value === "CUSTOM");

const formatDateForInput = (date: Date): string => {
  return formatDateAsYYYYMMDD(date);
};

const applyDateRangePreset = (dateRangePreset: InsightDateRangePreset) => {
  const today = new Date();
  let dateRangeStart: Date;
  let dateRangeEnd: Date;

  switch (dateRangePreset) {
    case "THIS_MONTH":
      dateRangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
      dateRangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case "PREV_MONTH":
      dateRangeStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      dateRangeEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "LAST_3_MONTHS":
      dateRangeStart = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      dateRangeEnd = today;
      break;
    case "LAST_6_MONTHS":
      dateRangeStart = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      dateRangeEnd = today;
      break;
    case "LAST_12_MONTHS":
      dateRangeStart = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
      dateRangeEnd = today;
      break;
    case "THIS_YEAR":
      dateRangeStart = new Date(today.getFullYear(), 0, 1);
      dateRangeEnd = new Date(today.getFullYear(), 11, 31);
      break;
    case "PREV_YEAR":
      dateRangeStart = new Date(today.getFullYear() - 1, 0, 1);
      dateRangeEnd = new Date(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return;
  }

  startDate.value = formatDateForInput(dateRangeStart);
  endDate.value = formatDateForInput(dateRangeEnd);
};

const isValidDateRange = (): boolean => {
  if (!startDate.value || !endDate.value) {
    showErrorSnackbar("Please select both a start and end date.");
    return false;
  }

  // YYYY-MM-DD format allows lexicographic comparison
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

watch(selectedDateRangePreset, (dateRangePreset) => {
  if (dateRangePreset !== "CUSTOM") {
    applyDateRangePreset(dateRangePreset);
  }
  saveInput();
});

watch([question, startDate, endDate], () => {
  saveInput();
});

onMounted(() => {
  // Only apply dates if no stored custom dates or not custom date range preset
  if (selectedDateRangePreset.value !== "CUSTOM" || !storedInput.startDate) {
    applyDateRangePreset(selectedDateRangePreset.value);
  }
});
</script>
