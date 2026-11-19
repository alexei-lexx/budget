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

    describe("when includeUncategorized varies", () => {
      const shared: Omit<TrendPreset, "id" | "includeUncategorized"> = {
        categoryIds: [],
        currency: "EUR",
        lookback: 3,
        periodUnit: "WEEK",
      } as const;

      // Happy path

      it("matches when preset true and selection true", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: true,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(matches).toEqual([preset]);
      });

      it("does not match when preset true and selection undefined", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: true,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(matches).toEqual([]);
      });

      it("does not match when preset false and selection true", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: false,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(matches).toEqual([]);
      });

      it("matches when preset false and selection undefined", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: false,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(matches).toEqual([preset]);
      });

      it("does not match when preset null and selection true", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: null,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(matches).toEqual([]);
      });

      it("matches when preset null and selection undefined", () => {
        // Arrange
        // Simulates GraphQL response, where unset nullable field is `null`, not `undefined`
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: null,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(matches).toEqual([preset]);
      });

      it("does not match when preset undefined and selection true", () => {
        // Arrange
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: undefined,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(matches).toEqual([]);
      });

      it("matches when preset undefined and selection undefined", () => {
        // Arrange
        // Field type permits undefined even though GraphQL always sends null, never omits key
        const preset: TrendPreset = {
          ...shared,
          id: "preset-1",
          includeUncategorized: undefined,
        };
        result.value.trendPresets = [preset];

        // Act
        const matches = matchingTrendPresets({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(matches).toEqual([preset]);
      });
    });
  });
});
