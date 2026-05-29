import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TextboxButtonInput from "./TextboxButtonInput.vue";

describe("TextboxButtonInput", () => {
  // Happy path

  it("renders stop button when loading is true", () => {
    // Arrange
    const wrapper = mount(TextboxButtonInput, {
      props: { modelValue: "test", loading: true },
    });

    // Assert
    expect(wrapper.find('button[aria-label="Send"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Stop"]').exists()).toBe(true);
  });

  it("renders send button when loading is false", () => {
    // Arrange
    const wrapper = mount(TextboxButtonInput, {
      props: { modelValue: "test", loading: false, submitAriaLabel: "Send" },
    });

    // Assert
    expect(wrapper.find('button[aria-label="Send"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Stop"]').exists()).toBe(false);
  });

  it("emits abort when stop button is clicked", async () => {
    // Arrange
    const wrapper = mount(TextboxButtonInput, {
      props: { modelValue: "test", loading: true },
    });

    // Act
    await wrapper.find('button[aria-label="Stop"]').trigger("click");

    // Assert
    expect(wrapper.emitted("abort")).toBeTruthy();
  });
});
