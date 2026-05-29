import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

const mockMutate = vi.fn();

vi.mock("@/__generated__/vue-apollo", () => ({
  useCreateTransactionFromTextMutation: () => ({
    mutate: mockMutate,
    loading: ref(false),
    error: ref(null),
  }),
}));

vi.mock("@/composables/useSnackbar", () => ({
  useSnackbar: () => ({
    showErrorSnackbar: vi.fn(),
  }),
}));

import { useCreateTransactionFromText } from "./useCreateTransactionFromText";

describe("useCreateTransactionFromText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submit", () => {
    // Happy path

    it("passes abort signal to mutation", async () => {
      // Arrange
      mockMutate.mockResolvedValue(null);
      const { submit, text } = useCreateTransactionFromText();
      text.value = "10 euros for lunch";

      // Act
      submit(false);

      // Assert
      expect(mockMutate.mock.calls[0]?.[1]?.context?.fetchOptions?.signal).toBeInstanceOf(
        AbortSignal,
      );
    });
  });

  describe("abortCreateTransactionFromText", () => {
    // Happy path

    it("does not throw", () => {
      // Arrange
      const { abortCreateTransactionFromText } = useCreateTransactionFromText();

      // Act & Assert
      expect(() => abortCreateTransactionFromText()).not.toThrow();
    });
  });
});
