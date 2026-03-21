import { ref, computed } from "vue";
import { useGetInsightLazyQuery, type DateRangeInput } from "@/__generated__/vue-apollo";

const CHAT_HISTORY_MAX_MESSAGES = 20;

export interface InsightChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useInsight() {
  const question = ref("");
  const dateRange = ref<DateRangeInput>({
    startDate: "",
    endDate: "",
  });

  const chatHistory = ref<InsightChatMessage[]>([]);
  const currentQuestion = ref<string | null>(null);

  const {
    result: insightResult,
    loading: insightLoading,
    error: insightQueryError,
    load: loadInsight,
    refetch: refetchInsight,
  } = useGetInsightLazyQuery(
    () => ({
      input: {
        question: question.value,
        dateRange: dateRange.value,
        history: chatHistory.value.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      },
    }),
    () => ({
      fetchPolicy: "no-cache",
    }),
  );

  const insightAnswer = computed(() => {
    const insight = insightResult.value?.insight;
    if (insight?.__typename === "InsightSuccess") return insight.answer;
    return null;
  });

  const insightAgentTrace = computed(() => insightResult.value?.insight?.agentTrace ?? []);

  const insightError = computed(() => {
    const insight = insightResult.value?.insight;
    if (insight?.__typename === "InsightFailure") return insight.message;
    return insightQueryError.value?.message ?? null;
  });

  const askQuestion = async (
    questionInput: string,
    dateRangeInput: DateRangeInput,
  ): Promise<void> => {
    question.value = questionInput;
    dateRange.value = dateRangeInput;
    currentQuestion.value = questionInput;

    // load() returns false if already loaded, use refetch() for subsequent calls
    const loaded = await loadInsight();
    if (!loaded) {
      await refetchInsight();
    }

    if (insightAnswer.value) {
      chatHistory.value = [
        ...chatHistory.value,
        { role: "user" as const, content: questionInput },
        { role: "assistant" as const, content: insightAnswer.value },
      ].slice(-CHAT_HISTORY_MAX_MESSAGES);
    }

    currentQuestion.value = null;
  };

  return {
    insightLoading,
    insightError,
    insightAnswer,
    insightAgentTrace,
    chatHistory,
    currentQuestion,
    askQuestion,
  };
}
