import { computed } from "vue";
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
  const {
    result: trendPresetsResult,
    loading: trendPresetsLoading,
    refetch: refetchTrendPresets,
  } = useGetTrendPresetsQuery();

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
  }

  async function unstar(id: string): Promise<void> {
    await deleteTrendPresetMutation({ id });
    await refetchTrendPresets();
  }

  return {
    trendPresets,
    trendPresetsLoading,
    starLoading,
    unstarLoading,
    matchingTrendPreset,
    star,
    unstar,
  };
}
