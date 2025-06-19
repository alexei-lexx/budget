import { useMutation } from "@vue/apollo-composable";
import { ref, watch } from "vue";
import { ENSURE_USER } from "@/graphql/mutations";
import type { ApolloError } from "@apollo/client/core";

interface User {
  email: string;
}

interface EnsureUserResponse {
  ensureUser: User;
}

export function useUser() {
  const user = ref<User | null>(null);
  const userError = ref<string | null>(null);

  const { mutate: ensureUserMutation, loading: ensureUserLoading, error: mutationError } = useMutation<EnsureUserResponse>(ENSURE_USER);

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