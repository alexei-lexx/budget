import { ref, computed, watch } from "vue";
import { useGetInsightLazyQuery } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const STORAGE_KEY = "insight-last-result";

interface StoredInsightResult {
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
  const storedAnswer = stored?.answer ?? null;
  const storedAgentTrace = stored?.agentTrace ?? [];

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

  const insightAnswer = computed(() => fetchedAnswer.value ?? storedAnswer);

  const insightAgentTrace = computed(() =>
    fetchedAnswer.value !== null ? fetchedAgentTrace.value : storedAgentTrace,
  );

  watch(fetchedAnswer, (newAnswer) => {
    if (newAnswer !== null) {
      saveStoredResult({ answer: newAnswer, agentTrace: fetchedAgentTrace.value });
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
  };
}
