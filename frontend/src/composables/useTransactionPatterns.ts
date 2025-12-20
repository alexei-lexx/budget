import { ref, computed, type Ref } from "vue";
import type { ApolloError } from "@apollo/client";
import {
  useGetTransactionPatternsQuery,
  type TransactionPatternType,
  type TransactionPattern,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type { TransactionPatternType, TransactionPattern };

export function useTransactionPatterns(transactionType: Ref<TransactionPatternType>) {
  const patternsError = ref<string | null>(null);

  // Query for transaction patterns based on type
  const {
    result: patternsResult,
    loading: patternsLoading,
    error: patternsQueryError,
    refetch: refetchPatterns,
  } = useGetTransactionPatternsQuery(
    () => ({
      type: transactionType.value,
    }),
    () => ({
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
      enabled: !!transactionType.value,
    }),
  );

  // Extract patterns from query result
  const patterns = computed(() => {
    if (!patternsResult.value?.transactionPatterns) {
      return [];
    }
    return patternsResult.value.transactionPatterns;
  });

  // Watch for query errors
  const handleQueryError = (error: ApolloError | null) => {
    if (error) {
      console.error("Transaction patterns query failed:", error);
      patternsError.value = error.message || "Failed to fetch transaction patterns";
    } else {
      patternsError.value = null;
    }
  };

  // Function to invalidate and refetch patterns
  const invalidatePatterns = async (): Promise<void> => {
    try {
      patternsError.value = null;
      await refetchPatterns();
    } catch (error) {
      console.error("Error refetching transaction patterns:", error);
      patternsError.value =
        error instanceof Error ? error.message : "Failed to refetch transaction patterns";
    }
  };

  return {
    // Data
    patterns,

    // Loading states
    patternsLoading,

    // Error states
    patternsError,
    patternsQueryError,

    // Functions
    refetchPatterns,
    invalidatePatterns,
    handleQueryError,
  };
}
