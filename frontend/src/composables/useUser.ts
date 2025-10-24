import { ref, watch } from "vue";
import type { ApolloError } from "@apollo/client";
import { useEnsureUserMutation } from "@/__generated__/vue-apollo";

// User type is available from generated types

export function useUser() {
  const user = ref<{ email: string } | null>(null);
  const userError = ref<string | null>(null);

  const {
    mutate: ensureUserMutation,
    loading: ensureUserLoading,
    error: mutationError,
  } = useEnsureUserMutation();

  // Watch for mutation completion
  watch(mutationError, (error: ApolloError | null) => {
    if (error) {
      console.error("EnsureUser mutation failed:", error);
      userError.value = error.message || "Failed to create user";
    }
  });

  const ensureUser = async () => {
    try {
      userError.value = null;
      const result = await ensureUserMutation();
      if (result?.data?.ensureUser) {
        user.value = result.data.ensureUser;
        userError.value = null;
      }
    } catch (error) {
      console.error("Error in ensureUser:", error);
      userError.value = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  return {
    user,
    userError,
    ensureUserLoading,
    ensureUser,
    mutationError,
  };
}
