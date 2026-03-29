import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { LambdaBackgroundJobDispatcher } from "./lambda-background-job-dispatcher";

describe("LambdaBackgroundJobDispatcher", () => {
  it("should invoke the Lambda function with Event invocation type", async () => {
    const mockSend = jest.fn().mockResolvedValue({});
    const mockClient = { send: mockSend } as unknown as LambdaClient;

    const dispatcher = new LambdaBackgroundJobDispatcher(
      "my-background-job-fn",
      mockClient,
    );

    await dispatcher.dispatch({
      type: "telegram-message",
      payload: {
        chatId: 123,
        text: "hello",
        userId: "user-1",
      },
    });

    expect(mockSend).toHaveBeenCalledTimes(1);

    const [command] = mockSend.mock.calls[0] as [InvokeCommand];
    expect(command.input.FunctionName).toBe("my-background-job-fn");
    expect(command.input.InvocationType).toBe("Event");

    const payload = JSON.parse(
      Buffer.from(command.input.Payload as Uint8Array).toString("utf-8"),
    );

    expect(payload).toEqual({
      type: "telegram-message",
      payload: {
        chatId: 123,
        text: "hello",
        userId: "user-1",
      },
    });
  });

  it("should throw when function name is not set", () => {
    expect(() => new LambdaBackgroundJobDispatcher()).toThrow(
      "BACKGROUND_JOB_FUNCTION_NAME environment variable is required",
    );
  });
});
