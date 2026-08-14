import { computed } from "vue";
import { useGetSupportedCurrenciesQuery } from "@/__generated__/vue-apollo";
import { i18n } from "@/plugins/i18n";

/**
 * Composable for managing currencies with error handling and fallbacks
 */
export function useCurrencies() {
  // Fetch supported currencies from GraphQL API
  const {
    result: currenciesResult,
    loading: currenciesLoading,
    error: currenciesError,
    refetch: refetchCurrencies,
  } = useGetSupportedCurrenciesQuery();

  // Transform currencies for v-autocomplete format
  const supportedCurrencies = computed(() => {
    if (currenciesResult.value?.supportedCurrencies) {
      return currenciesResult.value.supportedCurrencies.map((currency: string) => ({
        value: currency,
        title: currency,
      }));
    }
    // Return empty array while loading or on API error
    return [];
  });

  // Currency error state and messages
  const { t } = i18n.global;
  const hasError = computed(() => !!currenciesError.value);

  const errorMessage = computed(() => {
    if (currenciesError.value) {
      return t("accounts.form.currencyLoadError");
    }
    return null;
  });

  // Retry function for manual error recovery
  const retry = async () => {
    try {
      await refetchCurrencies();
    } catch (error) {
      console.error("Failed to retry currency fetch:", error);
    }
  };

  // Get currency list as simple array of codes
  const currencyCodes = computed(() => {
    return supportedCurrencies.value.map(
      (currency: { value: string; title: string }) => currency.value,
    );
  });

  // Get default currency (first in list)
  const defaultCurrency = computed(() => {
    return supportedCurrencies.value[0]?.value || "";
  });

  return {
    // Data
    supportedCurrencies,
    currencyCodes,
    defaultCurrency,

    // Loading states
    currenciesLoading,

    // Error handling
    hasError,
    errorMessage,

    // Actions
    retry,
  };
}
