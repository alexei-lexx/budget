import { ref, watch } from "vue";
import type { ApolloError } from "@apollo/client";
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
  const {
    mutate: createAccountMutation,
    loading: createAccountLoading,
    error: createAccountError,
  } = useCreateAccountMutation();

  // Update account mutation
  const {
    mutate: updateAccountMutation,
    loading: updateAccountLoading,
    error: updateAccountError,
  } = useUpdateAccountMutation();

  // Delete account mutation
  const {
    mutate: deleteAccountMutation,
    loading: deleteAccountLoading,
    error: deleteAccountError,
  } = useDeleteAccountMutation();

  // Watch for query errors
  watch(accountsQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Accounts query failed:", error);
      accountsError.value = error.message || t("accounts.errors.fetchFailed");
    }
  });

  // Watch for mutation errors
  watch(
    [createAccountError, updateAccountError, deleteAccountError],
    ([createError, updateError, deleteError]) => {
      const error = createError || updateError || deleteError;
      if (error) {
        console.error("Account mutation failed:", error);
        accountsError.value = error.message || t("accounts.errors.operationFailed");
      }
    },
  );

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
      accountsError.value =
        error instanceof Error ? error.message : t("accounts.errors.createFailed");
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
      accountsError.value =
        error instanceof Error ? error.message : t("accounts.errors.updateFailed");
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
      accountsError.value =
        error instanceof Error ? error.message : t("accounts.errors.deleteFailed");
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

    // Error states
    accountsError,
    accountsQueryError,
    createAccountError,
    updateAccountError,
    deleteAccountError,

    // Functions
    createAccount,
    updateAccount,
    deleteAccount,
    refetchAccounts,
  };
}
