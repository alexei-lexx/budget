import { ref } from "vue";
import {
  type AgentTraceMessage,
  type Transaction,
  useCreateTransactionFromTextMutation,
} from "@/__generated__/vue-apollo";
import { useSnackbar } from "@/composables/useSnackbar";

const CHAT_HISTORY_MAX_MESSAGES = 20;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function formatTransactionSummary(transaction: Transaction): string {
  const parts: string[] = [];

  if (transaction.description) {
    parts.push(transaction.description);
  }

  parts.push(`${transaction.amount} ${transaction.currency}`);
  parts.push(`(${transaction.type.toLowerCase()})`);
  parts.push(`on ${transaction.date}`);

  return parts.join(" ");
}

export function useCreateTransactionFromText() {
  const text = ref("");
  const agentTrace = ref<AgentTraceMessage[]>([]);
  const chatHistory = ref<ChatMessage[]>([]);
  const { showErrorSnackbar, showInfoSnackbar } = useSnackbar();

  const { mutate, loading, error } = useCreateTransactionFromTextMutation();

  const submit = async (isVoiceInput: boolean): Promise<Transaction | null> => {
    const trimmedText = text.value.trim();
    if (!trimmedText) {
      return null;
    }

    try {
      const result = await mutate({
        input: {
          text: trimmedText,
          isVoiceInput,
          history: chatHistory.value.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        },
      });
      const response = result?.data?.createTransactionFromText ?? null;
      agentTrace.value = response?.agentTrace ?? [];

      if (response?.__typename === "CreateTransactionFromTextFailure") {
        showErrorSnackbar(response.message);
        // text is intentionally NOT cleared on error
        return null;
      }

      if (response?.__typename === "CreateTransactionFromTextSuccess") {
        const transaction = response.transaction;

        if (transaction) {
          const summary = formatTransactionSummary(transaction);
          showInfoSnackbar(`Created: ${summary}`);

          chatHistory.value = [
            ...chatHistory.value,
            { role: "user" as const, content: trimmedText },
            { role: "assistant" as const, content: `Transaction created: ${summary}` },
          ].slice(-CHAT_HISTORY_MAX_MESSAGES);

          text.value = "";
        }

        return transaction;
      }

      return null;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create transaction. Please try again.";
      showErrorSnackbar(message);
      // text is intentionally NOT cleared on error
      return null;
    }
  };

  return {
    text,
    loading,
    error,
    agentTrace,
    chatHistory,
    submit,
  };
}
