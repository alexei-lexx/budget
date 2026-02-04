import { computed, ref } from "vue";
import type { ApolloError } from "@apollo/client";
import {
  useGetAiInsightsLazyQuery,
  type AiInsightsInput,
  type AiInsightsMessageInput,
  type AiInsightsResponse,
} from "@/__generated__/vue-apollo";

export interface AiInsightsMessage {
  role: AiInsightsMessageInput["role"];
  content: string;
}

export interface AiInsightsConversation {
  messages: AiInsightsMessage[];
}

const STORAGE_KEY = "budget_ai_insights_conversation";

export function useAiInsights() {
  const insightsError = ref<string | null>(null);
  const conversation = ref<AiInsightsConversation>({
    messages: [],
  });

  const loadConversation = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      conversation.value = { messages: [] };
      return;
    }

    try {
      const parsed = JSON.parse(raw) as AiInsightsConversation;
      conversation.value = {
        messages: Array.isArray(parsed.messages)
          ? parsed.messages.filter((message) => message.content)
          : [],
      };
    } catch {
      conversation.value = { messages: [] };
    }
  };

  const persistConversation = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversation.value));
  };

  const clearConversation = () => {
    conversation.value = { messages: [] };
    localStorage.removeItem(STORAGE_KEY);
  };

  const buildInput = (
    question: string,
    period: AiInsightsInput["period"],
  ): AiInsightsInput => ({
    question,
    period,
    conversation: conversation.value.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  const {
    result: insightsResult,
    loading: insightsLoading,
    error: insightsQueryError,
    load: loadInsights,
  } = useGetAiInsightsLazyQuery();

  const askQuestion = async (
    question: string,
    period: AiInsightsInput["period"],
  ): Promise<AiInsightsResponse | null> => {
    insightsError.value = null;

    try {
      const result = await loadInsights(
        { input: buildInput(question, period) },
        {
          fetchPolicy: "no-cache",
        },
      );

      const response = result?.data?.aiInsights ?? null;
      if (!response) {
        if (insightsQueryError.value) {
          insightsError.value =
            insightsQueryError.value.message ||
            "Failed to fetch AI insights. Please try again.";
        }
        return null;
      }

      return response;
    } catch (error) {
      const apolloError = error as ApolloError;
      insightsError.value =
        apolloError?.message || "Failed to fetch AI insights. Please try again.";
      return null;
    }
  };

  const answer = computed(() => insightsResult.value?.aiInsights?.answer ?? null);

  return {
    conversation,
    insightsLoading,
    insightsError,
    answer,
    loadConversation,
    persistConversation,
    clearConversation,
    askQuestion,
  };
}
