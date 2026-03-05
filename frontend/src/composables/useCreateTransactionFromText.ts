import { ref } from "vue";
import type { Transaction } from "@/__generated__/vue-apollo";
import { useCreateTransactionFromTextMutation } from "@/__generated__/vue-apollo";
import { useSnackbar } from "@/composables/useSnackbar";

export function useCreateTransactionFromText() {
  const text = ref("");
  const { showErrorSnackbar } = useSnackbar();

  const { mutate, loading, error } = useCreateTransactionFromTextMutation();

  const submit = async (): Promise<Transaction | null> => {
    const trimmedText = text.value.trim();
    if (!trimmedText) {
      return null;
    }

    try {
      const result = await mutate({ input: { text: trimmedText } });
      const transaction = result?.data?.createTransactionFromText ?? null;
      if (transaction) {
        text.value = "";
      }
      return transaction;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create transaction. Please try again.";
      showErrorSnackbar(message);
      // text is intentionally NOT cleared on error (US4 requirement)
      return null;
    }
  };

  return {
    text,
    loading,
    error,
    submit,
  };
}
