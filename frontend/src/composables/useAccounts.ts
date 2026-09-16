import { ref, watch } from "vue";
import { ApolloError } from "@apollo/client/core";
import { i18n } from "@/plugins/i18n";
import {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  type CreateAccountInput,
  type UpdateAccountInput,
  type Account,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type { Account, CreateAccountInput, UpdateAccountInput };

const isInternalServerError = (error: ApolloError): boolean =>
  error.graphQLErrors[0]?.extensions?.code === "INTERNAL_SERVER_ERROR";

// Real error message when available and safe to show; fallback for masked or non-Error failures
const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApolloError && isInternalServerError(error)) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export function useAccounts() {
  const { t } = i18n.global;
  const accountsError = ref<string | null>(null);

  // Query for active accounts
  const {
    result: accountsResult,
    loading: accountsLoading,
    error: accountsQueryError,
    refetch: refetchAccounts,
  } = useGetAccountsQuery();

  // Create account mutation
  const { mutate: createAccountMutation, loading: createAccountLoading } =
    useCreateAccountMutation();

  // Update account mutation
  const { mutate: updateAccountMutation, loading: updateAccountLoading } =
    useUpdateAccountMutation();

  // Delete account mutation
  const { mutate: deleteAccountMutation, loading: deleteAccountLoading } =
    useDeleteAccountMutation();

  // Watch for query errors
  watch(accountsQueryError, (error) => {
    if (error) {
      console.error("Accounts query failed:", error);

      accountsError.value = isInternalServerError(error)
        ? t("accounts.errors.fetchFailed")
        : error.message;
    }
  });

  // Create account function
  const createAccount = async (input: CreateAccountInput): Promise<Account | null> => {
    try {
      accountsError.value = null;
      const result = await createAccountMutation({ input });
      if (result?.data?.createAccount) {
        await refetchAccounts();
        return result.data.createAccount;
      }
      return null;
    } catch (error) {
      console.error("Error creating account:", error);

      accountsError.value = resolveErrorMessage(error, t("accounts.errors.createFailed"));

      return null;
    }
  };

  // Update account function
  const updateAccount = async (
    id: string,
    input: Omit<UpdateAccountInput, "id">,
  ): Promise<Account | null> => {
    try {
      accountsError.value = null;
      const result = await updateAccountMutation({ input: { id, ...input } });
      if (result?.data?.updateAccount) {
        await refetchAccounts();
        return result.data.updateAccount;
      }
      return null;
    } catch (error) {
      console.error("Error updating account:", error);

      accountsError.value = resolveErrorMessage(error, t("accounts.errors.updateFailed"));

      return null;
    }
  };

  // Delete account function
  const deleteAccount = async (id: string): Promise<boolean> => {
    try {
      accountsError.value = null;
      const result = await deleteAccountMutation({ id });
      // If we get here without an error, the deletion was successful
      if (result?.data) {
        await refetchAccounts();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting account:", error);

      accountsError.value = resolveErrorMessage(error, t("accounts.errors.deleteFailed"));

      return false;
    }
  };

  return {
    // Data
    accounts: accountsResult,

    // Loading states
    accountsLoading,
    createAccountLoading,
    updateAccountLoading,
    deleteAccountLoading,

    // Error state
    accountsError,

    // Functions
    createAccount,
    updateAccount,
    deleteAccount,
    refetchAccounts,
  };
}
