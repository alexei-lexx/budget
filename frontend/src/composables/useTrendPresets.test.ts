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

  describe("matchingTrendPreset", () => {
    const { matchingTrendPreset } = useTrendPresets();

    // Happy path

    it("matches no preset", () => {
      // Arrange
      result.value.trendPresets = [];

      // Act
      const match = matchingTrendPreset({
        categoryIds: [],
        currency: "EUR",
        lookback: 3,
        periodUnit: "WEEK",
      });

      // Assert
      expect(match).toBeNull();
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(match).toEqual(preset);
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(match).toBeNull();
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(match).toBeNull();
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(match).toEqual(preset);
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(match).toBeNull();
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(match).toEqual(preset);
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: true,
        });

        // Assert
        expect(match).toBeNull();
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
        const match = matchingTrendPreset({
          ...shared,
          includeUncategorized: undefined,
        });

        // Assert
        expect(match).toEqual(preset);
      });
    });
  });
});
