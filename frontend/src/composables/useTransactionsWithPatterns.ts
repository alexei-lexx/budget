import { watch, type Ref } from "vue";
import { useTransactions } from "./useTransactions";
import { useTransactionPatterns } from "./useTransactionPatterns";
import type { TransactionPatternType } from "@/__generated__/vue-apollo";

/**
 * Combined composable that manages both transactions and patterns with automatic cache invalidation.
 * When transactions are created, updated, or deleted, the patterns cache is automatically invalidated.
 */
export function useTransactionsWithPatterns(transactionType: Ref<TransactionPatternType>) {
  // Transaction patterns composable
  const patterns = useTransactionPatterns(transactionType);

  // Transactions composable with cache invalidation callbacks
  const transactions = useTransactions({
    onTransactionCreated: async () => {
      // Invalidate patterns cache when a new transaction is created
      await patterns.invalidatePatterns();
    },
    onTransactionUpdated: async () => {
      // Invalidate patterns cache when a transaction is updated
      await patterns.invalidatePatterns();
    },
    onTransactionDeleted: async () => {
      // Invalidate patterns cache when a transaction is deleted
      await patterns.invalidatePatterns();
    },
  });

  // Watch for pattern query errors and handle them
  watch(
    patterns.patternsQueryError,
    (error) => {
      patterns.handleQueryError(error);
    },
    { immediate: true },
  );

  return {
    // Transaction patterns
    patterns: patterns.patterns,
    patternsLoading: patterns.patternsLoading,
    patternsError: patterns.patternsError,
    refetchPatterns: patterns.refetchPatterns,
    invalidatePatterns: patterns.invalidatePatterns,

    // Transactions (all original functionality)
    ...transactions,
  };
}
