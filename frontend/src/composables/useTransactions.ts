import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch } from "vue";
import { GET_TRANSACTIONS } from "@/graphql/queries";
import { CREATE_TRANSACTION, UPDATE_TRANSACTION, ARCHIVE_TRANSACTION } from "@/graphql/mutations";
import type { ApolloError } from "@apollo/client/core";
import type { CategoryType } from "./useCategories";

export type TransactionType = CategoryType;

export interface Transaction {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD format
  description?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  amount?: number;
  date?: string;
  description?: string;
}

interface GetTransactionsResponse {
  transactions: Transaction[];
}

interface CreateTransactionResponse {
  createTransaction: Transaction;
}

interface UpdateTransactionResponse {
  updateTransaction: Transaction;
}

interface ArchiveTransactionResponse {
  archiveTransaction: Transaction;
}

export function useTransactions() {
  const transactionsError = ref<string | null>(null);

  // Query for transactions
  const {
    result: transactionsResult,
    loading: transactionsLoading,
    error: transactionsQueryError,
    refetch: refetchTransactions,
  } = useQuery<GetTransactionsResponse>(GET_TRANSACTIONS);

  // Create transaction mutation
  const {
    mutate: createTransactionMutation,
    loading: createTransactionLoading,
    error: createTransactionError,
  } = useMutation<CreateTransactionResponse, { input: CreateTransactionInput }>(CREATE_TRANSACTION);

  // Update transaction mutation
  const {
    mutate: updateTransactionMutation,
    loading: updateTransactionLoading,
    error: updateTransactionError,
  } = useMutation<UpdateTransactionResponse, { id: string; input: UpdateTransactionInput }>(
    UPDATE_TRANSACTION,
  );

  // Archive transaction mutation
  const {
    mutate: archiveTransactionMutation,
    loading: archiveTransactionLoading,
    error: archiveTransactionError,
  } = useMutation<ArchiveTransactionResponse, { id: string }>(ARCHIVE_TRANSACTION);

  // Watch for query errors
  watch(transactionsQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Transactions query failed:", error);
      transactionsError.value = error.message || "Failed to fetch transactions";
    }
  });

  // Watch for mutation errors
  watch(
    [createTransactionError, updateTransactionError, archiveTransactionError],
    ([createError, updateError, archiveError]) => {
      const error = createError || updateError || archiveError;
      if (error) {
        console.error("Transaction mutation failed:", error);
        transactionsError.value = error.message || "Transaction operation failed";
      }
    },
  );

  // Create transaction function
  const createTransaction = async (input: CreateTransactionInput): Promise<Transaction | null> => {
    try {
      transactionsError.value = null;
      const result = await createTransactionMutation({ input });
      if (result?.data?.createTransaction) {
        await refetchTransactions();
        return result.data.createTransaction;
      }
      return null;
    } catch (error) {
      console.error("Error creating transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to create transaction";
      return null;
    }
  };

  // Update transaction function
  const updateTransaction = async (
    id: string,
    input: UpdateTransactionInput,
  ): Promise<Transaction | null> => {
    try {
      transactionsError.value = null;
      const result = await updateTransactionMutation({ id, input });
      if (result?.data?.updateTransaction) {
        await refetchTransactions();
        return result.data.updateTransaction;
      }
      return null;
    } catch (error) {
      console.error("Error updating transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to update transaction";
      return null;
    }
  };

  // Archive transaction function
  const archiveTransaction = async (id: string): Promise<Transaction | null> => {
    try {
      transactionsError.value = null;
      const result = await archiveTransactionMutation({ id });
      if (result?.data?.archiveTransaction) {
        await refetchTransactions();
        return result.data.archiveTransaction;
      }
      return null;
    } catch (error) {
      console.error("Error archiving transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to archive transaction";
      return null;
    }
  };

  return {
    // Data
    transactions: transactionsResult,

    // Loading states
    transactionsLoading,
    createTransactionLoading,
    updateTransactionLoading,
    archiveTransactionLoading,

    // Error states
    transactionsError,
    transactionsQueryError,
    createTransactionError,
    updateTransactionError,
    archiveTransactionError,

    // Functions
    createTransaction,
    updateTransaction,
    archiveTransaction,
    refetchTransactions,
  };
}
