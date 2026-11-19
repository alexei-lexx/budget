import { describe, it, expect, beforeEach, vi } from "vitest";
import { TrendPreset, useTrendPresets } from "./useTrendPresets";
import { ref } from "vue";

vi.mock("@/__generated__/vue-apollo", () => ({
  useGetTrendPresetsQuery: () => ({
    result,
    loading: ref(false),
    refetch: vi.fn(),
  }),

  useCreateTrendPresetMutation: () => ({
    mutate: vi.fn(),
    loading: ref(false),
  }),

  useDeleteTrendPresetMutation: () => ({
    mutate: vi.fn(),
    loading: ref(false),
  }),
}));

const result = ref<{ trendPresets: TrendPreset[] }>({
  trendPresets: [],
});

describe("useTrendPresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matchingTrendPresets", () => {
    const { matchingTrendPresets } = useTrendPresets();

    // Happy path

    it("matches no preset", () => {
      // Arrange
      result.value.trendPresets = [
        {
          id: "preset-1",
          categoryIds: [],
          currency: "USD",
          lookback: 3,
          periodUnit: "WEEK",
        },
      ];

      // Act
      const matches = matchingTrendPresets({
        categoryIds: [],
        currency: "EUR",
        lookback: 3,
        periodUnit: "WEEK",
      });

      // Assert
      expect(matches).toEqual([]);
    });

    it("matches one preset", () => {
      // Arrange
      const matchingPreset: TrendPreset = {
        id: "preset-1",
        categoryIds: ["category-1"],
        currency: "EUR",
        lookback: 6,
        periodUnit: "MONTH",
      };
      const otherPreset: TrendPreset = {
        id: "preset-2",
        categoryIds: ["category-1"],
        currency: "EUR",
        lookback: 12,
        periodUnit: "MONTH",
      };
      result.value.trendPresets = [matchingPreset, otherPreset];

      // Act
      const matches = matchingTrendPresets({
        categoryIds: ["category-1"],
        currency: "EUR",
        lookback: 6,
        periodUnit: "MONTH",
      });

      // Assert
      expect(matches).toEqual([matchingPreset]);
    });

    it("matches all identical presets", () => {
      // Arrange
      const shared: Omit<TrendPreset, "id" | "includeUncategorized"> = {
        categoryIds: ["category-1"],
        currency: "EUR",
        lookback: 6,
        periodUnit: "MONTH",
      };
      const firstPreset: TrendPreset = { ...shared, id: "preset-1" };
      const secondPreset: TrendPreset = { ...shared, id: "preset-2" };
      result.value.trendPresets = [firstPreset, secondPreset];

      // Act
      const matches = matchingTrendPresets(shared);

      // Assert
      expect(matches).toEqual([firstPreset, secondPreset]);
    });

    it("matches categories in different order", () => {
      // Arrange
      const preset: TrendPreset = {
        id: "preset-1",
        categoryIds: ["category-1", "category-2"],
        currency: "EUR",
        lookback: 6,
        periodUnit: "MONTH",
      };
      result.value.trendPresets = [preset];

      // Act
      const matches = matchingTrendPresets({
        categoryIds: ["category-2", "category-1"],
        currency: "EUR",
        lookback: 6,
        periodUnit: "MONTH",
      });

      // Assert
      expect(matches).toEqual([preset]);
    });
  });
});
