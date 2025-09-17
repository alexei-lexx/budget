import { ref, computed, watch, type Ref } from "vue";
import { useGetTransactionDescriptionSuggestionsQuery } from "@/__generated__/vue-apollo";

export interface DescriptionSuggestionsOptions {
  searchText: Ref<string>;
  debounceMs?: number;
  minSearchLength?: number;
}

export function useDescriptionSuggestions({
  searchText,
  debounceMs = 300,
  minSearchLength = 2,
}: DescriptionSuggestionsOptions) {
  const debouncedSearchText = ref("");
  let debounceTimeout: number | null = null;

  // Debounce the search text input
  // This prevents API calls on every keystroke, only when user pauses typing
  watch(
    searchText,
    (newSearchText) => {
      // If there's already a timer running, cancel it
      // This happens when user types before previous timer completes
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Set a new timer to update debouncedSearchText after delay
      // If user types again before this timer completes, it will be cancelled above
      debounceTimeout = window.setTimeout(() => {
        // This only runs if user stops typing for full debounceMs duration
        debouncedSearchText.value = newSearchText;
      }, debounceMs);
    },
    { immediate: true },
  );

  // Determine if we should query based on search text length
  const shouldQuery = computed(() => {
    return debouncedSearchText.value.length >= minSearchLength;
  });

  // Query for description suggestions
  const { result: suggestionsResult, loading: suggestionsLoading } =
    useGetTransactionDescriptionSuggestionsQuery(
      () => ({
        searchText: debouncedSearchText.value,
      }),
      () => ({
        fetchPolicy: "cache-first",
        notifyOnNetworkStatusChange: true,
        enabled: shouldQuery.value,
      }),
    );

  // Extract suggestions from query result
  const suggestions = computed(() => {
    if (!suggestionsResult.value?.transactionDescriptionSuggestions) {
      return [];
    }
    return suggestionsResult.value.transactionDescriptionSuggestions;
  });

  // Determine if suggestions dropdown should be visible
  const showSuggestions = computed(() => {
    return shouldQuery.value && suggestions.value.length > 0 && !suggestionsLoading.value;
  });

  return {
    // Data
    suggestions,

    // States
    showSuggestions,
    suggestionsLoading,
  };
}
