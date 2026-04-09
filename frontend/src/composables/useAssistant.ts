import { ref, computed } from "vue";
import { useAskAssistantMutation } from "@/__generated__/vue-apollo";
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

const LAST_RESULT_STORAGE_KEY = "assistant-last-result";
const SESSION_ID_STORAGE_KEY = "assistant-session-id";

interface StoredAssistantResult {
  answer?: string;
  agentTrace: AgentTraceMessage[];
}

const loadStoredResult = (): StoredAssistantResult | null => {
  try {
    const stored = localStorage.getItem(LAST_RESULT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to load stored result:", error);
    return null;
  }
};

const saveStoredResult = (result: StoredAssistantResult): void => {
  try {
    localStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Fallback: agentTrace can be large; try storing without it
    try {
      localStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify({ ...result, agentTrace: [] }));
    } catch (error) {
      console.error("Failed to persist assistant result:", error);
    }
  }
};

const loadStoredSessionId = (): string | null => {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch (error) {
    // Non-critical — session will just restart next visit
    console.error("Failed to load session ID:", error);
    return null;
  }
};

const saveSessionId = (sessionId: string): void => {
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch (error) {
    // Non-critical — session will just restart next visit
    console.error("Failed to persist session ID:", error);
  }
};

export function useAssistant() {
  const stored = loadStoredResult();
  const storedAnswer = ref<string | null>(stored?.answer ?? null);
  const storedAgentTrace = ref<AgentTraceMessage[]>(stored?.agentTrace ?? []);

  const sessionId = ref<string | null>(loadStoredSessionId());

  const fetchedAnswer = ref<string | null>(null);
  const fetchedAgentTrace = ref<AgentTraceMessage[] | null>(null);
  const askAssistantError = ref<string | null>(null);

  const { mutate: askAssistantMutation, loading: askAssistantLoading } = useAskAssistantMutation();

  const askAssistant = async (question: string): Promise<void> => {
    askAssistantError.value = null; // Reset error before new request

    try {
      const result = await askAssistantMutation({
        input: {
          question,
          sessionId: sessionId.value ?? undefined,
        },
      });
      const response = result?.data?.askAssistant ?? null;

      if (response?.__typename === "AssistantSuccess") {
        fetchedAnswer.value = response.answer;
        fetchedAgentTrace.value = response.agentTrace;
        // Persist session ID for future follow-up questions
        sessionId.value = response.sessionId;
        saveSessionId(response.sessionId);
      } else if (response?.__typename === "AssistantFailure") {
        askAssistantError.value = response.message;
        fetchedAnswer.value = null; // Clear answer on failure
        fetchedAgentTrace.value = response.agentTrace;
        // Persist session ID so the user can retry within the same session
        sessionId.value = response.sessionId;
        saveSessionId(response.sessionId);
      }

      saveStoredResult({
        answer: fetchedAnswer.value ?? undefined,
        agentTrace: fetchedAgentTrace.value ?? [],
      });

      // Keep stored in sync so the fallback clears on failure
      // rather than showing a stale cached answer
      storedAnswer.value = fetchedAnswer.value;
      storedAgentTrace.value = fetchedAgentTrace.value ?? [];
    } catch (error) {
      askAssistantError.value =
        error instanceof Error
          ? error.message
          : "Failed to get assistant response. Please try again.";
    }
  };

  const assistantAnswer = computed(() =>
    fetchedAnswer.value !== null ? fetchedAnswer.value : storedAnswer.value,
  );
  const assistantAgentTrace = computed(() =>
    fetchedAgentTrace.value !== null ? fetchedAgentTrace.value : storedAgentTrace.value,
  );

  return {
    askAssistant,
    askAssistantError: computed(() => askAssistantError.value),
    askAssistantLoading,
    assistantAgentTrace,
    assistantAnswer,
  };
}
