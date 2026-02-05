import { ref } from "vue";
import type { ApolloError } from "@apollo/client";
import { apolloClient } from "@/apollo";
import { GetInsightDocument, type GetInsightQuery, type GetInsightQueryVariables, type InsightInput, type InsightResponse, type MessageInput } from "@/__generated__/vue-apollo";

export interface InsightMessage {
  role: MessageInput["role"];
  content: string;
}

export interface InsightConversation {
  messages: InsightMessage[];
}

const STORAGE_KEY = "budget_ai_insights_conversation";

export function useInsight() {
  const insightError = ref<string | null>(null);
  const conversation = ref<InsightConversation>({
    messages: [],
  });

  const loadConversation = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      conversation.value = { messages: [] };
      return;
    }

    try {
      const parsed = JSON.parse(raw) as InsightConversation;
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

  const buildInput = (question: string, period: InsightInput["period"]): InsightInput => ({
    question,
    period,
    conversation: conversation.value.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });

  const insightLoading = ref(false);

  const askQuestion = async (
    question: string,
    period: InsightInput["period"],
  ): Promise<InsightResponse | null> => {
    insightError.value = null;
    insightLoading.value = true;

    try {
      const result = await apolloClient.query<GetInsightQuery, GetInsightQueryVariables>({
        query: GetInsightDocument,
        variables: { input: buildInput(question, period) },
        fetchPolicy: "no-cache",
      });

      const response = result.data?.insight ?? null;
      if (!response) {
        return null;
      }

      return response;
    } catch (error) {
      const apolloError = error as ApolloError;
      insightError.value =
        apolloError?.message || "Failed to fetch insight. Please try again.";
      return null;
    } finally {
      insightLoading.value = false;
    }
  };

  return {
    conversation,
    insightLoading,
    insightError,
    loadConversation,
    persistConversation,
    clearConversation,
    askQuestion,
  };
}
