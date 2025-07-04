import { useMutation, useQuery } from "@vue/apollo-composable";
import { ref, watch, computed } from "vue";
import { GET_TRANSACTIONS, GET_TRANSACTIONS_PAGINATED } from "@/graphql/queries";
import { CREATE_TRANSACTION, UPDATE_TRANSACTION, ARCHIVE_TRANSACTION } from "@/graphql/mutations";
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

interface GetTransactionsResponse {
  transactions: Transaction[];
}

interface GetTransactionsPaginatedResponse {
  transactions: TransactionConnection;
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

  // Pagination state
  const endCursor = ref<string | null>(null);
  const hasNextPage = ref<boolean>(false);
  const totalCount = ref<number>(0);
  const loadMoreLoading = ref<boolean>(false);
  const loadMoreError = ref<string | null>(null);

  // Query for transactions (existing non-paginated)
  const {
    result: transactionsResult,
    loading: transactionsLoading,
    error: transactionsQueryError,
    refetch: refetchTransactions,
  } = useQuery<GetTransactionsResponse>(GET_TRANSACTIONS);

  // Query for paginated transactions (new)
  const {
    result: paginatedResult,
    loading: paginatedLoading,
    error: paginatedQueryError,
    fetchMore,
  } = useQuery<GetTransactionsPaginatedResponse, { pagination?: PaginationInput }>(
    GET_TRANSACTIONS_PAGINATED,
    () => ({
      pagination: {},
    }),
    () => ({
      fetchPolicy: "cache-and-network",
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

  // Archive transaction mutation
  const {
    mutate: archiveTransactionMutation,
    loading: archiveTransactionLoading,
    error: archiveTransactionError,
  } = useMutation<ArchiveTransactionResponse, { id: string }>(ARCHIVE_TRANSACTION);

  // Watch for paginated query results to update pagination state
  watch(
    paginatedResult,
    (result) => {
      if (result?.transactions) {
        const connection = result.transactions;

        // Update pagination state
        endCursor.value = connection.pageInfo.endCursor || null;
        hasNextPage.value = connection.pageInfo.hasNextPage;
        totalCount.value = connection.totalCount;
      }
    },
    { immediate: true },
  );

  // Watch for query errors
  watch(transactionsQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Transactions query failed:", error);
      transactionsError.value = error.message || "Failed to fetch transactions";
    }
  });

  // Watch for paginated query errors
  watch(paginatedQueryError, (error: ApolloError | null) => {
    if (error) {
      console.error("Paginated transactions query failed:", error);
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

  // Load more transactions function (for pagination)
  const loadMoreTransactions = async (): Promise<boolean> => {
    if (!hasNextPage.value || loadMoreLoading.value) {
      return false;
    }

    try {
      loadMoreLoading.value = true;
      loadMoreError.value = null;

      const result = await fetchMore({
        variables: {
          pagination: {
            after: endCursor.value,
          },
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult?.transactions) {
            return previousResult;
          }

          const newConnection = fetchMoreResult.transactions;
          const previousConnection = previousResult.transactions;

          // Merge the edges
          const mergedEdges = [...previousConnection.edges, ...newConnection.edges];

          // Return merged result
          return {
            transactions: {
              ...newConnection,
              edges: mergedEdges,
            },
          };
        },
      });

      return !!result;
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
    // Data (backward compatible)
    transactions: computed(() => transactionsResult.value?.transactions || []),

    // Paginated data (new)
    paginatedTransactions: computed(
      () => paginatedResult.value?.transactions?.edges?.map((edge) => edge.node) || [],
    ),
    endCursor: computed(() => endCursor.value),
    hasNextPage: computed(() => hasNextPage.value),
    totalCount: computed(() => totalCount.value),

    // Loading states
    transactionsLoading,
    paginatedLoading,
    loadMoreLoading: computed(() => loadMoreLoading.value),
    createTransactionLoading,
    updateTransactionLoading,
    archiveTransactionLoading,

    // Error states
    transactionsError,
    loadMoreError: computed(() => loadMoreError.value),
    transactionsQueryError,
    paginatedQueryError,
    createTransactionError,
    updateTransactionError,
    archiveTransactionError,

    // Functions
    createTransaction,
    updateTransaction,
    archiveTransaction,
    loadMoreTransactions,
    refetchTransactions,
  };
}
