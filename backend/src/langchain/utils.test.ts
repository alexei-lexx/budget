import { describe, expect, it } from "@jest/globals";
import { AIMessage, BaseMessage } from "langchain";
import { extractLastMessageText } from "./utils";

describe("extractLastMessageText", () => {
  it("should return undefined when messages array is empty", () => {
    const result = extractLastMessageText([]);

    expect(result).toBeUndefined();
  });

  it("should return string content of last message", () => {
    const messages: BaseMessage[] = [
      new AIMessage({ content: "First" }),
      new AIMessage({ content: "Last" }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBe("Last");
  });

  it("should return last text block from array content", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          { type: "text", text: "First block" },
          { type: "text", text: "Last block" },
        ],
      }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBe("Last block");
  });

  it("should return empty string when last message has empty string content", () => {
    const messages: BaseMessage[] = [new AIMessage({ content: "" })];

    const result = extractLastMessageText(messages);

    expect(result).toBe("");
  });

  it("should return undefined when array content has no text blocks", () => {
    const messages: BaseMessage[] = [
      new AIMessage({
        content: [
          { type: "image_url", image_url: { url: "http://example.com" } },
        ],
      }),
    ];

    const result = extractLastMessageText(messages);

    expect(result).toBeUndefined();
  });
});
