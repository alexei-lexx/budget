import { computed } from "vue";
import {
  useGetStarredTrendsQuery,
  useStarTrendMutation,
  useUnstarTrendMutation,
  type StarredTrend,
} from "@/__generated__/vue-apollo";
import type { TrendSelection } from "./useExpenseTrend";

// Re-export type for consumers of this composable
export type { StarredTrend };

/**
 * Loads the user's starred Trends filter configurations and lets the caller
 * star/unstar a configuration, or find the saved configuration matching a selection.
 */
export function useStarredTrends() {
  const {
    result: starredTrendsResult,
    loading: starredTrendsLoading,
    refetch: refetchStarredTrends,
  } = useGetStarredTrendsQuery();

  const starredTrends = computed(() => starredTrendsResult.value?.starredTrends ?? []);

  const { mutate: starTrendMutation, loading: starLoading } = useStarTrendMutation();
  const { mutate: unstarTrendMutation, loading: unstarLoading } = useUnstarTrendMutation();

  function matchingStarredTrend(selection: TrendSelection): StarredTrend | null {
    const selectionCategoryIds = new Set(selection.categoryIds);

    return (
      starredTrends.value.find(
        (starredTrend) =>
          starredTrend.periodUnit === selection.periodUnit &&
          starredTrend.lookback === selection.lookback &&
          starredTrend.currency === selection.currency &&
          starredTrend.includeUncategorized === selection.includeUncategorized &&
          starredTrend.categoryIds.length === selectionCategoryIds.size &&
          starredTrend.categoryIds.every((categoryId) => selectionCategoryIds.has(categoryId)),
      ) ?? null
    );
  }

  async function star(selection: TrendSelection): Promise<void> {
    await starTrendMutation({
      input: {
        periodUnit: selection.periodUnit,
        lookback: selection.lookback,
        currency: selection.currency,
        categoryIds: selection.categoryIds,
        includeUncategorized: selection.includeUncategorized,
      },
    });
    await refetchStarredTrends();
  }

  async function unstar(id: string): Promise<void> {
    await unstarTrendMutation({ id });
    await refetchStarredTrends();
  }

  return {
    starredTrends,
    starredTrendsLoading,
    starLoading,
    unstarLoading,
    matchingStarredTrend,
    star,
    unstar,
  };
}
