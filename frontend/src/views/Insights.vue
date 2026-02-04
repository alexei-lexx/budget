<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <h1 :class="$vuetify.display.xs ? 'text-h5' : 'text-h4'">AI Insights</h1>
          <v-btn
            variant="outlined"
            color="primary"
            prepend-icon="mdi-refresh"
            :disabled="!hasConversation || insightsLoading"
            @click="handleClearConversation"
          >
            Clear Conversation
          </v-btn>
        </div>

        <v-card class="mb-4">
          <v-card-title class="text-subtitle-1">Time period</v-card-title>
          <v-card-text>
            <v-btn-toggle v-model="selectedPreset" mandatory class="flex-wrap ga-2">
              <v-btn value="THIS_MONTH">This month</v-btn>
              <v-btn value="LAST_3_MONTHS">Last 3 months</v-btn>
              <v-btn value="THIS_YEAR">This year</v-btn>
              <v-btn value="CUSTOM">Custom</v-btn>
            </v-btn-toggle>

            <v-row v-if="isCustomPreset" class="mt-4">
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="startDate"
                  type="date"
                  label="Start date"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="endDate"
                  type="date"
                  label="End date"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card class="mb-4">
          <v-card-title class="text-subtitle-1">Ask a question</v-card-title>
          <v-card-text>
            <v-textarea
              v-model="question"
              label="Ask about your spending..."
              auto-grow
              rows="3"
              variant="outlined"
              :disabled="insightsLoading"
            />
            <div class="d-flex justify-end mt-3">
              <v-btn
                color="primary"
                prepend-icon="mdi-send"
                :loading="insightsLoading"
                :disabled="insightsLoading"
                @click="handleAskQuestion"
              >
                Get insights
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-card>
          <v-card-title class="text-subtitle-1">Conversation</v-card-title>
          <v-divider />
          <v-card-text>
            <v-empty-state
              v-if="!hasConversation"
              icon="mdi-lightbulb-outline"
              title="No insights yet"
              text="Ask a question to start your insights conversation."
            />
            <v-list v-else class="pa-0">
              <v-list-item v-for="(message, index) in conversation.messages" :key="index">
                <template #prepend>
                  <v-chip :color="message.role === 'USER' ? 'primary' : 'secondary'" size="small">
                    {{ message.role === "USER" ? "You" : "AI" }}
                  </v-chip>
                </template>
                <v-list-item-title class="text-body-1 text-wrap">
                  {{ message.content }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useAiInsights } from "@/composables/useAiInsights";
import { useSnackbar } from "@/composables/useSnackbar";

type InsightsPreset = "THIS_MONTH" | "LAST_3_MONTHS" | "THIS_YEAR" | "CUSTOM";

const { showErrorSnackbar, showInfoSnackbar } = useSnackbar();
const {
  conversation,
  insightsLoading,
  insightsError,
  loadConversation,
  persistConversation,
  clearConversation,
  askQuestion,
} = useAiInsights();

const selectedPreset = ref<InsightsPreset>("THIS_MONTH");
const startDate = ref<string>("");
const endDate = ref<string>("");
const question = ref<string>("");

const isCustomPreset = computed(() => selectedPreset.value === "CUSTOM");
const hasConversation = computed(() => conversation.value.messages.length > 0);

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const applyPresetDates = (preset: InsightsPreset) => {
  const today = new Date();
  let presetStart = today;

  switch (preset) {
    case "THIS_MONTH":
      presetStart = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "LAST_3_MONTHS":
      presetStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      break;
    case "THIS_YEAR":
      presetStart = new Date(today.getFullYear(), 0, 1);
      break;
    default:
      break;
  }

  startDate.value = formatDateForInput(presetStart);
  endDate.value = formatDateForInput(today);
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
    showErrorSnackbar("Please enter a question to continue.");
    return;
  }

  if (!isValidDateRange()) {
    return;
  }

  conversation.value.messages.push({ role: "USER", content: trimmedQuestion });
  persistConversation();

  const response = await askQuestion(trimmedQuestion, {
    startDate: startDate.value,
    endDate: endDate.value,
  });

  if (!response) {
    if (insightsError.value) {
      showErrorSnackbar(insightsError.value);
    }
    if (!insightsError.value) {
      showErrorSnackbar("Unable to fetch insights right now.");
    }
    conversation.value.messages.pop();
    persistConversation();
    return;
  }

  conversation.value.messages.push({ role: "ASSISTANT", content: response.answer });
  persistConversation();
  question.value = "";
};

const handleClearConversation = () => {
  clearConversation();
  showInfoSnackbar("Conversation cleared.");
};

watch(selectedPreset, (preset) => {
  if (preset !== "CUSTOM") {
    applyPresetDates(preset);
  }
});

onMounted(() => {
  loadConversation();
  applyPresetDates(selectedPreset.value);
});
</script>
