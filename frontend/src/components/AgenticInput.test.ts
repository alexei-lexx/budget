import { beforeEach, describe, it, expect, vi } from "vitest";
import { ref, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import AgenticInput from "./AgenticInput.vue";

let capturedOnTranscript: ((transcript: string) => void) | undefined;

vi.mock("@/composables/useUserSettings", () => ({
  useUserSettings: () => ({ settings: ref(null) }),
}));

vi.mock("@/composables/useVoiceInput", () => ({
  useVoiceInput: (options: { onTranscript: (transcript: string) => void }) => {
    capturedOnTranscript = options.onTranscript;
    return {
      isSupported: ref(false),
      isRecording: ref(false),
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
    };
  },
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

  describe("submit event", () => {
    let wrapper: ReturnType<typeof mount>;
    let submitButton: ReturnType<typeof wrapper.find>;

    beforeEach(() => {
      capturedOnTranscript = undefined;

      wrapper = mount(AgenticInput, {
        props: {
          modelValue: "hello",
          loading: false,
          agentTrace: [],
          submitAriaLabel: "Submit",
        },
      });

      submitButton = wrapper.find('button[aria-label="Submit"]');
    });

    // Happy path

    it("emits submit(false) without prior voice input", async () => {
      // Act & Assert
      await submitButton.trigger("click");
      expect(wrapper.emitted("submit")).toEqual([[false]]);
    });

    describe("when voice transcript was received", () => {
      beforeEach(async () => {
        // Voice transcript populates input
        capturedOnTranscript!("hello");

        await nextTick();
      });

      it("emits submit(true) when text not edited", async () => {
        const countBefore = wrapper.emitted("submit")?.length ?? 0;

        // Act
        await submitButton.trigger("click");

        // Assert
        const submits = wrapper.emitted("submit");
        expect(submits).toHaveLength(countBefore + 1);
        expect(submits?.[submits.length - 1]).toEqual([true]);
      });

      it("emits submit(false) when text edited after voice input", async () => {
        // Arrange
        // User edits after voice input
        await wrapper.find("textarea").setValue("hello edited");
        const countBefore = wrapper.emitted("submit")?.length ?? 0;

        // Act
        await submitButton.trigger("click");

        // Assert
        const submits = wrapper.emitted("submit");
        expect(submits).toHaveLength(countBefore + 1);
        expect(submits?.[submits.length - 1]).toEqual([false]);
      });

      it("emits submit(false) after previous submission", async () => {
        // Arrange
        // First submit clears voice flag
        await submitButton.trigger("click");
        const countBefore = wrapper.emitted("submit")?.length ?? 0;

        // Act
        await submitButton.trigger("click");

        // Assert
        const submits = wrapper.emitted("submit");
        expect(submits).toHaveLength(countBefore + 1);
        expect(submits?.[submits.length - 1]).toEqual([false]);
      });
    });
  });
});
