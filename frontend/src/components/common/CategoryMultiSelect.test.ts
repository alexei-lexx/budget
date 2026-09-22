import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { VSelect } from "vuetify/components";
import type { Category } from "@/__generated__/vue-apollo";
import CategoryMultiSelect from "./CategoryMultiSelect.vue";

function createCategory(overrides: Partial<Category> & Pick<Category, "name">): Category {
  return {
    id: crypto.randomUUID(),
    excludeFromReports: false,
    type: "EXPENSE",
    ...overrides,
  };
}

describe("CategoryMultiSelect", () => {
  // Happy path

  it("renders Uncategorized as first item followed by divider", () => {
    // Arrange
    const groceries = createCategory({ name: "Groceries" });

    // Act
    const wrapper = mount(CategoryMultiSelect, {
      props: {
        categories: [groceries],
        label: "Categories",
        categoryIds: [],
        includeUncategorized: false,
      },
    });

    // Assert
    const items = wrapper.findComponent(VSelect).props("items");
    expect(items?.length).toEqual(3);
    expect(items?.[0]).toMatchObject({ name: "Uncategorized" });
    expect(items?.[1]).toMatchObject({ type: "divider" });
    expect(items?.[2]).toMatchObject({ name: "Groceries" });
  });

  it("updates includeUncategorized without changing categoryIds", async () => {
    // Arrange
    const groceries = createCategory({ name: "Groceries" });
    const wrapper = mount(CategoryMultiSelect, {
      props: {
        categories: [groceries],
        label: "Categories",
        categoryIds: [],
        includeUncategorized: false,
      },
    });
    const vSelect = wrapper.findComponent(VSelect);
    const uncategorizedId = vSelect.props("items")?.[0].id;

    // Act
    vSelect.vm.$emit("update:modelValue", [uncategorizedId]);

    // Assert
    expect(wrapper.emitted("update:includeUncategorized")).toEqual([[true]]);
    expect(wrapper.emitted("update:categoryIds")).toBeUndefined();
  });

  it("updates categoryIds without changing includeUncategorized", async () => {
    // Arrange
    const groceries = createCategory({ name: "Groceries" });
    const wrapper = mount(CategoryMultiSelect, {
      props: {
        categories: [groceries],
        label: "Categories",
        categoryIds: [],
        includeUncategorized: false,
      },
    });

    // Act
    wrapper.findComponent(VSelect).vm.$emit("update:modelValue", [groceries.id]);

    // Assert
    expect(wrapper.emitted("update:categoryIds")).toEqual([[[groceries.id]]]);
    expect(wrapper.emitted("update:includeUncategorized")).toBeUndefined();
  });
});
