import { computed, ref, watch } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError, resolveErrorMessage } from "@/utils/graphqlError";
import {
  useCreateTrendPresetMutation,
  useDeleteTrendPresetMutation,
  useGetTrendPresetsQuery,
  type TrendPreset,
} from "@/__generated__/vue-apollo";
import type { TrendSelection } from "./useExpenseTrend";

// Re-export type for consumers of this composable
export type { TrendPreset };

/**
 * Loads the user's saved Trends filter presets and lets the caller
 * star/unstar a configuration, or find the saved preset matching a selection.
 */
export function useTrendPresets() {
  const { t } = i18n.global;
  const trendPresetsError = ref<string | null>(null);

  const {
    result: trendPresetsResult,
    loading: trendPresetsLoading,
    error: trendPresetsQueryError,
    refetch: refetchTrendPresets,
  } = useGetTrendPresetsQuery();

  // Watch for query errors
  watch(trendPresetsQueryError, (error) => {
    if (error) {
      console.error("Trend presets query failed:", error);

      trendPresetsError.value = isInternalServerError(error)
        ? t("trends.errors.presetsFetchFailed")
        : error.message;
    }
  });

  const trendPresets = computed(() => trendPresetsResult.value?.trendPresets ?? []);

  const { mutate: createTrendPresetMutation, loading: starLoading } =
    useCreateTrendPresetMutation();
  const { mutate: deleteTrendPresetMutation, loading: unstarLoading } =
    useDeleteTrendPresetMutation();

  function matchingTrendPreset(selection: TrendSelection): TrendPreset | null {
    const selectionCategoryIds = new Set(selection.categoryIds);

    return (
      trendPresets.value.find(
        (trendPreset) =>
          trendPreset.periodUnit === selection.periodUnit &&
          trendPreset.lookback === selection.lookback &&
          trendPreset.currency === selection.currency &&
          Boolean(trendPreset.includeUncategorized) === Boolean(selection.includeUncategorized) &&
          trendPreset.categoryIds.length === selectionCategoryIds.size &&
          trendPreset.categoryIds.every((categoryId) => selectionCategoryIds.has(categoryId)),
      ) ?? null
    );
  }

  async function star(selection: TrendSelection): Promise<void> {
    try {
      trendPresetsError.value = null;

      await createTrendPresetMutation({
        input: {
          periodUnit: selection.periodUnit,
          lookback: selection.lookback,
          currency: selection.currency,
          categoryIds: selection.categoryIds,
          includeUncategorized: selection.includeUncategorized,
        },
      });
      await refetchTrendPresets();
    } catch (error) {
      console.error("Error starring trend preset:", error);

      trendPresetsError.value = resolveErrorMessage(error, t("trends.errors.starFailed"));
    }
  }

  async function unstar(id: string): Promise<void> {
    try {
      trendPresetsError.value = null;

      await deleteTrendPresetMutation({ id });
      await refetchTrendPresets();
    } catch (error) {
      console.error("Error unstarring trend preset:", error);

      trendPresetsError.value = resolveErrorMessage(error, t("trends.errors.unstarFailed"));
    }
  }

  return {
    // Data
    trendPresets,

    // Loading states
    trendPresetsLoading,
    starLoading,
    unstarLoading,

    // Error state
    trendPresetsError,

    // Functions
    matchingTrendPreset,
    star,
    unstar,
  };
}
