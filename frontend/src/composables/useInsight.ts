import { ref, computed, watch } from "vue";
import { useGetInsightLazyQuery } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const STORAGE_KEY = "insight-last-result";

interface StoredInsightResult {
  question: string;
  answer: string;
  agentTrace: AgentTraceMessage[];
}

const loadStoredResult = (): StoredInsightResult | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const saveStoredResult = (result: StoredInsightResult): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
};

export function useInsight() {
  const question = ref("");

  const stored = loadStoredResult();
  const storedQuestion = ref<string>(stored?.question ?? "");
  const storedAnswer = ref<string | null>(stored?.answer ?? null);
  const storedAgentTrace = ref<AgentTraceMessage[]>(stored?.agentTrace ?? []);

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
      },
    }),
    () => ({
      fetchPolicy: "no-cache",
    }),
  );

  const fetchedAnswer = computed(() => {
    const insight = insightResult.value?.insight;
    if (insight?.__typename === "InsightSuccess") return insight.answer;
    return null;
  });

  const fetchedAgentTrace = computed(() => insightResult.value?.insight?.agentTrace ?? []);

  const insightError = computed(() => {
    const insight = insightResult.value?.insight;
    if (insight?.__typename === "InsightFailure") return insight.message;
    return insightQueryError.value?.message ?? null;
  });

  const insightAnswer = computed(() => fetchedAnswer.value ?? storedAnswer.value);

  const insightAgentTrace = computed(() =>
    fetchedAnswer.value !== null ? fetchedAgentTrace.value : storedAgentTrace.value,
  );

  watch(fetchedAnswer, (newAnswer) => {
    if (newAnswer !== null) {
      const result: StoredInsightResult = {
        question: question.value,
        answer: newAnswer,
        agentTrace: fetchedAgentTrace.value,
      };
      saveStoredResult(result);
      storedAnswer.value = newAnswer;
      storedAgentTrace.value = fetchedAgentTrace.value;
    }
  });

  const askQuestion = async (questionInput: string): Promise<void> => {
    question.value = questionInput;

    // load() returns false if already loaded, use refetch() for subsequent calls
    const loaded = await loadInsight();
    if (!loaded) {
      await refetchInsight();
    }
  };

  return {
    askQuestion,
    insightAgentTrace,
    insightAnswer,
    insightError,
    insightLoading,
    storedQuestion,
  };
}
