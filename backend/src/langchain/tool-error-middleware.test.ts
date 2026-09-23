import { faker } from "@faker-js/faker";
import { ToolMessage } from "@langchain/core/messages";
import { ToolCallRequest } from "langchain";
import { describe, expect, it, vi } from "vitest";
import { ModelError } from "../models/model-error";
import { BusinessError } from "../services/business-error";
import { InvalidDateStringError } from "../types/date-string";
import { InvalidDateTimeStringError } from "../types/date-time-string";
import { toolUserFacingErrorMiddleware } from "./tool-error-middleware";

const { wrapToolCall } = toolUserFacingErrorMiddleware;
if (!wrapToolCall) {
  throw new Error("toolErrorMiddleware must define wrapToolCall");
}

describe("toolUserFacingErrorMiddleware", () => {
  // Happy path

  it("returns result unchanged when tool succeeds", async () => {
    // Arrange
    const toolMessage = new ToolMessage({
      content: "tool-content-1",
      tool_call_id: "tool-call-1",
    });
    const toolHandler = vi.fn().mockResolvedValue(toolMessage);
    const request = {
      toolCall: { name: "tool-name-1", id: "tool-call-1", args: {} },
    } as ToolCallRequest;

    // Act
    const result = await wrapToolCall(request, toolHandler);

    // Assert
    expect(result).toBe(toolMessage);
  });

  // Dependency failures

  it("returns original message when tool throws user-facing error", async () => {
    // Arrange
    // Randomly picks among error types considered user-facing
    const error = faker.helpers.arrayElement([
      new BusinessError("Something went wrong"),
      new ModelError("Something went wrong"),
      new InvalidDateStringError("Something went wrong"),
      new InvalidDateTimeStringError("Something went wrong"),
    ]);
    const handler = vi.fn().mockRejectedValue(error);
    const request = {
      toolCall: { name: "tool-name-1", id: "tool-call-1", args: {} },
    } as ToolCallRequest;

    // Act
    const result = await wrapToolCall(request, handler);

    // Assert
    expect(result).toMatchObject({
      content: expect.stringContaining("Something went wrong"),
      name: "tool-name-1",
      status: "error",
      tool_call_id: "tool-call-1",
    });
  });

  it("returns generic message when tool throws non-user-facing error", async () => {
    // Arrange
    const handler = vi.fn().mockRejectedValue(new Error("Database timeout"));
    const request = {
      toolCall: { name: "tool-name-1", id: "tool-call-1", args: {} },
    } as ToolCallRequest;

    // Act
    const result = await wrapToolCall(request, handler);

    // Assert
    expect(result).toMatchObject({
      content: "Tool 'tool-name-1' failed unexpectedly.",
      name: "tool-name-1",
      status: "error",
      tool_call_id: "tool-call-1",
    });
  });
});
