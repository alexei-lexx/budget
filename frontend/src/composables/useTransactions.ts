import { ref, watch, computed, unref, type Ref } from "vue";
import type { ApolloError } from "@apollo/client";
import {
  useGetTransactionsPaginatedQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  GetTransactionsPaginatedDocument,
  type TransactionType,
  type Transaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionEdge,
  type TransactionConnection,
  type TransactionFilterInput,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type {
  TransactionType,
  Transaction,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionEdge,
  TransactionConnection,
  TransactionFilterInput,
};

export function useTransactions(options?: {
  filters?: Ref<TransactionFilterInput | null>;
  onTransactionCreated?: () => Promise<void> | void;
  onTransactionUpdated?: () => Promise<void> | void;
  onTransactionDeleted?: () => Promise<void> | void;
}) {
  const transactionsError = ref<string | null>(null);

  // Pagination state
  const endCursor = ref<string | null>(null);
  const hasNextPage = ref<boolean>(false);
  const totalCount = ref<number>(0);
  const loadMoreLoading = ref<boolean>(false);
  const loadMoreError = ref<string | null>(null);

  // Track if we've ever loaded data (to distinguish true initial load from empty table)
  const hasEverLoaded = ref<boolean>(false);

  // Accumulative transaction list - maintain all loaded transactions
  const allLoadedTransactions = ref<Transaction[]>([]);

  // Query for paginated transactions
  const {
    result: paginatedResult,
    loading: paginatedLoading,
    error: paginatedQueryError,
    refetch: refetchPaginatedTransactions,
  } = useGetTransactionsPaginatedQuery(
    () => ({
      pagination: {},
      filters: unref(options?.filters) || undefined,
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
  } = useCreateTransactionMutation();

  // Update transaction mutation
  const {
    mutate: updateTransactionMutation,
    loading: updateTransactionLoading,
    error: updateTransactionError,
  } = useUpdateTransactionMutation();

  // Delete transaction mutation
  const {
    mutate: deleteTransactionMutation,
    loading: deleteTransactionLoading,
    error: deleteTransactionError,
  } = useDeleteTransactionMutation();

  // Watch for paginated query results to update pagination state and transaction list
  watch(
    paginatedResult,
    (result) => {
      if (result?.transactions) {
        const connection = result.transactions;
        const transactions = connection.edges.map((edge) => edge.node);

        // Update pagination state
        endCursor.value = connection.pageInfo.endCursor || null;
        hasNextPage.value = connection.pageInfo.hasNextPage;
        totalCount.value = connection.totalCount;

        // Determine if this is initial load, refetch, or load more
        const isInitialLoad = !hasEverLoaded.value;
        const isLoadMore =
          hasEverLoaded.value &&
          connection.pageInfo.endCursor &&
          endCursor.value &&
          connection.pageInfo.endCursor !== endCursor.value;

        if (isInitialLoad) {
          // Replace the entire list for true initial load (first time ever loading)
          allLoadedTransactions.value = transactions;
          hasEverLoaded.value = true;
        } else if (isLoadMore) {
          // This is a load more operation - append new transactions
          const existingIds = new Set(allLoadedTransactions.value.map((t: Transaction) => t.id));
          const newTransactions = transactions.filter((t: Transaction) => !existingIds.has(t.id));
          allLoadedTransactions.value = [...allLoadedTransactions.value, ...newTransactions];
        } else {
          // This is a refetch - replace the entire list with fresh data from server
          allLoadedTransactions.value = transactions;
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
        // Update total count
        totalCount.value = totalCount.value + 1;

        // Trigger cache invalidation callback
        if (options?.onTransactionCreated) {
          try {
            await options.onTransactionCreated();
          } catch (error) {
            console.warn("Error in onTransactionCreated callback:", error);
          }
        }

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
    input: Omit<UpdateTransactionInput, "id">,
  ): Promise<Transaction | null> => {
    try {
      transactionsError.value = null;
      const result = await updateTransactionMutation({ input: { id, ...input } });
      if (result?.data?.updateTransaction) {
        // Update the transaction in the list
        const updatedTransaction = result.data.updateTransaction;
        const index = allLoadedTransactions.value.findIndex((t: Transaction) => t.id === id);
        if (index !== -1) {
          allLoadedTransactions.value[index] = updatedTransaction;
        }

        // Trigger cache invalidation callback
        if (options?.onTransactionUpdated) {
          try {
            await options.onTransactionUpdated();
          } catch (error) {
            console.warn("Error in onTransactionUpdated callback:", error);
          }
        }

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
        // Update total count
        totalCount.value = Math.max(0, totalCount.value - 1);

        // Trigger cache invalidation callback
        if (options?.onTransactionDeleted) {
          try {
            await options.onTransactionDeleted();
          } catch (error) {
            console.warn("Error in onTransactionDeleted callback:", error);
          }
        }

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
        query: GetTransactionsPaginatedDocument,
        variables: {
          pagination: {
            after: endCursor.value,
          },
          filters: unref(options?.filters) || undefined,
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

  // Helper function to update multiple transactions in the list
  const updateTransactionsInList = (updatedTransactions: Transaction[]) => {
    updatedTransactions.forEach((updatedTransaction) => {
      const index = allLoadedTransactions.value.findIndex(
        (t: Transaction) => t.id === updatedTransaction.id,
      );
      if (index !== -1) {
        allLoadedTransactions.value[index] = updatedTransaction;
      }
    });
  };

  // Helper function to add new transactions to the top of the list
  const addTransactionsToList = (newTransactions: Transaction[]) => {
    // Add new transactions to the beginning of the list (newest first)
    allLoadedTransactions.value = [...newTransactions, ...allLoadedTransactions.value];
    // Update total count
    totalCount.value = totalCount.value + newTransactions.length;
  };

  // Helper function to remove multiple transactions from the list
  const removeTransactionsFromList = (transactionIds: string[]) => {
    const initialCount = allLoadedTransactions.value.length;
    allLoadedTransactions.value = allLoadedTransactions.value.filter(
      (t: Transaction) => !transactionIds.includes(t.id),
    );
    const removedCount = initialCount - allLoadedTransactions.value.length;
    // Update total count
    totalCount.value = Math.max(0, totalCount.value - removedCount);
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
    updateTransactionsInList,
    addTransactionsToList,
    removeTransactionsFromList,
  };
}
