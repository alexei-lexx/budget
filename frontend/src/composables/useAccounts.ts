import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch } from "vue";
import { GET_ACCOUNTS } from "@/graphql/queries";
import { CREATE_ACCOUNT, UPDATE_ACCOUNT, ARCHIVE_ACCOUNT } from "@/graphql/mutations";
import type { ApolloError } from "@apollo/client/core";

export interface Account {
  id: string;
  name: string;
  currency: string;
  initialBalance: number;
}

export interface CreateAccountInput {
  name: string;
  currency: string;
  initialBalance: number;
}

export interface UpdateAccountInput {
  name?: string;
  currency?: string;
  initialBalance?: number;
}

interface GetAccountsResponse {
  accounts: Account[];
}

interface CreateAccountResponse {
  createAccount: Account;
}

interface UpdateAccountResponse {
  updateAccount: Account;
}

interface ArchiveAccountResponse {
  archiveAccount: Account;
}

export function useAccounts() {
  const accountsError = ref<string | null>(null);

  // Query for active accounts
  const {
    result: accountsResult,
    loading: accountsLoading,
    error: accountsQueryError,
    refetch: refetchAccounts,
  } = useQuery<GetAccountsResponse>(GET_ACCOUNTS);

  // Create account mutation
  const {
    mutate: createAccountMutation,
    loading: createAccountLoading,
    error: createAccountError,
  } = useMutation<CreateAccountResponse, { input: CreateAccountInput }>(CREATE_ACCOUNT);

  // Update account mutation
  const {
    mutate: updateAccountMutation,
    loading: updateAccountLoading,
    error: updateAccountError,
  } = useMutation<UpdateAccountResponse, { id: string; input: UpdateAccountInput }>(UPDATE_ACCOUNT);

  // Archive account mutation
  const {
    mutate: archiveAccountMutation,
    loading: archiveAccountLoading,
    error: archiveAccountError,
  } = useMutation<ArchiveAccountResponse, { id: string }>(ARCHIVE_ACCOUNT);

  // Watch for query errors
  watch(accountsQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Accounts query failed:", error);
      accountsError.value = error.message || "Failed to fetch accounts";
    }
  });

  // Watch for mutation errors
  watch(
    [createAccountError, updateAccountError, archiveAccountError],
    ([createError, updateError, archiveError]) => {
      const error = createError || updateError || archiveError;
      if (error) {
        console.error("Account mutation failed:", error);
        accountsError.value = error.message || "Account operation failed";
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
      accountsError.value = error instanceof Error ? error.message : "Failed to create account";
      return null;
    }
  };

  // Update account function
  const updateAccount = async (id: string, input: UpdateAccountInput): Promise<Account | null> => {
    try {
      accountsError.value = null;
      const result = await updateAccountMutation({ id, input });
      if (result?.data?.updateAccount) {
        await refetchAccounts();
        return result.data.updateAccount;
      }
      return null;
    } catch (error) {
      console.error("Error updating account:", error);
      accountsError.value = error instanceof Error ? error.message : "Failed to update account";
      return null;
    }
  };

  // Archive account function
  const archiveAccount = async (id: string): Promise<Account | null> => {
    try {
      accountsError.value = null;
      const result = await archiveAccountMutation({ id });
      if (result?.data?.archiveAccount) {
        await refetchAccounts();
        return result.data.archiveAccount;
      }
      return null;
    } catch (error) {
      console.error("Error archiving account:", error);
      accountsError.value = error instanceof Error ? error.message : "Failed to archive account";
      return null;
    }
  };

  return {
    // Data
    accounts: accountsResult,

    // Loading states
    accountsLoading,
    createAccountLoading,
    updateAccountLoading,
    archiveAccountLoading,

    // Error states
    accountsError,
    accountsQueryError,
    createAccountError,
    updateAccountError,
    archiveAccountError,

    // Functions
    createAccount,
    updateAccount,
    archiveAccount,
    refetchAccounts,
  };
}
