import { ref, computed, watch } from "vue";
import { useGetInsightLazyQuery } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const STORAGE_KEY = "insight-last-result";

interface StoredInsightResult {
  answer?: string;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Fallback: agentTrace can be large; try storing without it
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...result, agentTrace: [] }));
    } catch (error) {
      console.error("Failed to persist insight result:", error);
    }
  }
};

export function useInsight() {
  const question = ref("");

  const stored = loadStoredResult();
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

  watch(
    () => insightResult.value,
    (result) => {
      if (result?.insight) {
        const agentTrace = result.insight.agentTrace;
        const answer =
          result.insight.__typename === "InsightSuccess" ? result.insight.answer : undefined;
        saveStoredResult({ answer, agentTrace });
        // Keep in sync so the fallback reflects the latest result if fetchedAnswer goes null
        // (e.g. if Apollo clears the result during a subsequent refetch)
        storedAnswer.value = answer ?? null;
        storedAgentTrace.value = agentTrace;
      }
    },
  );

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
