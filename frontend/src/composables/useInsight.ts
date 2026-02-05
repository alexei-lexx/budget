import { ref, computed } from "vue";
import { useGetInsightLazyQuery, type InsightInput } from "@/__generated__/vue-apollo";

export function useInsight() {
  const question = ref("");
  const dateRange = ref<InsightInput["dateRange"]>({
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

  const insightAnswer = computed(() => insightResult.value?.insight?.answer ?? null);

  const insightError = computed(() => insightQueryError.value?.message ?? null);

  const askQuestion = async (q: string, dr: InsightInput["dateRange"]): Promise<void> => {
    question.value = q;
    dateRange.value = dr;
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
    askQuestion,
  };
}
