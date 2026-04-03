import { ref, computed, watch } from "vue";
import { useAskInsightMutation } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage, AskInsightMutation } from "@/__generated__/vue-apollo";

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
  const stored = loadStoredResult();
  const storedAnswer = ref<string | null>(stored?.answer ?? null);
  const storedAgentTrace = ref<AgentTraceMessage[]>(stored?.agentTrace ?? []);
  const mutationData = ref<AskInsightMutation | null>(null);

  const {
    mutate: askInsightMutate,
    loading: insightLoading,
    error: insightMutationError,
    onDone,
  } = useAskInsightMutation();

  onDone((fetchResult) => {
    mutationData.value = fetchResult.data ?? null;
  });

  const fetchedAnswer = computed(() => {
    const insight = mutationData.value?.askInsight;
    if (insight?.__typename === "InsightSuccess") return insight.answer;
    return null;
  });

  const fetchedAgentTrace = computed(() => mutationData.value?.askInsight?.agentTrace ?? []);

  const insightError = computed(() => {
    const insight = mutationData.value?.askInsight;
    if (insight?.__typename === "InsightFailure") return insight.message;
    return insightMutationError.value?.message ?? null;
  });

  const insightAnswer = computed(() => fetchedAnswer.value ?? storedAnswer.value);

  const insightAgentTrace = computed(() =>
    fetchedAnswer.value !== null ? fetchedAgentTrace.value : storedAgentTrace.value,
  );

  watch(
    () => mutationData.value,
    (data) => {
      if (data?.askInsight) {
        const agentTrace = data.askInsight.agentTrace;
        const answer =
          data.askInsight.__typename === "InsightSuccess" ? data.askInsight.answer : undefined;
        saveStoredResult({ answer, agentTrace });
        // Keep in sync so the fallback reflects the latest result if mutationData goes null
        storedAnswer.value = answer ?? null;
        storedAgentTrace.value = agentTrace;
      }
    },
  );

  const askQuestion = async (question: string): Promise<void> => {
    await askInsightMutate({ input: { question } });
  };

  return {
    askQuestion,
    insightAgentTrace,
    insightAnswer,
    insightError,
    insightLoading,
  };
}
