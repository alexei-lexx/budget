import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch, computed } from "vue";
import { GET_TRANSACTIONS_PAGINATED } from "@/graphql/queries";
import { CREATE_TRANSACTION, UPDATE_TRANSACTION, DELETE_TRANSACTION } from "@/graphql/mutations";
import type { ApolloError } from "@apollo/client/core";
import type { CategoryType } from "./useCategories";
import type { PaginationInput, Edge, Connection } from "@/types/pagination";

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
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  description?: string | null;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string | null;
  type?: TransactionType;
  amount?: number;
  date?: string;
  description?: string | null;
}

// Transaction-specific pagination types using shared generic types
export type TransactionEdge = Edge<Transaction>;
export type TransactionConnection = Connection<Transaction>;

interface GetTransactionsPaginatedResponse {
  transactions: TransactionConnection;
}

interface CreateTransactionResponse {
  createTransaction: Transaction;
}

interface UpdateTransactionResponse {
  updateTransaction: Transaction;
}

interface DeleteTransactionResponse {
  deleteTransaction: Transaction;
}

export function useTransactions() {
  const transactionsError = ref<string | null>(null);

  // Pagination state
  const endCursor = ref<string | null>(null);
  const hasNextPage = ref<boolean>(false);
  const totalCount = ref<number>(0);
  const loadMoreLoading = ref<boolean>(false);
  const loadMoreError = ref<string | null>(null);

  // Accumulative transaction list - maintain all loaded transactions
  const allLoadedTransactions = ref<Transaction[]>([]);

  // Query for paginated transactions
  const {
    result: paginatedResult,
    loading: paginatedLoading,
    error: paginatedQueryError,
    refetch: refetchPaginatedTransactions,
  } = useQuery<GetTransactionsPaginatedResponse, { pagination?: PaginationInput }>(
    GET_TRANSACTIONS_PAGINATED,
    () => ({
      pagination: {},
    }),
    () => ({
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    }),
  );

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

  // Delete transaction mutation
  const {
    mutate: deleteTransactionMutation,
    loading: deleteTransactionLoading,
    error: deleteTransactionError,
  } = useMutation<DeleteTransactionResponse, { id: string }>(DELETE_TRANSACTION);

  // Watch for paginated query results to update pagination state and transaction list
  watch(
    paginatedResult,
    (result, previousResult) => {
      if (result?.transactions) {
        const connection = result.transactions;
        const transactions = connection.edges.map((edge) => edge.node);

        // Update pagination state
        endCursor.value = connection.pageInfo.endCursor || null;
        hasNextPage.value = connection.pageInfo.hasNextPage;
        totalCount.value = connection.totalCount;

        // Determine if this is initial load or load more
        const isInitialLoad =
          !previousResult?.transactions || allLoadedTransactions.value.length === 0;

        if (isInitialLoad) {
          // Replace the entire list
          allLoadedTransactions.value = transactions;
        } else {
          // This is a load more operation - append new transactions
          const existingIds = new Set(allLoadedTransactions.value.map((t: Transaction) => t.id));
          const newTransactions = transactions.filter((t: Transaction) => !existingIds.has(t.id));
          allLoadedTransactions.value = [...allLoadedTransactions.value, ...newTransactions];
        }
      }
    },
    { immediate: true },
  );

  // Watch for paginated query errors
  watch(paginatedQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Paginated transactions query failed:", error);
      transactionsError.value = error.message || "Failed to fetch transactions";
    }
  });

  // Watch for mutation errors
  watch(
    [createTransactionError, updateTransactionError, deleteTransactionError],
    ([createError, updateError, deleteError]) => {
      const error = createError || updateError || deleteError;
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
        // Add the new transaction to the beginning of the list
        const newTransaction = result.data.createTransaction;
        allLoadedTransactions.value = [newTransaction, ...allLoadedTransactions.value];
        // Also refetch to ensure we have the latest data structure
        await refetchPaginatedTransactions();
        return newTransaction;
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
        // Update the transaction in the list
        const updatedTransaction = result.data.updateTransaction;
        const index = allLoadedTransactions.value.findIndex((t: Transaction) => t.id === id);
        if (index !== -1) {
          allLoadedTransactions.value[index] = updatedTransaction;
        }
        // Also refetch to ensure we have the latest data structure
        await refetchPaginatedTransactions();
        return updatedTransaction;
      }
      return null;
    } catch (error) {
      console.error("Error updating transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to update transaction";
      return null;
    }
  };

  // Delete transaction function
  const deleteTransaction = async (id: string): Promise<Transaction | null> => {
    try {
      transactionsError.value = null;
      const result = await deleteTransactionMutation({ id });
      if (result?.data?.deleteTransaction) {
        // Remove the transaction from the list
        allLoadedTransactions.value = allLoadedTransactions.value.filter(
          (t: Transaction) => t.id !== id,
        );
        // Also refetch to ensure we have the latest data structure
        await refetchPaginatedTransactions();
        return result.data.deleteTransaction;
      }
      return null;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      transactionsError.value =
        error instanceof Error ? error.message : "Failed to delete transaction";
      return null;
    }
  };

  // Load more transactions function (for pagination)
  const loadMoreTransactions = async (): Promise<boolean> => {
    if (!hasNextPage.value || loadMoreLoading.value) {
      return false;
    }

    try {
      loadMoreLoading.value = true;
      loadMoreError.value = null;

      // Make a separate query call instead of using fetchMore
      const { apolloClient } = await import("@/apollo");
      const result = await apolloClient.query({
        query: GET_TRANSACTIONS_PAGINATED,
        variables: {
          pagination: {
            after: endCursor.value,
          },
        },
        fetchPolicy: "network-only", // Always fetch from network
      });

      if (result.data?.transactions) {
        const connection = result.data.transactions;
        const newTransactions = connection.edges.map((edge: TransactionEdge) => edge.node);

        // Update pagination state
        endCursor.value = connection.pageInfo.endCursor || null;
        hasNextPage.value = connection.pageInfo.hasNextPage;
        totalCount.value = connection.totalCount;

        // Manually append new transactions
        const existingIds = new Set(allLoadedTransactions.value.map((t: Transaction) => t.id));
        const uniqueNewTransactions = newTransactions.filter(
          (t: Transaction) => !existingIds.has(t.id),
        );
        allLoadedTransactions.value = [...allLoadedTransactions.value, ...uniqueNewTransactions];
      }

      return true;
    } catch (error) {
      console.error("Error loading more transactions:", error);
      loadMoreError.value =
        error instanceof Error ? error.message : "Failed to load more transactions";
      return false;
    } finally {
      loadMoreLoading.value = false;
    }
  };

  return {
    // Paginated data
    paginatedTransactions: computed(() => allLoadedTransactions.value),
    endCursor: computed(() => endCursor.value),
    hasNextPage: computed(() => hasNextPage.value),
    totalCount: computed(() => totalCount.value),

    // Loading states
    paginatedLoading,
    loadMoreLoading: computed(() => loadMoreLoading.value),
    createTransactionLoading,
    updateTransactionLoading,
    deleteTransactionLoading,

    // Error states
    transactionsError,
    loadMoreError: computed(() => loadMoreError.value),
    paginatedQueryError,
    createTransactionError,
    updateTransactionError,
    deleteTransactionError,

    // Functions
    createTransaction,
    updateTransaction,
    deleteTransaction,
    loadMoreTransactions,
    refetchTransactions: refetchPaginatedTransactions,
  };
}
