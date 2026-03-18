import { ref, computed } from "vue";
import { useGetInsightLazyQuery, type DateRangeInput } from "@/__generated__/vue-apollo";

export function useInsight() {
  const question = ref("");
  const dateRange = ref<DateRangeInput>({
    startDate: "",
    endDate: "",
  });

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

    // load() returns false if already loaded, use refetch() for subsequent calls
    const loaded = await loadInsight();
    if (!loaded) {
      await refetchInsight();
    }
  };

  return {
    insightLoading,
    insightError,
    insightAnswer,
    insightAgentTrace,
    askQuestion,
  };
}
