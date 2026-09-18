import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import type { Category, TrendPreset } from "@/__generated__/vue-apollo";
import TrendPresetsList from "./TrendPresetsList.vue";

function createTrendPreset(
  overrides: Partial<TrendPreset> & Pick<TrendPreset, "periodUnit" | "lookback">,
): TrendPreset {
  return {
    id: crypto.randomUUID(),
    categoryIds: [],
    currency: "EUR",
    includeUncategorized: false,
    ...overrides,
  };
}

function createCategory(overrides: Partial<Category> & Pick<Category, "name">): Category {
  return {
    id: crypto.randomUUID(),
    excludeFromReports: false,
    type: "EXPENSE",
    ...overrides,
  };
}

describe("TrendPresetsList", () => {
  // Happy path

  it("hides list when given no presets", () => {
    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets: [], categories: [] } });

    // Assert
    expect(wrapper.findAll(".v-chip")).toHaveLength(0);
  });

  it("renders week preset", () => {
    // Arrange
    const trendPresets = [createTrendPreset({ periodUnit: "WEEK", lookback: 3 })];

    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

    // Assert
    expect(wrapper.find(".v-chip").text()).toEqual("all in last 3 weeks in EUR");
  });

  it("renders month preset", () => {
    // Arrange
    const trendPresets = [createTrendPreset({ periodUnit: "MONTH", lookback: 3 })];

    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

    // Assert
    expect(wrapper.find(".v-chip").text()).toEqual("all in last 3 months in EUR");
  });

  it("orders months before weeks", () => {
    // Arrange
    const trendPresets = [
      createTrendPreset({ periodUnit: "WEEK", lookback: 3 }),
      createTrendPreset({ periodUnit: "MONTH", lookback: 3 }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "all in last 3 months in EUR",
      "all in last 3 weeks in EUR",
    ]);
  });

  it("orders longer lookback before shorter", () => {
    // Arrange
    const trendPresets = [
      createTrendPreset({ periodUnit: "WEEK", lookback: 3 }),
      createTrendPreset({ periodUnit: "WEEK", lookback: 6 }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "all in last 6 weeks in EUR",
      "all in last 3 weeks in EUR",
    ]);
  });

  it("orders all before named categories", () => {
    // Arrange
    const groceries = createCategory({ name: "Groceries" });
    const rent = createCategory({ name: "Rent" });
    const trendPresets = [
      createTrendPreset({
        periodUnit: "WEEK",
        lookback: 3,
        categoryIds: [groceries.id, rent.id],
      }),
      createTrendPreset({ periodUnit: "WEEK", lookback: 3 }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, {
      props: { trendPresets, categories: [groceries, rent] },
    });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "all in last 3 weeks in EUR",
      "Groceries, Rent in last 3 weeks in EUR",
    ]);
  });

  it("orders more categories before fewer categories", () => {
    // Arrange
    const alpha = createCategory({ name: "Alpha" });
    const beta = createCategory({ name: "Beta" });
    const sigma = createCategory({ name: "Sigma" });
    const tau = createCategory({ name: "Tau" });
    const upsilon = createCategory({ name: "Upsilon" });
    const trendPresets = [
      createTrendPreset({ periodUnit: "MONTH", lookback: 3, categoryIds: [alpha.id, beta.id] }),
      createTrendPreset({
        periodUnit: "MONTH",
        lookback: 3,
        categoryIds: [sigma.id, tau.id, upsilon.id],
      }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, {
      props: { trendPresets, categories: [alpha, beta, sigma, tau, upsilon] },
    });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "Sigma, Tau, Upsilon in last 3 months in EUR",
      "Alpha, Beta in last 3 months in EUR",
    ]);
  });

  it("orders categories alphabetically", () => {
    // Arrange
    const groceries = createCategory({ name: "Groceries" });
    const transport = createCategory({ name: "Transport" });
    const trendPresets = [
      createTrendPreset({ periodUnit: "WEEK", lookback: 3, categoryIds: [transport.id] }),
      createTrendPreset({ periodUnit: "WEEK", lookback: 3, categoryIds: [groceries.id] }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, {
      props: { trendPresets, categories: [groceries, transport] },
    });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "Groceries in last 3 weeks in EUR",
      "Transport in last 3 weeks in EUR",
    ]);
  });

  it("orders currencies alphabetically", () => {
    // Arrange
    const trendPresets = [
      createTrendPreset({ periodUnit: "MONTH", lookback: 3, currency: "USD" }),
      createTrendPreset({ periodUnit: "MONTH", lookback: 3, currency: "EUR" }),
    ];

    // Act
    const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

    // Assert
    expect(wrapper.findAll(".v-chip").map((chip) => chip.text())).toEqual([
      "all in last 3 months in EUR",
      "all in last 3 months in USD",
    ]);
  });

  describe("period-phrase background color", () => {
    // Happy path

    // Looks up the chip containing chipText, then its period-phrase style within it.
    // Independent of render/sort order.
    function getPeriodPhraseStyleInChip(
      wrapper: ReturnType<typeof mount>,
      chipText: string,
    ): string {
      const chip = wrapper.findAll(".v-chip").find((element) => element.text().includes(chipText));
      if (!chip) {
        throw new Error(`No chip containing text "${chipText}"`);
      }

      const span = chip.find(".period-phrase");
      if (!span.exists()) {
        throw new Error(`No period-phrase span in chip containing "${chipText}"`);
      }

      return span.attributes("style") ?? "";
    }

    function getTintPercent(style: string): number {
      const match = style.match(/(\d+(?:\.\d+)?)%/);
      return match ? Number(match[1]) : NaN;
    }

    it("gives week and month entries different hues", () => {
      // Arrange
      const trendPresets = [
        createTrendPreset({ periodUnit: "WEEK", lookback: 3 }),
        createTrendPreset({ periodUnit: "MONTH", lookback: 3 }),
      ];

      // Act
      const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

      // Assert
      const weekStyle = getPeriodPhraseStyleInChip(wrapper, "3 weeks");
      const monthStyle = getPeriodPhraseStyleInChip(wrapper, "3 months");
      expect(weekStyle).not.toEqual(monthStyle);
    });

    it("renders stronger tint for longer lookback within same hue", () => {
      // Arrange
      const trendPresets = [
        createTrendPreset({ periodUnit: "WEEK", lookback: 3 }),
        createTrendPreset({ periodUnit: "WEEK", lookback: 6 }),
        createTrendPreset({ periodUnit: "WEEK", lookback: 12 }),
      ];

      // Act
      const wrapper = mount(TrendPresetsList, { props: { trendPresets, categories: [] } });

      // Assert
      const shortTint = getTintPercent(getPeriodPhraseStyleInChip(wrapper, "3 weeks"));
      const midTint = getTintPercent(getPeriodPhraseStyleInChip(wrapper, "6 weeks"));
      const longTint = getTintPercent(getPeriodPhraseStyleInChip(wrapper, "12 weeks"));

      expect(shortTint).toBeLessThan(midTint);
      expect(midTint).toBeLessThan(longTint);
    });

    it("renders week entries with same lookback with same tint", () => {
      // Arrange
      const groceries = createCategory({ name: "Groceries" });
      const transport = createCategory({ name: "Transport" });
      const trendPresets = [
        createTrendPreset({ periodUnit: "WEEK", lookback: 5, categoryIds: [groceries.id] }),
        createTrendPreset({ periodUnit: "WEEK", lookback: 5, categoryIds: [transport.id] }),
      ];

      // Act
      const wrapper = mount(TrendPresetsList, {
        props: { trendPresets, categories: [groceries, transport] },
      });

      // Assert
      const groceriesStyle = getPeriodPhraseStyleInChip(wrapper, "Groceries");
      const transportStyle = getPeriodPhraseStyleInChip(wrapper, "Transport");

      expect(groceriesStyle).toEqual(transportStyle);
    });
  });

  describe("clicking preset", () => {
    // Happy path

    it("emits apply with clicked preset's selection", async () => {
      // Arrange
      const groceries = createCategory({ name: "Groceries" });
      const trendPreset = createTrendPreset({
        periodUnit: "WEEK",
        lookback: 6,
        currency: "USD",
        categoryIds: [groceries.id],
        includeUncategorized: true,
      });
      const wrapper = mount(TrendPresetsList, {
        props: { trendPresets: [trendPreset], categories: [groceries] },
      });

      // Act
      await wrapper.find(".v-chip").trigger("click");

      // Assert
      expect(wrapper.emitted("apply")).toEqual([
        [
          {
            periodUnit: "WEEK",
            lookback: 6,
            currency: "USD",
            categoryIds: [groceries.id],
            includeUncategorized: true,
          },
        ],
      ]);
    });
  });
});
