import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { mount } from "@vue/test-utils";
import AgenticInput from "./AgenticInput.vue";

vi.mock("@/composables/useUserSettings", () => ({
  useUserSettings: () => ({ settings: ref(null) }),
}));

vi.mock("@/composables/useVoiceInput", () => ({
  useVoiceInput: () => ({
    isSupported: ref(false),
    isRecording: ref(false),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));

describe("AgenticInput", () => {
  // Happy path

  it("forwards abort emit when stop button is clicked", async () => {
    // Arrange
    const wrapper = mount(AgenticInput, {
      props: { modelValue: "test", loading: true, agentTrace: [] },
    });

    // Act
    await wrapper.find('button[aria-label="Stop"]').trigger("click");

    // Assert
    expect(wrapper.emitted("abort")).toBeTruthy();
  });
});
