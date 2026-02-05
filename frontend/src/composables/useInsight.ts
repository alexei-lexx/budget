import { ref } from "vue";
import type { ApolloError } from "@apollo/client";
import { apolloClient } from "@/apollo";
import {
  GetInsightDocument,
  type GetInsightQuery,
  type GetInsightQueryVariables,
  type InsightInput,
} from "@/__generated__/vue-apollo";

export function useInsight() {
  const insightLoading = ref(false);
  const insightError = ref<string | null>(null);
  const insightAnswer = ref<string | null>(null);

  const askQuestion = async (
    question: string,
    dateRange: InsightInput["dateRange"],
  ): Promise<void> => {
    insightError.value = null;
    insightAnswer.value = null;
    insightLoading.value = true;

    try {
      const result = await apolloClient.query<GetInsightQuery, GetInsightQueryVariables>({
        query: GetInsightDocument,
        variables: { input: { question, dateRange } },
        fetchPolicy: "no-cache",
      });

      insightAnswer.value = result.data?.insight?.answer ?? null;
    } catch (error) {
      const apolloError = error as ApolloError;
      insightError.value = apolloError?.message || "Failed to fetch insight. Please try again.";
    } finally {
      insightLoading.value = false;
    }
  };

  return {
    insightLoading,
    insightError,
    insightAnswer,
    askQuestion,
  };
}
