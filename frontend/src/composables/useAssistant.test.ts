import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

const mockMutate = vi.fn();

vi.mock("@/__generated__/vue-apollo", () => ({
  useAskAssistantMutation: () => ({
    mutate: mockMutate,
    loading: ref(false),
  }),
}));

import { useAssistant } from "./useAssistant";

describe("useAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("askAssistant", () => {
    // Happy path

    it("passes abort signal to mutation", async () => {
      // Arrange
      mockMutate.mockResolvedValue(null);

      const { askAssistant } = useAssistant();

      // Act
      askAssistant("What is my balance?");

      // Assert
      expect(mockMutate.mock.calls[0]?.[1]?.context?.fetchOptions?.signal).toBeInstanceOf(
        AbortSignal,
      );
    });
  });

  describe("abortAskAssistant", () => {
    // Happy path

    it("does not throw", () => {
      // Arrange
      const { abortAskAssistant } = useAssistant();

      // Act & Assert
      expect(() => abortAskAssistant()).not.toThrow();
    });
  });
});
