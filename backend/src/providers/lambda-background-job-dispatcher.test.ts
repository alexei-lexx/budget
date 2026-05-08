import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { describe, expect, it, vi, type Mock } from "vitest";
import { LambdaBackgroundJobDispatcher } from "./lambda-background-job-dispatcher";

vi.mock("@aws-sdk/client-lambda", async () => {
  const actual = await vi.importActual<typeof import("@aws-sdk/client-lambda")>(
    "@aws-sdk/client-lambda",
  );

  return {
    ...actual,
    LambdaClient: vi.fn(),
  };
});

describe("LambdaBackgroundJobDispatcher", () => {
  it("invokes Lambda function with Event invocation type", async () => {
    const mockSend = vi
      .fn<(command: unknown) => Promise<unknown>>()
      .mockResolvedValue({});

    (LambdaClient as Mock).mockImplementation(function () {
      return { send: mockSend };
    });

    const mockClient = new LambdaClient({});

    const dispatcher = new LambdaBackgroundJobDispatcher(
      "my-background-job-fn",
      mockClient,
    );

    await dispatcher.dispatch({
      type: "telegram-message",
      payload: {
        botId: "bot-1",
        chatId: 123,
        text: "hello",
        userId: "user-1",
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);

    const command = mockSend.mock.calls[0][0] as InvokeCommand;
    expect(command.input.FunctionName).toBe("my-background-job-fn");
    expect(command.input.InvocationType).toBe("Event");

    const payload = JSON.parse(
      Buffer.from(command.input.Payload as Uint8Array).toString("utf-8"),
    );

    expect(payload).toEqual({
      type: "telegram-message",
      payload: {
        botId: "bot-1",
        chatId: 123,
        text: "hello",
        userId: "user-1",
      },
    });
  });

  it("throws when function name is not set", () => {
    expect(() => new LambdaBackgroundJobDispatcher()).toThrow(
      "BACKGROUND_JOB_FUNCTION_NAME environment variable is required",
    );
  });
});
