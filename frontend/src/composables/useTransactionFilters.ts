import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { TransactionFilterInput, TransactionType } from "@/__generated__/graphql-types";

export interface TransactionFiltersState {
  // UI State (selected but not yet applied)
  selectedAccountIds: Ref<string[]>;
  selectedCategoryIds: Ref<string[]>;
  includeUncategorized: Ref<boolean>;
  dateAfter: Ref<string | null>;
  dateBefore: Ref<string | null>;
  selectedTypes: Ref<TransactionType[]>;

  // Query State (actually applied)
  appliedFilters: Ref<TransactionFilterInput | null>;

  // Computed
  hasSelectedFilters: ComputedRef<boolean>;
  hasAppliedFilters: ComputedRef<boolean>;

  // Methods
  applyFilters: () => void;
  clearFilters: () => void;
  resetToApplied: () => void;
}

export function useTransactionFilters(): TransactionFiltersState {
  // UI State
  const selectedAccountIds = ref<string[]>([]);
  const selectedCategoryIds = ref<string[]>([]);
  const includeUncategorized = ref(false);
  const dateAfter = ref<string | null>(null);
  const dateBefore = ref<string | null>(null);
  const selectedTypes = ref<TransactionType[]>([]);

  // Query State
  const appliedFilters = ref<TransactionFilterInput | null>(null);

  // Computed
  const hasSelectedFilters = computed(() => {
    return (
      selectedAccountIds.value.length > 0 ||
      selectedCategoryIds.value.length > 0 ||
      includeUncategorized.value ||
      dateAfter.value !== null ||
      dateBefore.value !== null ||
      selectedTypes.value.length > 0
    );
  });

  const hasAppliedFilters = computed(() => {
    return appliedFilters.value !== null;
  });

  // Apply selected filters to query
  function applyFilters() {
    const hasFilters = hasSelectedFilters.value;

    appliedFilters.value = hasFilters
      ? {
          accountIds: selectedAccountIds.value.length > 0 ? selectedAccountIds.value : undefined,
          categoryIds: selectedCategoryIds.value.length > 0 ? selectedCategoryIds.value : undefined,
          includeUncategorized: includeUncategorized.value || undefined,
          dateAfter: dateAfter.value || undefined,
          dateBefore: dateBefore.value || undefined,
          types: selectedTypes.value.length > 0 ? selectedTypes.value : undefined,
        }
      : null;
  }

  // Clear all selected filters
  function clearFilters() {
    selectedAccountIds.value = [];
    selectedCategoryIds.value = [];
    includeUncategorized.value = false;
    dateAfter.value = null;
    dateBefore.value = null;
    selectedTypes.value = [];
  }

  // Reset selected to match applied (cancel changes)
  function resetToApplied() {
    if (appliedFilters.value) {
      selectedAccountIds.value = appliedFilters.value.accountIds || [];
      selectedCategoryIds.value = appliedFilters.value.categoryIds || [];
      includeUncategorized.value = appliedFilters.value.includeUncategorized || false;
      dateAfter.value = appliedFilters.value.dateAfter || null;
      dateBefore.value = appliedFilters.value.dateBefore || null;
      selectedTypes.value = appliedFilters.value.types || [];
    } else {
      clearFilters();
    }
  }

  return {
    selectedAccountIds,
    selectedCategoryIds,
    includeUncategorized,
    dateAfter,
    dateBefore,
    selectedTypes,
    appliedFilters,
    hasSelectedFilters,
    hasAppliedFilters,
    applyFilters,
    clearFilters,
    resetToApplied,
  };
}
