import { ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { resolveErrorMessage } from "@/utils/graphqlError";
import { useEnsureUserMutation } from "@/__generated__/vue-apollo";

// User type is available from generated types

export function useUser() {
  const { t } = i18n.global;
  const user = ref<{ email: string } | null>(null);
  const userError = ref<string | null>(null);

  const { mutate: ensureUserMutation, loading: ensureUserLoading } = useEnsureUserMutation();

  const ensureUser = async () => {
    try {
      userError.value = null;

      const result = await ensureUserMutation();
      if (result?.data?.ensureUser) {
        user.value = result.data.ensureUser;
      }
    } catch (error) {
      console.error("Error in ensureUser:", error);

      userError.value = resolveErrorMessage(error, t("app.userCreationFailed"));
    }
  };

  return {
    // Data
    user,

    // Loading states
    ensureUserLoading,

    // Error state
    userError,

    // Functions
    ensureUser,
  };
}
