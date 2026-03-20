import { ref } from "vue";
import type { AgentTraceMessage, Transaction } from "@/__generated__/vue-apollo";
import { useCreateTransactionFromTextMutation } from "@/__generated__/vue-apollo";
import { useSnackbar } from "@/composables/useSnackbar";

export function useCreateTransactionFromText() {
  const text = ref("");
  const agentTrace = ref<AgentTraceMessage[]>([]);
  const { showErrorSnackbar } = useSnackbar();

  const { mutate, loading, error } = useCreateTransactionFromTextMutation();

  const submit = async (isVoiceInput: boolean = false): Promise<Transaction | null> => {
    const trimmedText = text.value.trim();
    if (!trimmedText) {
      return null;
    }

    try {
      const result = await mutate({ input: { text: trimmedText, isVoiceInput } });
      const response = result?.data?.createTransactionFromText ?? null;
      agentTrace.value = response?.agentTrace ?? [];

      if (response?.__typename === "CreateTransactionFromTextFailure") {
        showErrorSnackbar(response.message);
        // text is intentionally NOT cleared on error
        return null;
      }

      if (response?.__typename === "CreateTransactionFromTextSuccess") {
        if (response.transaction) {
          text.value = "";
        }

        return response.transaction;
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
    submit,
  };
}
