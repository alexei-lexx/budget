import { ref, watch, computed, type Ref } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError } from "@/utils/graphqlError";
import {
  useGetTransactionPatternsQuery,
  type TransactionPatternType,
  type TransactionPattern,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type { TransactionPatternType, TransactionPattern };

export function useTransactionPatterns(transactionType: Ref<TransactionPatternType>) {
  const { t } = i18n.global;
  const patternsError = ref<string | null>(null);

  // Query for transaction patterns based on type
  const {
    result: patternsResult,
    loading: patternsLoading,
    error: patternsQueryError,
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
  watch(patternsQueryError, (error) => {
    if (error) {
      console.error("Transaction patterns query failed:", error);

      patternsError.value = isInternalServerError(error)
        ? t("transactions.errors.patternsFetchFailed")
        : error.message;
    }
  });

  return {
    // Data
    patterns,

    // Loading states
    patternsLoading,

    // Error state
    patternsError,
  };
}
